import { randomBytes, randomUUID, createHash } from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import {
  ExecutionStore,
  queueConfig,
  setControl,
  type Actor,
  type QueueConfig,
} from "@sim/operations";
import { DurableWorker } from "../packages/isolated-runner/src/durable-worker.mjs";
import { RunnerError, type runPython } from "@sim/isolated-runner";
import { testDatabase } from "./operations-helpers";
const suite = process.env.DB_TEST_URL ? describe : describe.skip;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const actor = (name = "guest"): Actor => ({
  clientHash: sha(name),
  ipHash: sha("shared-ip"),
  ownerId: null,
  verified: false,
  idempotencyKey: randomUUID(),
});
const request = {
  schemaVersion: "0.1" as const,
  source: "def solve(data): return data",
  input: { x: 1 },
};
const result = { status: "ok" as const, stdout: "", rawTrace: [], output: 1 };
suite("durable execution admission and worker", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>;
  const env = { EXECUTION_CAPABILITY_KEY: randomBytes(32).toString("hex") };
  const config = queueConfig({});
  const store = (overrides: Partial<QueueConfig> = {}) =>
    new ExecutionStore({
      pool: db.pool,
      env,
      config: { ...config, ...overrides },
    });
  beforeAll(async () => {
    db = await testDatabase("queue");
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.pool.query(
      "TRUNCATE execution_jobs,operational_controls,operational_metrics,rate_limits,runner_runtime",
    );
  });
  it("persists jobs, hashes capabilities and reuses an identical scoped submission", async () => {
    const a = actor(),
      first = await store().submit(request, a);
    expect(await store().submit(request, a)).toMatchObject({
      id: first.id,
      capability: first.capability,
      reused: true,
    });
    await expect(
      store().submit({ ...request, input: { x: 2 } }, a),
    ).rejects.toMatchObject({ code: "PYTHON_IDEMPOTENCY_CONFLICT" });
    const saved = (
      await db.pool.query("SELECT * FROM execution_jobs WHERE id=$1", [
        first.id,
      ])
    ).rows[0];
    expect(saved.capability_hash).toBe(sha(first.capability));
    expect(JSON.stringify(saved)).not.toContain(first.capability);
    expect(await store().access(first.id, first.capability, a)).toMatchObject({
      status: "queued",
    });
    expect(await store().access(first.id, "bad", a)).toBe(null);
    expect(
      await store().access(first.id, first.capability, actor("another")),
    ).toBe(null);
    await db.pool.query(
      "UPDATE execution_jobs SET expires_at=now()-interval '1 second' WHERE id=$1",
      [first.id],
    );
    expect(await store().access(first.id, first.capability, a)).toBe(null);
  });
  it("serializes concurrent retries and rejects unsupported schema or idempotency keys", async () => {
    const a = actor();
    const jobs = await Promise.all(
      Array.from({ length: 8 }, () => store().submit(request, a)),
    );
    expect(new Set(jobs.map((j) => j.id)).size).toBe(1);
    await expect(
      store().submit(request, { ...a, idempotencyKey: "bad" }),
    ).rejects.toMatchObject({ code: "PYTHON_POLICY_REJECTED" });
    await expect(
      store().submit({ ...request, schemaVersion: "wrong" as "0.1" }, a),
    ).rejects.toMatchObject({ code: "PYTHON_POLICY_REJECTED" });
  });
  it("enforces separate guest and verified quotas plus shared IP/global budgets", async () => {
    const s = store({
      guestMinute: 1,
      verifiedMinute: 2,
      guestQueued: 8,
      verifiedQueued: 8,
      globalMinute: 4,
    });
    await s.submit(request, actor("guest"));
    await expect(s.submit(request, actor("guest"))).rejects.toMatchObject({
      code: "PYTHON_RATE_LIMITED",
      retryAfter: expect.any(Number),
    });
    const id = randomUUID();
    await db.pool.query(
      "INSERT INTO users(id,email,display_name,password_hash,email_verified_at) VALUES($1,$2,'Test','not-used',now())",
      [id, id + "@example.test"],
    );
    const verified = () => ({
      ...actor("account"),
      verified: true,
      ownerId: id,
    });
    await s.submit(request, verified());
    await s.submit(request, verified());
    await expect(s.submit(request, verified())).rejects.toMatchObject({
      code: "PYTHON_RATE_LIMITED",
    });
    await expect(
      s.submit(request, actor("another-account")),
    ).rejects.toMatchObject({ code: "PYTHON_RATE_LIMITED" });
  });
  it("enforces IP limits across changed guest identities and bounds polling/cancel", async () => {
    const s = store({ ipMinute: 1, pollMinute: 10, cancelMinute: 1 });
    const a = actor(),
      job = await s.submit(request, a);
    await expect(s.submit(request, actor("new-cookie"))).rejects.toMatchObject({
      code: "PYTHON_RATE_LIMITED",
    });
    for (let n = 0; n < 10; n++) await s.access(job.id, job.capability, a);
    await expect(s.access(job.id, job.capability, a)).rejects.toMatchObject({
      code: "PYTHON_RATE_LIMITED",
    });
    await s.access(job.id, job.capability, a, "cancel");
    await expect(
      s.access(job.id, job.capability, a, "cancel"),
    ).rejects.toMatchObject({ code: "PYTHON_RATE_LIMITED" });
  });
  it("bounds queue capacity, supports queued cancellation and expires queued source", async () => {
    const s = store({ queueSize: 2, guestQueued: 8 }),
      a = actor();
    const first = await s.submit(request, a);
    await s.submit(request, actor());
    await expect(s.submit(request, actor())).rejects.toMatchObject({
      code: "PYTHON_QUEUE_FULL",
    });
    expect(
      await s.access(first.id, first.capability, a, "cancel"),
    ).toMatchObject({ status: "cancelled" });
    const third = await s.submit(request, actor());
    await db.pool.query(
      "UPDATE execution_jobs SET queue_deadline=now()-interval '1 second' WHERE id=$1",
      [third.id],
    );
    await s.expireQueued();
    expect(
      (
        await db.pool.query(
          "SELECT status,source,input FROM execution_jobs WHERE id=$1",
          [third.id],
        )
      ).rows[0],
    ).toEqual({ status: "failed", source: null, input: null });
  });
  it("honors independently controlled guest, verified and global switches", async () => {
    await setControl("python_guest_disabled", true, db.pool);
    await expect(store().submit(request, actor())).rejects.toMatchObject({
      code: "PYTHON_DISABLED",
    });
    await setControl("python_guest_disabled", false, db.pool);
    await setControl("python_disabled", true, db.pool);
    await expect(store().submit(request, actor())).rejects.toMatchObject({
      code: "PYTHON_DISABLED",
    });
  });
  it("stops already queued guest work while a role kill switch is active", async () => {
    const s = store(),
      a = actor(),
      job = await s.submit(request, a);
    await setControl("python_guest_disabled", true, db.pool);
    const worker = new DurableWorker({
      store: s,
      runtimeId: "test-runtime",
      runner: async () => result,
    });
    try {
      await worker.start();
      await worker.tick();
      expect((await s.access(job.id, job.capability, a))?.status).toBe(
        "queued",
      );
      await setControl("python_guest_disabled", false, db.pool);
      await worker.tick();
      await expect
        .poll(async () => (await s.access(job.id, job.capability, a))?.status)
        .toBe("completed");
    } finally {
      await worker.close();
    }
  });
  it("runs one active leader with max concurrency and keeps capacity until cleanup", async () => {
    let active = 0,
      peak = 0;
    const releases: Array<() => void> = [];
    const runner: typeof runPython = async (_request, options) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => {
        releases.push(resolve);
        options?.signal?.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
      active--;
      options?.onCleanup?.(2);
      return result;
    };
    const s = store({ guestQueued: 8, queueSize: 2 });
    const worker = new DurableWorker({
      store: s,
      runner,
      runtimeId: "test-runtime",
    });
    const second = new DurableWorker({
      store: s,
      runner,
      runtimeId: "test-runtime",
    });
    try {
      await worker.start();
      await expect(second.start()).rejects.toThrow("LEADER");
      await s.submit(request, actor());
      await s.submit(request, actor());
      await expect.poll(() => active).toBe(2);
      await s.submit(request, actor());
      await s.submit(request, actor());
      await expect(s.submit(request, actor())).rejects.toMatchObject({
        code: "PYTHON_QUEUE_FULL",
      });
      releases.splice(0).forEach((release) => release());
      await expect
        .poll(async () =>
          Number(
            (
              await db.pool.query(
                "SELECT count(*) FROM execution_jobs WHERE status='completed'",
              )
            ).rows[0].count,
          ),
        )
        .toBe(2);
      await expect.poll(() => active).toBe(2);
      releases.splice(0).forEach((release) => release());
      await expect
        .poll(async () =>
          Number(
            (
              await db.pool.query(
                "SELECT count(*) FROM execution_jobs WHERE status='completed'",
              )
            ).rows[0].count,
          ),
        )
        .toBe(4);
      expect(peak).toBe(2);
      expect((await s.metrics()).counters.completed).toBe(4);
      expect(
        (
          await db.pool.query(
            "SELECT count(*) FROM execution_jobs WHERE source IS NOT NULL",
          )
        ).rows[0].count,
      ).toBe("0");
    } finally {
      releases.forEach((release) => release());
      await worker.close();
      await second.close();
    }
  }, 15000);
  it("cancels running work, pauses after cleanup failure, and does not reuse an unsafe slot", async () => {
    let finishCleanup: (() => void) | undefined,
      aborted = false;
    const runner: typeof runPython = async (_request, options) => {
      await new Promise<void>((resolve) =>
        options?.signal?.addEventListener(
          "abort",
          () => {
            aborted = true;
            finishCleanup = resolve;
          },
          { once: true },
        ),
      );
      throw new RunnerError("PYTHON_CANCELLED");
    };
    const s = store({ concurrency: 1 }),
      a = actor(),
      job = await s.submit(request, a);
    const worker = new DurableWorker({
      store: s,
      runner,
      runtimeId: "test-runtime",
    });
    try {
      await worker.start();
      await expect
        .poll(async () => (await s.access(job.id, job.capability, a))?.status)
        .toBe("running");
      await s.access(job.id, job.capability, a, "cancel");
      await expect.poll(() => aborted).toBe(true);
      expect(worker.tasks.size).toBe(1);
      expect((await s.access(job.id, job.capability, a))?.status).toBe(
        "cancelling",
      );
      finishCleanup!();
      await expect
        .poll(async () => (await s.access(job.id, job.capability, a))?.status)
        .toBe("cancelled");
    } finally {
      finishCleanup?.();
      await worker.close();
    }
    await s.submit(request, actor());
    const failed = new DurableWorker({
      store: s,
      runtimeId: "test-runtime",
      runner: async () => {
        throw new RunnerError("PYTHON_CLEANUP_FAILED");
      },
    });
    try {
      await failed.start();
      await expect.poll(() => failed.fault).toBe(true);
      expect(failed.ready()).toBe(false);
      expect(
        (
          await db.pool.query(
            "SELECT enabled FROM operational_controls WHERE name='runner_paused'",
          )
        ).rows[0].enabled,
      ).toBe(true);
    } finally {
      await failed.close();
    }
  }, 15000);
});
