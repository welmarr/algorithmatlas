import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, findUserByEmail } from "@sim/persistence";
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

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!databaseConfigured())
    return new Response("Account storage is not configured", { status: 503 });
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Origin rejected", { status: 403 });
  }
  try {
    const form = await readForm(request);
    const email = normalizeEmail(form.get("email"));
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
    return response;
  } catch {
    return NextResponse.redirect(
      formRedirect(request, "/account?error=credentials"),
      303,
    );
  }
}
