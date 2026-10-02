import { databaseReady, findUserByEmail } from "@sim/persistence";
import { normalizeEmail } from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
  sendAccountLink,
} from "../../../../lib/account-service";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    let email: string;
    try {
      email = normalizeEmail(form.get("email"));
    } catch {
      throw new AuthError("AUTH_INVALID_INPUT");
    }
    await accountQuota("resend", email, 3, 3600);
    const user = await findUserByEmail(email);
    if (user && !user.emailVerified) await sendAccountLink(user, "verify");
    return accountReply(request, "/account?notice=verification-sent", {
      ok: true,
      message: "If verification is needed, a link has been sent.",
    });
  } catch (error) {
    return accountFailure(request, error);
  }
}
