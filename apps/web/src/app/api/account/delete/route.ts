import { deleteAccount } from "@sim/operations";
import { databaseReady, findUserByEmail } from "@sim/persistence";
import {
  currentUser,
  verifyPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/auth";
import {
  accountForm,
  accountQuota,
  accountReply,
  accountFailure,
  AuthError,
} from "../../../../lib/account-service";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    const session = await currentUser();
    if (!session) throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    await accountQuota(request, "delete", session.id, 3, 900);
    const password = form.get("password");
    const user = await findUserByEmail(session.email);
    if (
      form.get("confirmation") !== "DELETE" ||
      typeof password !== "string" ||
      password.length > 128 ||
      !user ||
      !(await verifyPassword(password, user.passwordHash))
    )
      throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    if (!(await deleteAccount(user.id, user.passwordHash)))
      throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    const response = accountReply(request, "/account?notice=deleted", {
      ok: true,
    });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return accountFailure(request, error, "/account/settings");
  }
}
