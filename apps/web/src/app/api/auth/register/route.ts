import { NextResponse, type NextRequest } from "next/server";
import {
  consumeRateLimit,
  createUser,
  databaseConfigured,
} from "@sim/persistence";
import {
  assertSameOrigin,
  formRedirect,
  hashPassword,
  newSession,
  normalizeEmail,
  readForm,
  SESSION_COOKIE,
  sessionCookieOptions,
  validatePassword,
} from "../../../../lib/auth";
import { logSecurityEvent } from "../../../../lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!databaseConfigured())
    return new Response("Account storage is not configured", { status: 503 });
  try {
    assertSameOrigin(request);
  } catch {
    logSecurityEvent("register", "rejected");
    return new Response("Origin rejected", { status: 403 });
  }
  try {
    const form = await readForm(request);
    const email = normalizeEmail(form.get("email"));
    if (
      !(await consumeRateLimit("register-global", "all", 50, 3600)) ||
      !(await consumeRateLimit("register-email", email, 3, 3600))
    ) {
      logSecurityEvent("register", "rate_limited");
      return new Response("Too many account attempts. Try again later.", {
        status: 429,
      });
    }
    const password = validatePassword(form.get("password"));
    const name = form.get("name")?.trim();
    if (!name || name.length > 64)
      throw new Error("Enter a display name up to 64 characters");
    const user = await createUser(email, name, await hashPassword(password));
    const token = await newSession(user.id);
    const response = NextResponse.redirect(
      formRedirect(request, "/dashboard"),
      303,
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    logSecurityEvent("register", "accepted");
    return response;
  } catch (error) {
    logSecurityEvent("register", "rejected");
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.redirect(
        formRedirect(request, "/account?error=account-exists"),
        303,
      );
    }
    return NextResponse.redirect(
      formRedirect(request, "/account?error=registration"),
      303,
    );
  }
}
