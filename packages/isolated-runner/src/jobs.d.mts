import type { RunnerRequest, RunnerResult } from "./index.mjs";
export interface JobView {
  id: string;
  status:
    "queued" | "running" | "cancelling" | "cancelled" | "failed" | "completed";
  code?: string;
  result?: RunnerResult;
}
export class PythonJobs {
  constructor(options?: {
    concurrency?: number;
    queueSize?: number;
    queueWaitMs?: number;
    retentionMs?: number;
    rateLimit?: number;
    runner?: (
      request: RunnerRequest,
      options: { signal: AbortSignal },
    ) => Promise<RunnerResult>;
  });
  submit(request: RunnerRequest): {
    id: string;
    capability: string;
    status: JobView["status"];
  };
  get(id: string, capability: string): JobView | null;
  cancel(id: string, capability: string): JobView | null;
  close(): Promise<void>;
}
