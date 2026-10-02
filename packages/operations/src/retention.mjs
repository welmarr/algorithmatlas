import { operationsPool, transaction } from "./db.mjs";
import { integer } from "./config.mjs";
export async function pruneOperations({
  pool = operationsPool(),
  env = process.env,
  batch = 500,
} = {}) {
  if (!Number.isInteger(batch) || batch < 1 || batch > 1000)
    throw new Error("RETENTION_BATCH_INVALID");
  const days = integer(env, "EMAIL_RETENTION_DAYS", 7, 1, 30);
  return transaction(pool, async (client) => {
    const counts = {};
    const erase = async (name, table, condition, args = []) => {
      const result = await client.query(
        "DELETE FROM " +
          table +
          " WHERE ctid IN (SELECT ctid FROM " +
          table +
          " WHERE " +
          condition +
          " LIMIT $1 FOR UPDATE SKIP LOCKED)",
        [batch, ...args],
      );
      counts[name] = result.rowCount;
    };
    await erase("sessions", "sessions", "expires_at<=now()");
    await erase(
      "accountTokens",
      "account_tokens",
      "expires_at<=now() OR consumed_at<now()-interval '1 day'",
    );
    await erase(
      "rateBuckets",
      "rate_limits",
      "window_end<now()-interval '1 day'",
    );
    const queued = await client.query(
      "UPDATE execution_jobs SET status='failed',source=NULL,input=NULL,result=NULL,termination_reason='PYTHON_TIMEOUT',finished_at=now() WHERE id IN (SELECT id FROM execution_jobs WHERE status='queued' AND (queue_deadline<now() OR expires_at<now()) LIMIT $1 FOR UPDATE SKIP LOCKED)",
      [batch],
    );
    counts.expiredQueued = queued.rowCount;
    // Keep orphan IDs until the trusted worker confirms container removal.
    const active = await client.query(
      "UPDATE execution_jobs SET status='cancelling',source=NULL,input=NULL,result=NULL,cancel_requested_at=coalesce(cancel_requested_at,now()) WHERE id IN (SELECT id FROM execution_jobs WHERE status IN ('running','cancelling') AND expires_at<now() AND (source IS NOT NULL OR input IS NOT NULL OR result IS NOT NULL OR status='running') LIMIT $1 FOR UPDATE SKIP LOCKED)",
      [batch],
    );
    counts.redactedActive = active.rowCount;
    await erase(
      "executionResults",
      "execution_jobs",
      "status IN ('completed','failed','cancelled') AND expires_at<now()",
    );
    const expired = await client.query(
      "UPDATE email_outbox e SET status='cancelled',encrypted_payload=NULL,finished_at=now(),lease_until=NULL,claim_id=NULL WHERE id IN (SELECT id FROM email_outbox WHERE status IN ('pending','retry','processing') AND NOT EXISTS(SELECT 1 FROM account_tokens t WHERE t.token_hash=email_outbox.token_hash AND t.expires_at>now() AND t.consumed_at IS NULL) LIMIT $1 FOR UPDATE SKIP LOCKED)",
      [batch],
    );
    counts.expiredEmails = expired.rowCount;
    await erase(
      "emailRecords",
      "email_outbox",
      "status IN ('sent','failed','cancelled') AND finished_at<now()-($2::int*interval '1 day')",
      [days],
    );
    await erase("metrics", "operational_metrics", "day<current_date-30");
    return counts;
  });
}
export async function operationsStatus(pool = operationsPool()) {
  const execution = await pool.query(
    "SELECT status,count(*)::int AS count FROM execution_jobs GROUP BY status",
  );
  const email = await pool.query(
    "SELECT status,count(*)::int AS count,coalesce(max(attempt_count),0) AS max_attempts FROM email_outbox GROUP BY status",
  );
  const heartbeat = await pool.query(
    "SELECT name,status,extract(epoch FROM now()-updated_at)::int AS age_seconds FROM service_heartbeats",
  );
  const flags = await pool.query(
    "SELECT name,enabled FROM operational_controls ORDER BY name",
  );
  const metrics = await pool.query(
    "SELECT name,sum(value)::text AS value FROM operational_metrics WHERE day>=current_date-7 GROUP BY name ORDER BY name",
  );
  return {
    execution: execution.rows,
    email: email.rows,
    heartbeat: heartbeat.rows,
    controls: flags.rows,
    metrics: metrics.rows,
  };
}
