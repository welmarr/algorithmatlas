import { NextResponse } from "next/server";
import {
  EmailStore,
  emailReadyConfig,
  requestContext,
  opaqueHash,
  secret,
} from "@sim/operations";
import {
  consumeRateLimit,
  type StoredUser,
  type AccountTokenPurpose,
} from "@sim/persistence";
import { assertSameOrigin, readBoundedBody, readForm } from "./auth";

export type AuthCode =
  | "AUTH_INVALID_INPUT"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_ACCOUNT_EXISTS"
  | "AUTH_EMAIL_UNVERIFIED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_ALREADY_USED"
  | "AUTH_RATE_LIMITED"
  | "AUTH_ORIGIN_REJECTED"
  | "AUTH_STORAGE_UNAVAILABLE"
  | "AUTH_EMAIL_UNAVAILABLE"
  | "AUTH_INTERNAL_ERROR";
export class AuthError extends Error {
  constructor(
    public readonly code: AuthCode,
    public readonly status = 400,
    public readonly retryAfter = 60,
  ) {
    super(code);
  }
}
export const authMessages: Record<AuthCode, string> = {
  AUTH_INVALID_INPUT:
    "Check your email and password. Use 12–128 characters and matching password confirmation.",
  AUTH_INVALID_CREDENTIALS: "Email or password was not accepted.",
  AUTH_ACCOUNT_EXISTS:
    "An account already uses that email. Sign in or reset your password.",
  AUTH_EMAIL_UNVERIFIED: "Verify your email before saving your work.",
  AUTH_TOKEN_INVALID: "This link could not be verified. Request a new link.",
  AUTH_TOKEN_EXPIRED:
    "This link has expired. Request a new verification email.",
  AUTH_TOKEN_ALREADY_USED:
    "This link was already used. Sign in or request a new link.",
  AUTH_RATE_LIMITED: "Too many attempts. Please try again later.",
  AUTH_ORIGIN_REJECTED:
    "This request could not be verified. Return to the account page.",
  AUTH_STORAGE_UNAVAILABLE:
    "Accounts are temporarily unavailable. You can continue learning.",
  AUTH_EMAIL_UNAVAILABLE:
    "We could not send the email. Please request another link shortly.",
  AUTH_INTERNAL_ERROR: "The request could not be completed. Please try again.",
};
export async function accountForm(request: Request): Promise<URLSearchParams> {
  try {
    assertSameOrigin(request);
  } catch {
    throw new AuthError("AUTH_ORIGIN_REJECTED", 403);
  }
  try {
    if (request.headers.get("content-type")?.startsWith("application/json")) {
      const body = JSON.parse(await readBoundedBody(request));
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("invalid body");
      return new URLSearchParams(
        Object.entries(body).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
    return await readForm(request);
  } catch {
    throw new AuthError("AUTH_INVALID_INPUT");
  }
}
export function safeReturn(value: unknown): string {
  return typeof value === "string" &&
    /^\/(?:problems\/[a-z0-9-]+|own-code|lab(?:\/compare)?)(?:\?saved=[a-f0-9-]{36})?$/.test(
      value,
    )
    ? value
    : "/dashboard";
}
export function accountReply(
  request: Request,
  path: string,
  data: Record<string, unknown>,
  status = 200,
) {
  if (
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("content-type")?.startsWith("application/json")
  )
    return NextResponse.json(data, { status });
  // Form paths are fixed locally; never redirect to user-supplied origins.
  return NextResponse.redirect(
    new URL(path, request.headers.get("origin") ?? request.url),
    303,
  );
}
export function accountFailure(
  request: Request,
  error: unknown,
  returnTo = "/account",
) {
  const known =
    error instanceof Error && error.message === "PASSWORD_CAPACITY"
      ? new AuthError("AUTH_RATE_LIMITED", 429)
      : error instanceof AuthError
        ? error
        : new AuthError("AUTH_INTERNAL_ERROR", 500);
  if (known.code === "AUTH_ORIGIN_REJECTED")
    return NextResponse.json(
      { code: known.code, error: authMessages[known.code] },
      { status: 403 },
    );
  const response = accountReply(
    request,
    `${returnTo}?error=${known.code}`,
    { code: known.code, error: authMessages[known.code] },
    known.status,
  );
  if (known.status === 429)
    response.headers.set("retry-after", String(known.retryAfter));
  return response;
}
export async function accountQuota(
  request: Request,
  action: string,
  email: string,
  limit = 3,
  seconds = 3600,
): Promise<void> {
  const ip = requestContext(request).ip;
  const privateIp = opaqueHash("ip:" + ip, secret("ABUSE_HASH_KEY"));
  if (
    !(await consumeRateLimit(
      action + "-ip",
      privateIp,
      action === "login" ? 50 : 30,
      3600,
    )) ||
    !(await consumeRateLimit(`${action}-global`, "all", 100, 3600)) ||
    !(await consumeRateLimit(action, email, limit, seconds))
  )
    throw new AuthError("AUTH_RATE_LIMITED", 429, seconds);
}
export function emailConfigured(): boolean {
  return emailReadyConfig();
}
export async function sendAccountLink(
  user: StoredUser,
  purpose: AccountTokenPurpose,
): Promise<void> {
  if (!emailConfigured()) throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
  await new EmailStore().enqueue(user, purpose);
}
