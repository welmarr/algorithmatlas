import { databaseReady, findUserByEmail } from "@sim/persistence";
import { normalizeEmail } from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
  emailConfigured,
  sendAccountLink,
} from "../../../../lib/account-service";
export async function POST(request: Request) {
  const started = Date.now();
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
    await accountQuota(request, "forgot", email, 3, 3600);
    if (!emailConfigured()) throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
    const user = await findUserByEmail(email);
    if (user) await sendAccountLink(user, "reset");
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 750 - (Date.now() - started))),
    );
    return accountReply(request, "/account/forgot-password?notice=sent", {
      ok: true,
      message:
        "If an account matches that email, a password reset link has been sent.",
    });
  } catch (error) {
    return accountFailure(request, error, "/account/forgot-password");
  }
}
