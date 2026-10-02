import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requestContext } from "@sim/operations";
import {
  createSession,
  databaseConfigured,
  findSessionUser,
  type StoredUser,
} from "@sim/persistence";

export const SESSION_COOKIE = "sim_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a valid email address");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address");
  return email;
}

export {
  hashPassword,
  verifyPassword,
  validatePassword,
} from "@sim/persistence";

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function newSession(
  userId: string,
  expectedPasswordHash?: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await createSession(
    userId,
    tokenHash(token),
    new Date(Date.now() + SESSION_SECONDS * 1000),
    expectedPasswordHash,
  );
  return token;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export async function currentUser(): Promise<Omit<
  StoredUser,
  "passwordHash"
> | null> {
  if (!databaseConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return findSessionUser(tokenHash(token));
}

export function assertSameOrigin(request: Request): void {
  requestContext(request, process.env, { mutate: true });
}

export function formRedirect(request: Request, path: string): URL {
  assertSameOrigin(request);
  return new URL(path, request.headers.get("origin")!);
}

export async function readBoundedBody(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is required");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Request body is too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readForm(request: Request): Promise<URLSearchParams> {
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  ) {
    throw new Error("Expected a form submission");
  }
  return new URLSearchParams(await readBoundedBody(request));
}
