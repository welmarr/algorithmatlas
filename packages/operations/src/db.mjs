import pg from "pg";
let pool;
export function createOperationsPool(connectionString) {
  const created = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  });
  // Never let an idle-client error serialize a PoolClient and its credentials.
  created.on("error", () =>
    console.error(JSON.stringify({ event: "database-connection-unavailable" })),
  );
  return created;
}
export function operationsPool() {
  if (!process.env.DATABASE_URL)
    throw new Error("OPERATIONS_DATABASE_REQUIRED");
  return (pool ??= createOperationsPool(process.env.DATABASE_URL));
}
export async function transaction(pool, action) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
export const controlNames = [
  "python_disabled",
  "python_guest_disabled",
  "python_verified_disabled",
  "runner_paused",
  "email_paused",
  "signup_disabled",
];
export async function controls(pool = operationsPool()) {
  const result = await pool.query(
    "SELECT name, enabled FROM operational_controls",
  );
  return Object.fromEntries(result.rows.map((row) => [row.name, row.enabled]));
}
export async function setControl(name, enabled, pool = operationsPool()) {
  if (!controlNames.includes(name) || typeof enabled !== "boolean")
    throw new Error("INVALID_CONTROL");
  await pool.query(
    "INSERT INTO operational_controls(name,enabled) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET enabled=$2,updated_at=now()",
    [name, enabled],
  );
}
const metricNames = new Set([
  "submitted",
  "completed",
  "failed",
  "cancelled",
  "timeouts",
  "memory_limit",
  "output_limit",
  "trace_limit",
  "policy_rejected",
  "rate_rejected",
  "queue_rejected",
  "queue_wait_ms",
  "execution_ms",
  "cleanup_ms",
  "result_bytes",
  "email_sent",
  "email_retry",
  "email_failed",
]);
export async function metric(name, value = 1, pool = operationsPool()) {
  if (!metricNames.has(name) || !Number.isFinite(value) || value < 0)
    throw new Error("INVALID_METRIC");
  await pool.query(
    "INSERT INTO operational_metrics(day,name,value) VALUES(current_date,$1,$2) ON CONFLICT(day,name) DO UPDATE SET value=operational_metrics.value+$2",
    [name, Math.round(value)],
  );
}
export async function consumeQuota(client, key, limit, seconds) {
  if (
    !/^[a-f0-9]{64}$/.test(key) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100000 ||
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > 86400
  )
    throw new Error("INVALID_QUOTA");
  const result = await client.query(
    `INSERT INTO rate_limits(key_hash,window_end,attempts) VALUES($1,now()+($2::int*interval '1 second'),1)
    ON CONFLICT(key_hash) DO UPDATE SET
    attempts=CASE WHEN rate_limits.window_end<=now() THEN 1 ELSE LEAST(rate_limits.attempts+1,$3::int+1) END,
    window_end=CASE WHEN rate_limits.window_end<=now() THEN now()+($2::int*interval '1 second') ELSE rate_limits.window_end END
    RETURNING attempts<=$3::int AS allowed, GREATEST(1,ceil(extract(epoch FROM window_end-now())))::int AS retry_after`,
    [key, seconds, limit],
  );
  return result.rows[0];
}
