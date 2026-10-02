import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { runPython, validateRunnerRequest, RunnerError } from "./index.mjs";
const terminal = new Set(["completed", "failed", "cancelled"]);
export class PythonJobs {
  constructor({
    concurrency = 2,
    queueSize = 8,
    queueWaitMs = 15000,
    retentionMs = 300000,
    rateLimit = 30,
    runner = runPython,
    onFinished = () => {},
  } = {}) {
    for (const [value, min, max] of [
      [concurrency, 1, 2],
      [queueSize, 1, 16],
      [queueWaitMs, 10, 30000],
      [retentionMs, 100, 300000],
      [rateLimit, 1, 120],
    ])
      if (!Number.isInteger(value) || value < min || value > max)
        throw new RangeError("Invalid scheduler limits");
    Object.assign(this, {
      concurrency,
      queueSize,
      queueWaitMs,
      retentionMs,
      rateLimit,
      runner,
      onFinished,
    });
    this.jobs = new Map();
    this.queue = [];
    this.running = new Set();
    this.requests = [];
    this.closed = false;
    this.timer = setInterval(() => this.sweep(), Math.min(1000, queueWaitMs));
    this.timer.unref();
  }
  sweep() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => time > now - 60000);
    for (const [id, job] of this.jobs) {
      if (job.status === "queued" && now - job.createdAt >= this.queueWaitMs) {
        job.status = "failed";
        job.code = "PYTHON_TIMEOUT";
        job.finishedAt = now;
        job.request = undefined;
      }
      if (terminal.has(job.status) && now - job.finishedAt >= this.retentionMs)
        this.jobs.delete(id);
    }
    this.queue = this.queue.filter((job) => job.status === "queued");
  }
  submit(request) {
    if (this.closed) throw new RunnerError("PYTHON_INTERNAL_ERROR");
    validateRunnerRequest(request);
    this.sweep();
    if (this.requests.length >= this.rateLimit)
      throw new RunnerError("PYTHON_RATE_LIMITED");
    if (
      this.jobs.size >= 100 ||
      (this.running.size >= this.concurrency &&
        this.queue.length >= this.queueSize)
    )
      throw new RunnerError("PYTHON_QUEUE_FULL");
    const capability = randomBytes(32).toString("base64url");
    const job = {
      id: randomUUID(),
      tokenHash: createHash("sha256").update(capability).digest(),
      status: "queued",
      createdAt: Date.now(),
      request: JSON.parse(JSON.stringify(request)),
      controller: new AbortController(),
    };
    this.jobs.set(job.id, job);
    this.queue.push(job);
    this.requests.push(Date.now());
    this.pump();
    return { id: job.id, capability, status: job.status };
  }
  lookup(id, capability) {
    const job = this.jobs.get(id);
    if (
      !job ||
      typeof capability !== "string" ||
      capability.length !== 43 ||
      !timingSafeEqual(
        job.tokenHash,
        createHash("sha256").update(capability).digest(),
      )
    )
      return null;
    return job;
  }
  get(id, capability) {
    this.sweep();
    const job = this.lookup(id, capability);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      code: job.code,
      errorLine: job.errorLine,
      result: job.result,
    };
  }
  cancel(id, capability) {
    const job = this.lookup(id, capability);
    if (!job) return null;
    if (job.status === "queued") {
      job.status = "cancelled";
      job.code = "PYTHON_CANCELLED";
      job.finishedAt = Date.now();
      job.request = undefined;
    } else if (job.status === "running") {
      job.status = "cancelling";
      job.controller.abort();
    }
    this.sweep();
    return this.get(id, capability);
  }
  pump() {
    this.sweep();
    while (
      !this.closed &&
      this.running.size < this.concurrency &&
      this.queue.length
    ) {
      const job = this.queue.shift();
      job.status = "running";
      const task = (async () => {
        try {
          const result = await this.runner(job.request, {
            signal: job.controller.signal,
            runId: job.id,
          });
          if (job.controller.signal.aborted) {
            job.status = "cancelled";
            job.code = "PYTHON_CANCELLED";
          } else if (result.status === "ok") {
            job.status = "completed";
            job.result = result;
          } else {
            job.status = "failed";
            job.code = result.code ?? "PYTHON_RUNTIME_ERROR";
            if (
              Number.isInteger(result.errorLine) &&
              result.errorLine > 0 &&
              result.errorLine <= 4096
            )
              job.errorLine = result.errorLine;
          }
        } catch (error) {
          job.code =
            error instanceof RunnerError ? error.code : "PYTHON_INTERNAL_ERROR";
          job.status = job.code === "PYTHON_CANCELLED" ? "cancelled" : "failed";
        } finally {
          job.request = undefined;
          job.finishedAt = Date.now();
          this.onFinished({
            jobId: job.id,
            status: job.status,
            code: job.code,
            durationMs: job.finishedAt - job.createdAt,
          });
        }
      })();
      this.running.add(task);
      task.finally(() => {
        this.running.delete(task);
        this.pump();
      });
    }
  }
  async close() {
    this.closed = true;
    clearInterval(this.timer);
    for (const job of this.jobs.values()) {
      job.controller.abort();
      job.request = undefined;
    }
    await Promise.allSettled([...this.running]);
    this.jobs.clear();
    this.queue = [];
  }
}
