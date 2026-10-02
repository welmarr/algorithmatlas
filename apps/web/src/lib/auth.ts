import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import {
  createSession,
  findSessionUser,
  type StoredUser,
} from "@sim/persistence";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "sim_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a valid email address");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address");
  return email;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new Error("Password must be 12–128 characters");
  }
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  const parts = stored?.split("$");
  const valid =
    parts?.length === 3 &&
    parts[0] === "scrypt" &&
    /^[a-f0-9]{32}$/.test(parts[1]) &&
    /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts![1] : "0".repeat(32);
  const expected = valid ? Buffer.from(parts![2], "hex") : Buffer.alloc(64);
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return Boolean(valid && timingSafeEqual(actual, expected));
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function newSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await createSession(
    userId,
    tokenHash(token),
    new Date(Date.now() + SESSION_SECONDS * 1000),
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
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return findSessionUser(tokenHash(token));
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  if (
    !origin ||
    new URL(origin).host !== host ||
    new URL(origin).protocol !== `${protocol}:`
  )
    throw new Error("Cross-origin form submission rejected");
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
