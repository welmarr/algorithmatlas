import { consumeAccountToken, databaseReady } from "@sim/persistence";
import {
  hashPassword,
  tokenHash,
  validatePassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
} from "../../../../lib/account-service";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    const token = form.get("token");
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AuthError("AUTH_TOKEN_INVALID");
    await accountQuota(request, "reset", tokenHash(token), 5, 900);
    let password: string;
    try {
      password = validatePassword(form.get("password"));
    } catch {
      throw new AuthError("AUTH_INVALID_INPUT");
    }
    if (password !== form.get("confirmPassword"))
      throw new AuthError("AUTH_INVALID_INPUT");
    if (
      !(await consumeAccountToken(
        tokenHash(token),
        "reset",
        await hashPassword(password),
      ))
    )
      throw new AuthError("AUTH_TOKEN_INVALID");
    const response = accountReply(request, "/account?notice=password-reset", {
      ok: true,
    });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return accountFailure(request, error);
  }
}
