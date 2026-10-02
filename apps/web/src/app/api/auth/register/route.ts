import { databaseReady } from "@sim/persistence";
import {
  hashPassword,
  newSession,
  normalizeEmail,
  SESSION_COOKIE,
  sessionCookieOptions,
  validatePassword,
} from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
  emailConfigured,
  safeReturn,
} from "../../../../lib/account-service";
import { EmailStore } from "@sim/operations";
import { logSecurityEvent } from "../../../../lib/observability";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    if (!emailConfigured()) throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
    let email: string, password: string;
    try {
      email = normalizeEmail(form.get("email"));
      password = validatePassword(form.get("password"));
    } catch {
      throw new AuthError("AUTH_INVALID_INPUT");
    }
    if (password !== form.get("confirmPassword"))
      throw new AuthError("AUTH_INVALID_INPUT");
    const name = form.get("name")?.trim() || "Learner";
    if (name.length > 64) throw new AuthError("AUTH_INVALID_INPUT");
    await accountQuota(request, "register", email);
    const user = await new EmailStore().register(
      email,
      name,
      await hashPassword(password),
    );
    const token = await newSession(user.id, user.passwordHash);
    const response = accountReply(
      request,
      "/account?notice=verification-sent&returnTo=" +
        encodeURIComponent(safeReturn(form.get("returnTo"))),
      { ok: true, emailVerified: false },
      201,
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    logSecurityEvent("register", "accepted");
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "SIGNUP_DISABLED")
      return accountFailure(
        request,
        new AuthError("AUTH_STORAGE_UNAVAILABLE", 503),
      );
    logSecurityEvent("register", "rejected");
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      return accountFailure(request, new AuthError("AUTH_ACCOUNT_EXISTS", 409));
    return accountFailure(request, error);
  }
}
