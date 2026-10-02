import type { Environment } from "@sim/operations";
import type { Pool } from "pg";
export function runnerPreflight(options?: {
  env?: Environment;
  profile?: "local" | "test-production" | "production";
  pool?: Pool;
}): Promise<{
  ok: true;
  profile: string;
  runtimeId: string;
  image: string;
  rootless: boolean;
  cgroup: string;
  security: string[];
  resourceLimits: { memoryBytes: number; pids: number; nanoCpus: number };
  cleanup: boolean;
}>;
