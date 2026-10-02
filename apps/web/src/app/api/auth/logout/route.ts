import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, deleteSession } from "@sim/persistence";
import {
  assertSameOrigin,
  formRedirect,
  SESSION_COOKIE,
  sessionCookieOptions,
  tokenHash,
} from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (databaseConfigured() && token && /^[A-Za-z0-9_-]{43}$/.test(token))
      await deleteSession(tokenHash(token));
    const response = NextResponse.redirect(formRedirect(request, "/"), 303);
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch {
    return new Response("Logout unavailable", { status: 400 });
  }
}
