import {
  ExecutionStore,
  controls,
  setControl,
  operationsPool,
} from "@sim/operations";
import { runPython, removeRunnerContainer, RunnerError } from "./index.mjs";
export class DurableWorker {
  constructor({
    store = new ExecutionStore(),
    pool = store.pool,
    runner = runPython,
    image,
    runtimeId,
    concurrency = store.config.concurrency,
    onEvent = () => {},
    allowGuest = true,
    allowVerified = true,
  } = {}) {
    Object.assign(this, {
      store,
      pool,
      runner,
      image,
      runtimeId,
      concurrency,
      onEvent,
      allowGuest,
      allowVerified,
    });
    this.tasks = new Set();
    this.controllers = new Map();
    this.closed = false;
    this.fault = false;
    this.ticking = false;
    this.lastTick = 0;
  }
  async start() {
    this.leader = await this.pool.connect();
    this.onLeaderError = () => {
      this.fault = true;
      this.closed = true;
      for (const controller of this.controllers.values()) controller.abort();
    };
    this.leader.on("error", this.onLeaderError);
    try {
      const lock = await this.leader.query(
        "SELECT pg_try_advisory_lock(71420302) AS acquired",
      );
      if (!lock.rows[0].acquired)
        throw new Error("RUNNER_LEADER_ALREADY_ACTIVE");
      const prior = await this.leader.query(
        "SELECT runtime_id FROM runner_runtime WHERE singleton=true",
      );
      if (prior.rowCount && prior.rows[0].runtime_id !== this.runtimeId)
        throw new Error("RUNNER_RUNTIME_CHANGED_REQUIRES_DRAIN");
      await this.leader.query(
        "INSERT INTO runner_runtime(singleton,runtime_id) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET heartbeat_at=now()",
        [this.runtimeId],
      );
      const orphaned = await this.leader.query(
        "SELECT id FROM execution_jobs WHERE status IN ('running','cancelling')",
      );
      for (const row of orphaned.rows) {
        await removeRunnerContainer("simulator-python-runner-" + row.id);
        await this.store.finish(row.id, {
          status: "failed",
          code: "PYTHON_INTERRUPTED",
        });
      }
      this.timer = setInterval(() => {
        void this.tick();
      }, 100);
      this.timer.unref();
      await this.tick();
    } catch (error) {
      await this.leader
        .query("SELECT pg_advisory_unlock(71420302)")
        .catch(() => {});
      this.leader.off("error", this.onLeaderError);
      this.leader.release();
      this.leader = null;
      throw error;
    }
  }
  async tick() {
    if (this.closed || this.fault || this.ticking) return;
    this.ticking = true;
    try {
      await this.leader.query(
        "UPDATE runner_runtime SET heartbeat_at=now() WHERE singleton=true",
      );
      await this.store.expireQueued();
      const flags = await controls(this.pool);
      for (const [id, controller] of this.controllers) {
        const row = (
          await this.pool.query(
            "SELECT status, EXISTS(SELECT 1 FROM users WHERE id=owner_user_id AND email_verified_at IS NOT NULL) AS verified FROM execution_jobs WHERE id=$1",
            [id],
          )
        ).rows[0];
        if (
          flags.python_disabled ||
          flags.runner_paused ||
          (row?.verified
            ? !this.allowVerified || flags.python_verified_disabled
            : !this.allowGuest || flags.python_guest_disabled) ||
          !row ||
          row.status === "cancelling"
        )
          controller.abort();
      }
      if (!flags.python_disabled && !flags.runner_paused)
        while (
          this.tasks.size < this.concurrency &&
          !this.closed &&
          !this.fault
        ) {
          const job = await this.store.claim({
            allowGuest: this.allowGuest,
            allowVerified: this.allowVerified,
          });
          if (!job) break;
          const controller = new AbortController();
          this.controllers.set(job.id, controller);
          const task = this.execute(job, controller);
          this.tasks.add(task);
          task
            .finally(() => {
              this.tasks.delete(task);
              this.controllers.delete(job.id);
            })
            .catch(() => {});
        }
      await this.pool.query(
        "DELETE FROM execution_jobs WHERE id IN (SELECT id FROM execution_jobs WHERE expires_at<=now() AND status IN ('completed','failed','cancelled') ORDER BY expires_at LIMIT 100)",
      );
      this.lastTick = Date.now();
    } catch {
      this.fault = true;
      for (const controller of this.controllers.values()) controller.abort();
      this.onEvent({ event: "runner-fault", code: "DEPENDENCY_UNAVAILABLE" });
    } finally {
      this.ticking = false;
    }
  }
  async execute(job, controller) {
    const start = Date.now();
    let cleanupMs = 0,
      view;
    try {
      const result = await this.runner(
        { source: job.source, input: job.input },
        {
          signal: controller.signal,
          runId: job.id,
          image: this.image,
          onCleanup: (ms) => {
            cleanupMs = ms;
          },
        },
      );
      view = controller.signal.aborted
        ? { status: "cancelled", code: "PYTHON_CANCELLED" }
        : result.status === "ok"
          ? { status: "completed", result }
          : {
              status: "failed",
              code: result.code ?? "PYTHON_RUNTIME_ERROR",
              errorLine: result.errorLine,
            };
    } catch (error) {
      const code =
        error instanceof RunnerError ? error.code : "PYTHON_INTERNAL_ERROR";
      view = {
        status: code === "PYTHON_CANCELLED" ? "cancelled" : "failed",
        code,
      };
      if (code === "PYTHON_CLEANUP_FAILED") {
        this.fault = true;
        await setControl("runner_paused", true, this.pool).catch(() => {});
      }
    }
    try {
      await this.store.finish(job.id, {
        ...view,
        durationMs: Date.now() - start,
        cleanupMs,
        waitMs: Math.max(0, start - new Date(job.created_at).getTime()),
      });
      this.onEvent({
        event: "execution-finished",
        jobId: job.id,
        status: view.status,
        code: view.code,
        durationMs: Date.now() - start,
        cleanupMs,
      });
    } catch {
      this.fault = true;
    }
  }
  ready() {
    return !this.closed && !this.fault && Date.now() - this.lastTick < 10000;
  }
  async close() {
    this.closed = true;
    clearInterval(this.timer);
    while (this.ticking)
      await new Promise((resolve) => setTimeout(resolve, 10));
    for (const controller of this.controllers.values()) controller.abort();
    await Promise.allSettled([...this.tasks]);
    if (this.leader) {
      await this.leader
        .query("SELECT pg_advisory_unlock(71420302)")
        .catch(() => {});
      this.leader.off("error", this.onLeaderError);
      this.leader.release();
      this.leader = null;
    }
  }
}
