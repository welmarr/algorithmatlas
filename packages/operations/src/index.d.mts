import type { Pool, PoolClient } from "pg";
export type Environment = Record<string, string | undefined>;
export interface QueueConfig {
  concurrency: number;
  queueSize: number;
  queueWaitMs: number;
  retentionMs: number;
  guestQueued: number;
  verifiedQueued: number;
  guestMinute: number;
  guestHour: number;
  guestDay: number;
  verifiedMinute: number;
  verifiedHour: number;
  verifiedDay: number;
  ipMinute: number;
  ipHour: number;
  ipDay: number;
  globalMinute: number;
  globalDay: number;
  pollMinute: number;
  cancelMinute: number;
}
export interface Actor {
  clientHash: string;
  ipHash: string;
  ownerId: string | null;
  verified: boolean;
  idempotencyKey?: string;
}
export interface JobRequest {
  schemaVersion: "0.1";
  source: string;
  input: unknown;
}
export interface JobView {
  id: string;
  status: string;
  code?: string;
  errorLine?: number;
  result?: unknown;
}
export function operationsPool(): Pool;
export function createOperationsPool(connectionString: string): Pool;
export function transaction<T>(
  pool: Pool,
  action: (client: PoolClient) => Promise<T>,
): Promise<T>;
export function controls(
  pool?: Pool | PoolClient,
): Promise<Record<string, boolean>>;
export function setControl(
  name: string,
  enabled: boolean,
  pool?: Pool,
): Promise<void>;
export function metric(
  name: string,
  value?: number,
  pool?: Pool,
): Promise<void>;
export function consumeQuota(
  client: Pool | PoolClient,
  key: string,
  limit: number,
  seconds: number,
): Promise<{ allowed: boolean; retry_after: number }>;
export function secret(name: string, env?: Environment): string;
export function integer(
  env: Environment,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number;
export function appOrigin(env?: Environment): string;
export function executionMode(
  env?: Environment,
): "local" | "public" | "disabled";
export function executionAllowed(verified: boolean, env?: Environment): boolean;
export function queueConfig(env?: Environment): QueueConfig;
export function validatePublicConfig(
  env?: Environment,
  options?: { testProfile?: boolean },
): void;
export function requestContext(
  request: Request,
  env?: Environment,
  options?: { mutate?: boolean },
): { origin: string; ip: string };
export function opaqueHash(value: string, key: string): string;
export function guestIdentity(
  cookie: string | undefined,
  key: string,
  now?: number,
): { id: string; cookie: string };
export function constantEqual(left: unknown, right: unknown): boolean;
export function validateJob(request: JobRequest, actor: Actor): void;
export class OperationsError extends Error {
  code: string;
  status: number;
  retryAfter: number;
  constructor(code: string, status?: number, retryAfter?: number);
}
export class ExecutionStore {
  constructor(options?: {
    pool?: Pool;
    env?: Environment;
    config?: QueueConfig;
  });
  pool: Pool;
  config: QueueConfig;
  capability(id: string): string;
  submit(
    request: JobRequest,
    actor: Actor,
  ): Promise<{
    id: string;
    capability: string;
    status: string;
    reused: boolean;
  }>;
  access(
    id: string,
    capability: string,
    actor: Actor,
    action?: "poll" | "cancel",
  ): Promise<JobView | null>;
  endpointQuota(actor: Actor, action: string): Promise<void>;
  expireQueued(): Promise<void>;
  metrics(): Promise<{
    states: Record<string, number>;
    counters: Record<string, number>;
  }>;
}
