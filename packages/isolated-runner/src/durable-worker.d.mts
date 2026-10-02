import type { ExecutionStore } from "@sim/operations";
import type { Pool } from "pg";
import type { runPython } from "./index.mjs";
export class DurableWorker {
  constructor(options: {
    store: ExecutionStore;
    pool?: Pool;
    runner?: typeof runPython;
    image?: string;
    runtimeId: string;
    concurrency?: number;
    onEvent?: (event: Record<string, unknown>) => void;
  });
  start(): Promise<void>;
  close(): Promise<void>;
  tick(): Promise<void>;
  ready(): boolean;
  tasks: Set<Promise<void>>;
  closed: boolean;
  fault: boolean;
}
