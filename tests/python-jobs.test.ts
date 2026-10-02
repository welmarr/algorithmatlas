import { expect, it } from "vitest";
import { PythonJobs } from "../packages/isolated-runner/src/jobs.mjs";
import { RunnerError, type RunnerResult } from "@sim/isolated-runner";
const request = { source: "def solve(data): return data", input: 1 };
const result: RunnerResult = {
  status: "ok",
  output: 1,
  stdout: "",
  rawTrace: [],
};
it("bounds concurrency and queue, requires the capability, and cancels queued/running jobs", async () => {
  let active = 0,
    peak = 0;
  const jobs = new PythonJobs({
    concurrency: 1,
    queueSize: 1,
    runner: (_request, { signal }) =>
      new Promise((_resolve, reject) => {
        active++;
        peak = Math.max(peak, active);
        signal.addEventListener("abort", () => {
          active--;
          reject(new RunnerError("PYTHON_CANCELLED"));
        });
      }),
  });
  try {
    const first = jobs.submit(request),
      queued = jobs.submit(request);
    expect(jobs.get(first.id, first.capability)?.status).toBe("running");
    expect(jobs.get(queued.id, queued.capability)?.status).toBe("queued");
    expect(() => jobs.submit(request)).toThrow("PYTHON_QUEUE_FULL");
    expect(jobs.get(first.id, "x".repeat(43))).toBeNull();
    expect(jobs.cancel(first.id, "x".repeat(43))).toBeNull();
    expect(jobs.cancel(queued.id, queued.capability)?.status).toBe("cancelled");
    jobs.cancel(first.id, first.capability);
    await expect
      .poll(() => jobs.get(first.id, first.capability)?.status)
      .toBe("cancelled");
    expect(peak).toBe(1);
    expect(active).toBe(0);
  } finally {
    await jobs.close();
  }
});
it("expires queue waits and completed results, and rejects excess request rates", async () => {
  const jobs = new PythonJobs({
    concurrency: 1,
    queueSize: 2,
    queueWaitMs: 20,
    retentionMs: 100,
    rateLimit: 2,
    runner: (_request, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new RunnerError("PYTHON_CANCELLED")),
        ),
      ),
  });
  try {
    const running = jobs.submit(request),
      queued = jobs.submit(request);
    expect(() => jobs.submit(request)).toThrow("PYTHON_RATE_LIMITED");
    await expect
      .poll(() => jobs.get(queued.id, queued.capability)?.code, {
        interval: 10,
      })
      .toBe("PYTHON_TIMEOUT");
    expect(jobs.get(running.id, running.capability)?.status).toBe("running");
    await expect
      .poll(() => jobs.get(queued.id, queued.capability), { interval: 20 })
      .toBeNull();
  } finally {
    await jobs.close();
  }
});
it("hands the next queued request its own copied input and releases completed slots", async () => {
  let resolveFirst!: (value: RunnerResult) => void,
    calls = 0;
  const jobs = new PythonJobs({
    concurrency: 1,
    runner: async (req) => {
      calls++;
      if (calls === 1)
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      return { ...result, output: req.input };
    },
  });
  try {
    const first = jobs.submit(request);
    const mutable = { ...request, input: { value: 7 } };
    const next = jobs.submit(mutable);
    mutable.input.value = 99;
    resolveFirst(result);
    await expect
      .poll(() => jobs.get(next.id, next.capability)?.status)
      .toBe("completed");
    expect(jobs.get(next.id, next.capability)?.result?.output).toEqual({
      value: 7,
    });
    expect(jobs.get(first.id, first.capability)?.result?.output).toBe(1);
  } finally {
    await jobs.close();
  }
});
