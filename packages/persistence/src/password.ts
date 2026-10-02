import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const settings = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let active = 0;
function derive(
  password: string,
  salt: string,
  legacy = false,
): Promise<Buffer> {
  if (active >= 2) return Promise.reject(new Error("PASSWORD_CAPACITY"));
  active++;
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, legacy ? {} : settings, (error, key) => {
      error ? reject(error) : resolve(key);
    });
  }).finally(() => {
    active--;
  });
}
export function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new Error("Password must be 12–128 characters");
  return value;
}
export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v2$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  const parts = stored?.split("$");
  const valid =
    parts?.length === 3 &&
    ["scrypt", "scrypt-v2"].includes(parts[0]) &&
    /^[a-f0-9]{32}$/.test(parts[1]) &&
    /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts![1] : "0".repeat(32);
  const actual = await derive(
    password,
    salt,
    Boolean(valid && parts![0] === "scrypt"),
  );
  const expected = valid ? Buffer.from(parts![2], "hex") : Buffer.alloc(64);
  return Boolean(valid && timingSafeEqual(actual, expected));
}
