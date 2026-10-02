export interface RawTraceEvent {
  schemaVersion: "0.1";
  operation: "line" | "return";
  data: { line: number; changes: string };
  sourceRef: { file: "submission.py"; line: number };
}
export interface RunnerRequest {
  source: string;
  input: unknown;
}
export interface RunnerResult {
  status: "ok" | "error" | "limit";
  output?: unknown;
  stdout: string;
  rawTrace: RawTraceEvent[];
  error?: string;
  code?: string;
  errorLine?: number;
}
export const RUNNER_IMAGE: string;
export const MAX_REQUEST_BYTES: number;
export const MAX_RESPONSE_BYTES: number;
export function validateRunnerRequest(request: RunnerRequest): string;
export function dockerRunArguments(containerName: string): string[];
export function runPython(
  request: RunnerRequest,
  options?: { timeoutMs?: number; signal?: AbortSignal; runId?: string },
): Promise<RunnerResult>;
export class RunnerError extends Error {
  code: string;
  constructor(code: string, message?: string);
}
