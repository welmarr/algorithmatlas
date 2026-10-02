import { createHash, randomUUID, scryptSync } from "node:crypto";
import { expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  createUser,
  createSession,
  databasePool,
  findSessionUser,
  findUserByEmail,
  issueAccountToken,
  consumeAccountToken,
} from "@sim/persistence";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
it("uses salted memory-hard passwords, legacy verification, and rejects invalid inputs", async () => {
  expect(() => validatePassword("short")).toThrow();
  expect(() => validatePassword("a".repeat(129))).toThrow();
  const password = "long local test password";
  const first = await hashPassword(password),
    second = await hashPassword(password);
  expect(first).not.toBe(second);
  expect(first).toMatch(/^scrypt-v2\$/);
  expect(await verifyPassword(password, first)).toBe(true);
  expect(await verifyPassword("wrong", first)).toBe(false);
  expect(await verifyPassword(password, undefined)).toBe(false);
  const salt = "a".repeat(32);
  expect(
    await verifyPassword(
      password,
      `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`,
    ),
  ).toBe(true);
}, 15000);
const dbIt = process.env.DB_TEST_URL ? it : it.skip;
dbIt(
  "atomically consumes expiring links and resets revoke every session, including stale sign-in",
  async () => {
    process.env.DATABASE_URL = process.env.DB_TEST_URL;
    const user = await createUser(
      `auth-${randomUUID()}@example.test`,
      "Test",
      "old-hash",
    );
    const token = () => hash(randomUUID());
    const future = () => new Date(Date.now() + 60000);
    try {
      const expired = token();
      await issueAccountToken(
        user.id,
        "verify",
        expired,
        new Date(Date.now() - 1000),
      );
      expect(await consumeAccountToken(expired, "verify")).toBe(false);
      const replaced = token(),
        active = token();
      await issueAccountToken(user.id, "verify", replaced, future());
      await issueAccountToken(user.id, "verify", active, future());
      expect(await consumeAccountToken(replaced, "verify")).toBe(false);
      expect(await consumeAccountToken(active, "reset", "x")).toBe(false);
      expect(
        (
          await Promise.all([
            consumeAccountToken(active, "verify"),
            consumeAccountToken(active, "verify"),
          ])
        ).sort(),
      ).toEqual([false, true]);
      expect((await findUserByEmail(user.email))?.emailVerified).toBe(true);
      const sessions = [token(), token()];
      for (const session of sessions)
        await createSession(user.id, session, future(), "old-hash");
      const reset = token();
      await issueAccountToken(user.id, "reset", reset, future());
      expect(await consumeAccountToken(reset, "reset", "new-hash")).toBe(true);
      expect(await consumeAccountToken(reset, "reset", "other-hash")).toBe(
        false,
      );
      for (const session of sessions)
        expect(await findSessionUser(session)).toBeNull();
      await expect(
        createSession(user.id, token(), future(), "old-hash"),
      ).rejects.toThrow();
      const expiredReset = token();
      await issueAccountToken(
        user.id,
        "reset",
        expiredReset,
        new Date(Date.now() - 1000),
      );
      expect(await consumeAccountToken(expiredReset, "reset", "other")).toBe(
        false,
      );
      expect((await findUserByEmail(user.email))?.passwordHash).toBe(
        "new-hash",
      );
    } finally {
      await databasePool().query("DELETE FROM users WHERE id=$1", [user.id]);
    }
  },
  15000,
);
