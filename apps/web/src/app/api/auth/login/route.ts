import { databaseReady, findUserByEmail } from "@sim/persistence";
import {
  newSession,
  normalizeEmail,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountQuota,
  accountReply,
  AuthError,
  safeReturn,
} from "../../../../lib/account-service";
import { logSecurityEvent } from "../../../../lib/observability";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    let email: string;
    try {
      email = normalizeEmail(form.get("email"));
    } catch {
      throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    }
    await accountQuota(request, "login", email, 5, 900);
    const password = form.get("password");
    if (typeof password !== "string" || password.length > 128)
      throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    const user = await findUserByEmail(email);
    if (!(await verifyPassword(password, user?.passwordHash)))
      throw new AuthError("AUTH_INVALID_CREDENTIALS", 401);
    const token = await newSession(user!.id, user!.passwordHash);
    const response = accountReply(request, safeReturn(form.get("returnTo")), {
      ok: true,
      emailVerified: user!.emailVerified,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    logSecurityEvent("login", "accepted");
    return response;
  } catch (error) {
    logSecurityEvent("login", "rejected");
    return accountFailure(request, error);
  }
}
