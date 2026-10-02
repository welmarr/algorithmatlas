import { randomBytes, randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  EmailStore,
  EmailWorker,
  sealEmail,
  openEmail,
  smtpConfig,
  renderAccountEmail,
  setControl,
  inspectAccount,
  deleteAccount,
} from "@sim/operations";
import { testDatabase } from "./operations-helpers";
const key = randomBytes(32).toString("hex");
const config = {
  ...process.env,
  EMAIL_OUTBOX_KEY: key,
  APP_URL: "http://localhost:3000",
  EMAIL_TRANSPORT: "mailpit",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: process.env.SMTP_PORT ?? "1025",
};
describe("production email configuration", () => {
  it("requires TLS outside explicit local Mailpit and validates sender/auth", () => {
    expect(smtpConfig(config).options.ignoreTLS).toBe(true);
    const prod = {
      ...config,
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example.test",
      MAIL_FROM_ADDRESS: "accounts@example.test",
      SMTP_USERNAME: "mailer",
      SMTP_PASSWORD: "test",
    };
    expect(smtpConfig(prod).options.requireTLS).toBe(true);
    expect(() => smtpConfig({ ...prod, SMTP_STARTTLS: "false" })).toThrow(
      "SMTP_TLS_REQUIRED",
    );
    expect(() =>
      smtpConfig({ ...prod, NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
    ).toThrow("SMTP_TLS_REQUIRED");
    expect(() =>
      smtpConfig({ ...config, SMTP_HOST: "remote.example.test" }),
    ).toThrow();
  });
  it("authenticates encrypted payload context and provides HTML/text templates", () => {
    const row = { id: randomUUID(), user_id: randomUUID(), purpose: "verify" },
      url = "http://localhost:3000/account/verify#token=private";
    const sealed = sealEmail({ url }, row, key);
    expect(sealed).not.toContain("private");
    expect(openEmail(sealed, row, key).url).toBe(url);
    expect(() =>
      openEmail(sealed, { ...row, id: randomUUID() }, key),
    ).toThrow();
    expect(() =>
      openEmail(sealed, row, randomBytes(32).toString("hex")),
    ).toThrow();
    expect(renderAccountEmail("verify", url).html).toContain(
      "Verify your email",
    );
    expect(renderAccountEmail("reset", url).text).toContain("30 minutes");
  });
});
describe.skipIf(!process.env.DB_TEST_URL)(
  "durable email and account operations",
  () => {
    let db: Awaited<ReturnType<typeof testDatabase>>, store: EmailStore;
    beforeAll(async () => {
      db = await testDatabase("email");
      store = new EmailStore({ pool: db.pool, env: config });
    }, 30000);
    afterAll(async () => {
      await db?.close();
    });
    async function user() {
      return store.register(
        "mail-" + randomUUID() + "@example.test",
        "Test learner",
        "test-password-hash",
      );
    }
    async function clear() {
      await db.pool.query("DELETE FROM users");
    }
    async function row(id: string) {
      return (
        await db.pool.query("SELECT * FROM email_outbox WHERE id=$1", [id])
      ).rows[0];
    }
    it("commits signup/token/outbox atomically; replacement cancels old link and payload", async () => {
      await clear();
      const u = await user();
      const before = (
        await db.pool.query("SELECT * FROM email_outbox WHERE user_id=$1", [
          u.id,
        ])
      ).rows[0];
      const payload = openEmail(before.encrypted_payload, before, key);
      const token = new URLSearchParams(new URL(payload.url).hash.slice(1)).get(
        "token",
      )!;
      expect(before.encrypted_payload).not.toContain(token);
      expect(before.token_hash).toBe(
        createHash("sha256").update(token).digest("hex"),
      );
      const id = await store.enqueue(u, "verify");
      expect((await row(before.id)).status).toBe("cancelled");
      expect((await row(before.id)).encrypted_payload).toBeNull();
      expect((await row(id)).status).toBe("pending");
      expect(
        (
          await db.pool.query(
            "SELECT count(*)::int AS n FROM account_tokens WHERE user_id=$1 AND consumed_at IS NULL",
            [u.id],
          )
        ).rows[0].n,
      ).toBe(1);
      await setControl("signup_disabled", true, db.pool);
      await expect(user()).rejects.toThrow("SIGNUP_DISABLED");
      expect(
        (await db.pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n,
      ).toBe(1);
      await setControl("signup_disabled", false, db.pool);
    });
    it("claims once concurrently, reclaims expired leases and discards consumed tokens", async () => {
      await clear();
      await user();
      const claims = await Promise.all([store.claim(), store.claim()]);
      const claimed = claims.find(Boolean)!;
      expect(claims.filter(Boolean)).toHaveLength(1);
      await db.pool.query(
        "UPDATE email_outbox SET lease_until=now()-interval '1 second' WHERE id=$1",
        [claimed.id],
      );
      const recovered = await new EmailStore({
        pool: db.pool,
        env: config,
      }).claim();
      expect(recovered?.id).toBe(claimed.id);
      expect(recovered?.attempt_count).toBe(2);
      let calls = 0;
      await db.pool.query(
        "UPDATE account_tokens SET consumed_at=now() WHERE token_hash=$1",
        [claimed.token_hash],
      );
      expect(
        await store.deliver(recovered!, {
          async sendMail() {
            calls++;
          },
        }),
      ).toBe("cancelled");
      expect(calls).toBe(0);
      expect((await row(claimed.id)).encrypted_payload).toBeNull();
    });
    it("retries a real SMTP outage then a new worker delivers via Mailpit", async () => {
      if (!process.env.MAILPIT_API) throw new Error("MAILPIT_API required");
      await clear();
      const u = await user();
      const offline = new EmailWorker({
        store: new EmailStore({
          pool: db.pool,
          env: { ...config, SMTP_PORT: "1" },
        }),
      });
      await offline.tick();
      await offline.close();
      const failed = (
        await db.pool.query("SELECT * FROM email_outbox WHERE user_id=$1", [
          u.id,
        ])
      ).rows[0];
      expect(failed.status).toBe("retry");
      expect(failed.attempt_count).toBe(1);
      await db.pool.query(
        "UPDATE email_outbox SET available_at=now() WHERE id=$1",
        [failed.id],
      );
      const restarted = new EmailWorker({ store });
      await restarted.tick();
      await restarted.close();
      expect((await row(failed.id)).status).toBe("sent");
      expect((await row(failed.id)).encrypted_payload).toBeNull();
      const result = await fetch(
        process.env.MAILPIT_API +
          "/api/v1/search?query=" +
          encodeURIComponent("to:" + u.email),
      );
      const messages = await result.json();
      expect(messages.messages).toHaveLength(1);
      const detail = await (
        await fetch(
          process.env.MAILPIT_API +
            "/api/v1/message/" +
            messages.messages[0].ID,
        )
      ).json();
      expect(detail.HTML).toContain("Verify your email");
      expect(detail.Text).toContain("#token=");
      const again = new EmailWorker({ store });
      await again.tick();
      await again.close();
      expect((await row(failed.id)).attempt_count).toBe(2);
    }, 30000);
    it("bounds retry/dead-letter attempts and preserves stable message identity", async () => {
      await clear();
      await user();
      const ids: string[] = [];
      const failing = {
        async sendMail(message: Record<string, unknown>) {
          ids.push(String(message.messageId));
          throw new Error("fake transient failure contains no public log");
        },
      };
      for (let attempt = 1; attempt <= 5; attempt++) {
        const next = await store.claim();
        expect(next).not.toBeNull();
        expect(await store.deliver(next!, failing)).toBe(
          attempt === 5 ? "failed" : "retry",
        );
        await db.pool.query(
          "UPDATE email_outbox SET available_at=now() WHERE id=$1",
          [next!.id],
        );
      }
      expect(new Set(ids).size).toBe(1);
      expect(await store.claim()).toBeNull();
      const dead = (await db.pool.query("SELECT * FROM email_outbox")).rows[0];
      expect(dead.encrypted_payload).toBeNull();
      expect(dead.attempt_count).toBe(5);
      expect(
        () =>
          new EmailStore({
            pool: db.pool,
            env: { ...config, EMAIL_MAX_ATTEMPTS: "6" },
          }),
      ).toThrow();
      await clear();
      await user();
      const limited = new EmailStore({
        pool: db.pool,
        env: { ...config, EMAIL_MAX_ATTEMPTS: "1" },
      });
      const only = await limited.claim();
      expect(await limited.deliver(only!, failing)).toBe("failed");
      expect((await row(only!.id)).attempt_count).toBe(1);
      await clear();
      await user();
      const prior = await store.claim();
      expect(await store.deliver(prior!, failing)).toBe("retry");
      expect(await limited.claim()).toBeNull();
      expect(await row(prior!.id)).toMatchObject({
        status: "failed",
        encrypted_payload: null,
        last_error_code: "EMAIL_ATTEMPTS_EXHAUSTED",
      });
    });
    it("pause is durable, heartbeat expires and account deletion cascades saved data", async () => {
      await clear();
      const u = await user();
      await setControl("email_paused", true, db.pool);
      expect(await store.claim()).toBeNull();
      expect((await store.health()).status).toBe("paused");
      await setControl("email_paused", false, db.pool);
      const worker = new EmailWorker({
        store,
        transport: { async sendMail() {} },
      });
      await worker.tick();
      expect((await store.health()).ready).toBe(true);
      await db.pool.query(
        "UPDATE service_heartbeats SET updated_at=now()-interval '31 seconds'",
      );
      expect((await store.health()).ready).toBe(false);
      await worker.close();
      await db.pool.query(
        "INSERT INTO python_workspaces(id,user_id,name,source,input) VALUES($1,$2,'test','print(1)','{}')",
        [randomUUID(), u.id],
      );
      expect(
        (await inspectAccount(u.id, db.pool))?.counts.python_workspaces,
      ).toBe(1);
      expect(await deleteAccount(u.id, "wrong", db.pool)).toBe(false);
      expect(await deleteAccount(u.id, u.passwordHash, db.pool)).toBe(true);
      for (const table of [
        "users",
        "email_outbox",
        "account_tokens",
        "python_workspaces",
      ])
        expect(
          (await db.pool.query("SELECT count(*)::int AS n FROM " + table))
            .rows[0].n,
        ).toBe(0);
    });
  },
);
