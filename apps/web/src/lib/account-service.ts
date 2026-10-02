import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  consumeRateLimit,
  issueAccountToken,
  type StoredUser,
  type AccountTokenPurpose,
} from "@sim/persistence";
import { assertSameOrigin, readBoundedBody, readForm, tokenHash } from "./auth";

export type AuthCode =
  | "AUTH_INVALID_INPUT"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_ACCOUNT_EXISTS"
  | "AUTH_EMAIL_UNVERIFIED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_RATE_LIMITED"
  | "AUTH_ORIGIN_REJECTED"
  | "AUTH_STORAGE_UNAVAILABLE"
  | "AUTH_EMAIL_UNAVAILABLE"
  | "AUTH_INTERNAL_ERROR";
export class AuthError extends Error {
  constructor(
    public readonly code: AuthCode,
    public readonly status = 400,
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
  AUTH_TOKEN_INVALID:
    "This link is invalid, expired or already used. Request a new link.",
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
  return accountReply(
    request,
    `${returnTo}?error=${known.code}`,
    { code: known.code, error: authMessages[known.code] },
    known.status,
  );
}
export async function accountQuota(
  action: string,
  email: string,
  limit = 3,
  seconds = 3600,
): Promise<void> {
  if (
    !(await consumeRateLimit(`${action}-global`, "all", 100, 3600)) ||
    !(await consumeRateLimit(action, email, limit, seconds))
  )
    throw new AuthError("AUTH_RATE_LIMITED", 429);
}
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.APP_URL);
}
export async function sendAccountLink(
  user: StoredUser,
  purpose: AccountTokenPurpose,
): Promise<void> {
  if (!emailConfigured()) throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
  const app = new URL(process.env.APP_URL!);
  if (
    !["http:", "https:"].includes(app.protocol) ||
    app.username ||
    app.password ||
    (process.env.NODE_ENV === "production" &&
      app.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(app.hostname))
  )
    throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
  const token = randomBytes(32).toString("base64url");
  await issueAccountToken(
    user.id,
    purpose,
    tokenHash(token),
    new Date(Date.now() + (purpose === "verify" ? 86400 : 1800) * 1000),
  );
  const url = new URL(
    purpose === "verify" ? "/account/verify" : "/account/reset",
    app.origin,
  );
  url.hash = new URLSearchParams({ token }).toString();
  const local = process.env.EMAIL_TRANSPORT === "mailpit";
  if (
    local &&
    !["localhost", "127.0.0.1", "mailpit"].includes(process.env.SMTP_HOST!)
  )
    throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? (local ? 1025 : 587)),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: !local,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  try {
    await transport.sendMail({
      from:
        process.env.EMAIL_FROM ??
        "Algorithm Atlas <accounts@algorithmatlas.test>",
      to: user.email,
      subject:
        purpose === "verify"
          ? "Verify your Algorithm Atlas email"
          : "Reset your Algorithm Atlas password",
      text: `${purpose === "verify" ? "Verify your email to save your work. This link expires in 24 hours." : "Reset your password. This link expires in 30 minutes. All existing sessions will be signed out."}\n\n${url.toString()}\n\nIf you did not request this, ignore this email.`,
    });
  } catch {
    throw new AuthError("AUTH_EMAIL_UNAVAILABLE", 503);
  } finally {
    transport.close();
  }
}
