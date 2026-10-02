import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@sim/persistence";
import {
  ExecutionStore,
  EmailStore,
  pruneOperations,
  operationsStatus,
} from "@sim/operations";
import { backupDatabase, restoreDatabase } from "../scripts/pg-backup.mjs";
import { testDatabase } from "./operations-helpers";
describe.skipIf(!process.env.DB_TEST_URL)(
  "backup restore and bounded retention",
  () => {
    it("restores a native custom dump into fresh empty DB with ownership/auth/workspaces intact", async () => {
      const source = await testDatabase("dump"),
        target = await testDatabase("restore", { migrate: false });
      const folder = resolve(".cache", "backup-drill-" + randomUUID());
      await mkdir(folder, { recursive: true });
      const file = resolve(folder, "database.dump");
      try {
        const id = randomUUID(),
          password = await hashPassword("restore test password"),
          session = createHash("sha256").update(randomBytes(32)).digest("hex");
        await source.pool.query(
          "INSERT INTO users(id,email,display_name,password_hash,email_verified_at) VALUES($1,'restore@example.test','Restore learner',$2,now())",
          [id, password],
        );
        await source.pool.query(
          "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
          [session, id],
        );
        await source.pool.query(
          "INSERT INTO saved_inputs(id,user_id,problem_id,name,input) VALUES($1,$2,'increasing-array','Audit fixture',$3)",
          [randomUUID(), id, JSON.stringify({ values: [8, 2, 5, 1, 7] })],
        );
        await source.pool.query(
          "INSERT INTO simulation_runs(id,user_id,problem_id,input,output,event_count) VALUES($1,$2,'increasing-array','{}','17',12)",
          [randomUUID(), id],
        );
        await source.pool.query(
          "INSERT INTO problem_progress(user_id,problem_id,simulation_count) VALUES($1,'increasing-array',1)",
          [id],
        );
        await source.pool.query(
          "INSERT INTO python_workspaces(id,user_id,name,source,input) VALUES($1,$2,'Python restore','print(17)','{}')",
          [randomUUID(), id],
        );
        const backup = await backupDatabase({ url: source.url, path: file });
        expect(backup.bytes).toBeGreaterThan(1000);
        const restored = await restoreDatabase({ url: target.url, path: file });
        expect(restored.status).toBe("restored");
        expect(
          (
            await target.pool.query(
              "SELECT count(*)::int AS n FROM schema_migrations",
            )
          ).rows[0].n,
        ).toBe(6);
        const user = (
          await target.pool.query("SELECT * FROM users WHERE id=$1", [id])
        ).rows[0];
        expect(
          await verifyPassword("restore test password", user.password_hash),
        ).toBe(true);
        expect(
          (
            await target.pool.query(
              "SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",
              [session],
            )
          ).rows[0].user_id,
        ).toBe(id);
        for (const table of [
          "saved_inputs",
          "simulation_runs",
          "problem_progress",
          "python_workspaces",
        ])
          expect(
            (await target.pool.query("SELECT user_id FROM " + table)).rows[0]
              .user_id,
          ).toBe(id);
        await expect(
          target.pool.query(
            "INSERT INTO python_workspaces(id,user_id,name,source,input) VALUES($1,$2,'invalid','print(1)','{}')",
            [randomUUID(), randomUUID()],
          ),
        ).rejects.toMatchObject({ code: "23503" });
        await expect(
          restoreDatabase({ url: target.url, path: file }),
        ).rejects.toThrow("RESTORE_REQUIRES_EMPTY_DATABASE");
        console.info(
          JSON.stringify({
            event: "backup-restore-drill",
            ...backup,
            restoreDurationMs: restored.durationMs,
            verifiedTables: 7,
          }),
        );
      } finally {
        await source.close();
        await target.close();
        const root = resolve(".cache");
        if (
          !folder.startsWith(root + (process.platform === "win32" ? "\\" : "/"))
        )
          throw new Error("Cleanup path escaped cache");
        await rm(folder, { recursive: true, force: true });
      }
    }, 60000);
    it("prunes expired private data in bounded batches while preserving saved work and orphan IDs", async () => {
      const db = await testDatabase("retention");
      try {
        const key = randomBytes(32).toString("hex"),
          env = {
            ...process.env,
            APP_URL: "http://localhost:3000",
            EXECUTION_CAPABILITY_KEY: key,
            EMAIL_OUTBOX_KEY: key,
          };
        const user = await new EmailStore({ pool: db.pool, env }).register(
          "retain@example.test",
          "Retain",
          "hash",
        );
        await db.pool.query(
          "INSERT INTO python_workspaces(id,user_id,name,source,input) VALUES($1,$2,'keep','print(1)','{}')",
          [randomUUID(), user.id],
        );
        for (let i = 0; i < 3; i++)
          await db.pool.query(
            "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()-interval '1 second')",
            [randomBytes(32).toString("hex"), user.id],
          );
        await db.pool.query(
          "INSERT INTO rate_limits(key_hash,window_end,attempts) VALUES($1,now()-interval '2 days',1)",
          [randomBytes(32).toString("hex")],
        );
        const store = new ExecutionStore({ pool: db.pool, env });
        const actor = {
          clientHash: randomBytes(32).toString("hex"),
          ipHash: randomBytes(32).toString("hex"),
          ownerId: null,
          verified: false,
          idempotencyKey: randomUUID(),
        };
        const job = await store.submit(
          { schemaVersion: "0.1", source: "print(17)", input: {} },
          actor,
        );
        await db.pool.query(
          "UPDATE execution_jobs SET status='running',attempt_count=1,expires_at=now()-interval '1 second' WHERE id=$1",
          [job.id],
        );
        await db.pool.query(
          "UPDATE account_tokens SET expires_at=now()-interval '1 second'",
        );
        const first = await pruneOperations({ pool: db.pool, batch: 2 });
        expect(first.sessions).toBe(2);
        expect(
          (
            await db.pool.query(
              "SELECT status,source,input FROM execution_jobs WHERE id=$1",
              [job.id],
            )
          ).rows[0],
        ).toEqual({ status: "cancelling", source: null, input: null });
        expect(
          (
            await db.pool.query(
              "SELECT status,encrypted_payload FROM email_outbox",
            )
          ).rows[0],
        ).toEqual({ status: "cancelled", encrypted_payload: null });
        await db.pool.query(
          "UPDATE execution_jobs SET status='cancelled' WHERE id=$1",
          [job.id],
        );
        await db.pool.query(
          "UPDATE email_outbox SET finished_at=now()-interval '8 days'",
        );
        const second = await pruneOperations({ pool: db.pool, batch: 2 });
        expect(second.sessions).toBe(1);
        expect(second.executionResults).toBe(1);
        expect(second.emailRecords).toBe(1);
        expect(
          (
            await db.pool.query(
              "SELECT count(*)::int AS n FROM python_workspaces",
            )
          ).rows[0].n,
        ).toBe(1);
        expect(JSON.stringify(await operationsStatus(db.pool))).not.toContain(
          "retain@example",
        );
        await expect(
          pruneOperations({ pool: db.pool, batch: 1001 }),
        ).rejects.toThrow("RETENTION_BATCH_INVALID");
      } finally {
        await db.close();
      }
    }, 30000);
  },
);
