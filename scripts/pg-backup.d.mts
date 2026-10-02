export function backupDatabase(options: {
  url?: string;
  path: string;
  env?: Record<string, string | undefined>;
}): Promise<{ format: string; bytes: number; durationMs: number }>;
export function restoreDatabase(options: {
  url?: string;
  path: string;
  env?: Record<string, string | undefined>;
}): Promise<{ status: string; durationMs: number }>;
