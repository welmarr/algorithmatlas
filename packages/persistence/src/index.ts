import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | undefined;

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function databasePool(): pg.Pool {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  return pool;
}

export async function databaseReady(): Promise<boolean> {
  if (!databaseConfigured()) return false;
  try {
    const result = await databasePool().query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      ["001_initial.sql"],
    );
    return Boolean(result.rowCount);
  } catch {
    return false;
  }
}

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

function userFromRow(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    passwordHash: String(row.password_hash),
  };
}

export async function createUser(
  email: string,
  displayName: string,
  passwordHash: string,
): Promise<StoredUser> {
  const result = await databasePool().query(
    "INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, password_hash",
    [randomUUID(), email, displayName, passwordHash],
  );
  return userFromRow(result.rows[0]);
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const result = await databasePool().query(
    "SELECT id, email, display_name, password_hash FROM users WHERE email = $1",
    [email],
  );
  return result.rowCount ? userFromRow(result.rows[0]) : null;
}

export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await databasePool().query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [tokenHash, userId, expiresAt],
  );
}

export async function findSessionUser(
  tokenHash: string,
): Promise<Omit<StoredUser, "passwordHash"> | null> {
  const result = await databasePool().query(
    "SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [tokenHash],
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await databasePool().query("DELETE FROM sessions WHERE token_hash = $1", [
    tokenHash,
  ]);
}

export async function recordCuratedRun(
  userId: string,
  problemId: string,
  input: unknown,
  output: unknown,
  eventCount: number,
): Promise<string> {
  const id = randomUUID();
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO simulation_runs (id, user_id, problem_id, input, output, event_count) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)",
      [
        id,
        userId,
        problemId,
        JSON.stringify(input),
        JSON.stringify(output),
        eventCount,
      ],
    );
    await client.query(
      "INSERT INTO problem_progress (user_id, problem_id, simulation_count, last_run_at) VALUES ($1, $2, 1, now()) ON CONFLICT (user_id, problem_id) DO UPDATE SET simulation_count = problem_progress.simulation_count + 1, last_run_at = now()",
      [userId, problemId],
    );
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveInput(
  userId: string,
  problemId: string,
  name: string,
  input: unknown,
): Promise<string> {
  const id = randomUUID();
  await databasePool().query(
    "INSERT INTO saved_inputs (id, user_id, problem_id, name, input) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [id, userId, problemId, name, JSON.stringify(input)],
  );
  return id;
}

export async function deleteSavedInput(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await databasePool().query(
    "DELETE FROM saved_inputs WHERE user_id = $1 AND id = $2",
    [userId, id],
  );
  return Boolean(result.rowCount);
}

export async function findSavedInput(
  userId: string,
  id: string,
): Promise<{
  id: string;
  problemId: string;
  name: string;
  input: unknown;
} | null> {
  const result = await databasePool().query(
    "SELECT id, problem_id, name, input FROM saved_inputs WHERE user_id = $1 AND id = $2",
    [userId, id],
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    problemId: row.problem_id,
    name: row.name,
    input: row.input,
  };
}

export async function saveSubmission(
  userId: string,
  problemId: string,
  language: string,
  source: string,
): Promise<string> {
  const id = randomUUID();
  await databasePool().query(
    "INSERT INTO user_submissions (id, user_id, problem_id, language, source) VALUES ($1, $2, $3, $4, $5)",
    [id, userId, problemId, language, source],
  );
  return id;
}

export type LearningStatus = "exploring" | "practicing" | "confident";
export async function setLearningProgress(
  userId: string,
  conceptId: string,
  status: LearningStatus,
): Promise<void> {
  await databasePool().query(
    "INSERT INTO learning_progress (user_id, concept_id, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, concept_id) DO UPDATE SET status = excluded.status, updated_at = now()",
    [userId, conceptId, status],
  );
}

export interface DashboardData {
  problemsExplored: number;
  simulationsCompleted: number;
  recentRuns: Array<{
    id: string;
    problemId: string;
    eventCount: number;
    createdAt: Date;
  }>;
  savedInputs: Array<{
    id: string;
    problemId: string;
    name: string;
    input: unknown;
    createdAt: Date;
  }>;
  learning: Array<{ conceptId: string; status: LearningStatus }>;
}

export async function dashboardData(userId: string): Promise<DashboardData> {
  const [summary, runs, inputs, learning] = await Promise.all([
    databasePool().query(
      "SELECT count(*)::int AS problems_explored, coalesce(sum(simulation_count), 0)::int AS simulations_completed FROM problem_progress WHERE user_id = $1",
      [userId],
    ),
    databasePool().query(
      "SELECT id, problem_id, event_count, created_at FROM simulation_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
      [userId],
    ),
    databasePool().query(
      "SELECT id, problem_id, name, input, created_at FROM saved_inputs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId],
    ),
    databasePool().query(
      "SELECT concept_id, status FROM learning_progress WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId],
    ),
  ]);
  return {
    problemsExplored: summary.rows[0].problems_explored,
    simulationsCompleted: summary.rows[0].simulations_completed,
    recentRuns: runs.rows.map((row) => ({
      id: row.id,
      problemId: row.problem_id,
      eventCount: row.event_count,
      createdAt: row.created_at,
    })),
    savedInputs: inputs.rows.map((row) => ({
      id: row.id,
      problemId: row.problem_id,
      name: row.name,
      input: row.input,
      createdAt: row.created_at,
    })),
    learning: learning.rows.map((row) => ({
      conceptId: row.concept_id,
      status: row.status,
    })),
  };
}
