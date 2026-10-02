import { NextResponse, type NextRequest } from "next/server";
import {
  consumeRateLimit,
  databaseConfigured,
  findUserByEmail,
} from "@sim/persistence";
import {
  assertSameOrigin,
  formRedirect,
  newSession,
  normalizeEmail,
  readForm,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/auth";
import { logSecurityEvent } from "../../../../lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!databaseConfigured())
    return new Response("Account storage is not configured", { status: 503 });
  try {
    assertSameOrigin(request);
  } catch {
    logSecurityEvent("login", "rejected");
    return new Response("Origin rejected", { status: 403 });
  }
  try {
    const form = await readForm(request);
    const email = normalizeEmail(form.get("email"));
    if (
      !(await consumeRateLimit("login-global", "all", 100, 60)) ||
      !(await consumeRateLimit("login-email", email, 5, 900))
    ) {
      logSecurityEvent("login", "rate_limited");
      return new Response("Too many sign-in attempts. Try again later.", {
        status: 429,
      });
    }
    const password = form.get("password");
    if (typeof password !== "string" || password.length > 128)
      throw new Error("Invalid credentials");
    const user = await findUserByEmail(email);
    if (!(await verifyPassword(password, user?.passwordHash)))
      throw new Error("Invalid credentials");
    const token = await newSession(user!.id);
    const response = NextResponse.redirect(
      formRedirect(request, "/dashboard"),
      303,
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    logSecurityEvent("login", "accepted");
    return response;
  } catch {
    logSecurityEvent("login", "rejected");
    return NextResponse.redirect(
      formRedirect(request, "/account?error=credentials"),
      303,
    );
  }
}
