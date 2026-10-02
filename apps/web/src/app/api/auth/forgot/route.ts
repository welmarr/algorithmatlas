import { databaseReady, findUserByEmail } from "@sim/persistence";
import { after } from "next/server";
import { normalizeEmail } from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
  sendAccountLink,
} from "../../../../lib/account-service";
import { logSecurityEvent } from "../../../../lib/observability";
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
    await accountQuota("forgot", email, 3, 3600);
    const user = await findUserByEmail(email);
    after(async () => {
      if (!user) return;
      try {
        await sendAccountLink(user, "reset");
      } catch {
        logSecurityEvent("password-reset-email", "rejected");
      }
    });
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 750 - (Date.now() - started))),
    );
    return accountReply(request, "/account/forgot?notice=sent", {
      ok: true,
      message:
        "If an account matches that email, a password reset link has been sent.",
    });
  } catch (error) {
    return accountFailure(request, error, "/account/forgot");
  }
}
