import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  operationsPool,
  transaction,
  controls,
  consumeQuota,
  metric,
} from "./db.mjs";
import { queueConfig, secret } from "./config.mjs";
import { constantEqual } from "./http-policy.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export class OperationsError extends Error {
  constructor(code, status = 400, retryAfter = 0) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function validateJob(request, actor) {
  if (
    !request ||
    request.schemaVersion !== "0.1" ||
    typeof request.source !== "string" ||
    !request.source.trim() ||
    request.source.length > 4096
  )
    throw new OperationsError("PYTHON_POLICY_REJECTED");
  if (
    JSON.stringify(request.input) === undefined ||
    Buffer.byteLength(JSON.stringify(request.input)) > 16384 ||
    Buffer.byteLength(JSON.stringify(request)) > 24576
  )
    throw new OperationsError("PYTHON_POLICY_REJECTED");
  if (
    !actor ||
    !["clientHash", "ipHash"].every((name) =>
      /^[a-f0-9]{64}$/.test(actor[name] ?? ""),
    ) ||
    typeof actor.verified !== "boolean"
  )
    throw new OperationsError("PYTHON_POLICY_REJECTED");
  if (actor.ownerId !== null && !/^[a-f0-9-]{36}$/.test(actor.ownerId ?? ""))
    throw new OperationsError("PYTHON_POLICY_REJECTED");
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(actor.idempotencyKey ?? ""))
    throw new OperationsError("PYTHON_POLICY_REJECTED");
}
export class ExecutionStore {
  constructor({
    pool = operationsPool(),
    env = process.env,
    config = queueConfig(env),
  } = {}) {
    this.pool = pool;
    this.env = env;
    this.config = config;
    this.key = secret("EXECUTION_CAPABILITY_KEY", env);
  }
  capability(id) {
    return createHmac("sha256", Buffer.from(this.key, "hex"))
      .update("execution-capability:" + id)
      .digest("base64url");
  }
  async submit(request, actor) {
    validateJob(request, actor);
    const c = this.config,
      idempotencyHash = hash(actor.idempotencyKey),
      requestHash = hash(
        JSON.stringify({ source: request.source, input: request.input }),
      );
    const outcome = await transaction(this.pool, async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(71420301)");
      const flags = await controls(db);
      if (
        flags.python_disabled ||
        flags[
          actor.verified ? "python_verified_disabled" : "python_guest_disabled"
        ]
      )
        return { error: "PYTHON_DISABLED", status: 503 };
      if (actor.ownerId) {
        const user = await db.query(
          "SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id=$1",
          [actor.ownerId],
        );
        if (!user.rowCount || user.rows[0].verified !== actor.verified)
          return { error: "PYTHON_POLICY_REJECTED", status: 403 };
      } else if (actor.verified)
        return { error: "PYTHON_POLICY_REJECTED", status: 403 };
      const prior = await db.query(
        "SELECT id,status,request_hash,capability_hash FROM execution_jobs WHERE client_hash=$1 AND idempotency_hash=$2 AND expires_at>now()",
        [actor.clientHash, idempotencyHash],
      );
      if (prior.rowCount) {
        const row = prior.rows[0],
          capability = this.capability(row.id);
        if (row.request_hash !== requestHash)
          return { error: "PYTHON_IDEMPOTENCY_CONFLICT", status: 409 };
        if (!constantEqual(row.capability_hash, hash(capability)))
          return { error: "PYTHON_JOB_NOT_FOUND", status: 404 };
        return { id: row.id, status: row.status, capability, reused: true };
      }
      await db.query(
        "DELETE FROM execution_jobs WHERE client_hash=$1 AND idempotency_hash=$2 AND expires_at<=now() AND status IN ('completed','failed','cancelled')",
        [actor.clientHash, idempotencyHash],
      );
      const depth = (
        await db.query(
          `SELECT count(*)::int AS total,
        count(*) FILTER(WHERE status='queued')::int AS queued,
        count(*) FILTER(WHERE status IN ('queued','running','cancelling') AND client_hash=$1)::int AS own
        FROM execution_jobs`,
          [actor.clientHash],
        )
      ).rows[0];
      if (
        depth.total >= 512 ||
        depth.queued >= c.queueSize ||
        depth.own >= (actor.verified ? c.verifiedQueued : c.guestQueued)
      )
        return { error: "PYTHON_QUEUE_FULL", status: 429, retryAfter: 2 };
      const prefix = actor.verified ? "verified" : "guest";
      const quotas = [
        ["global-minute", c.globalMinute, 60],
        ["global-day", c.globalDay, 86400],
        ["ip-minute:" + actor.ipHash, c.ipMinute, 60],
        ["ip-hour:" + actor.ipHash, c.ipHour, 3600],
        ["ip-day:" + actor.ipHash, c.ipDay, 86400],
        ["client-minute:" + actor.clientHash, c[prefix + "Minute"], 60],
        ["client-hour:" + actor.clientHash, c[prefix + "Hour"], 3600],
        ["client-day:" + actor.clientHash, c[prefix + "Day"], 86400],
      ];
      for (const [subject, limit, seconds] of quotas) {
        const quota = await consumeQuota(
          db,
          hash("python:" + subject),
          limit,
          seconds,
        );
        if (!quota.allowed)
          return {
            error: "PYTHON_RATE_LIMITED",
            status: 429,
            retryAfter: quota.retry_after,
          };
      }
      const id = randomUUID(),
        capability = this.capability(id);
      await db.query(
        `INSERT INTO execution_jobs(id,capability_hash,owner_user_id,client_hash,ip_hash,idempotency_hash,request_hash,status,source,input,expires_at,queue_deadline)
        VALUES($1,$2,$3,$4,$5,$6,$7,'queued',$8,$9,now()+($10::int*interval '1 millisecond'),now()+($11::int*interval '1 millisecond'))`,
        [
          id,
          hash(capability),
          actor.ownerId,
          actor.clientHash,
          actor.ipHash,
          idempotencyHash,
          requestHash,
          request.source,
          JSON.stringify(request.input),
          c.retentionMs + c.queueWaitMs + 15000,
          c.queueWaitMs,
        ],
      );
      return { id, capability, status: "queued", reused: false };
    });
    if (outcome.error) {
      if (outcome.error === "PYTHON_RATE_LIMITED")
        await metric("rate_rejected", 1, this.pool);
      if (outcome.error === "PYTHON_QUEUE_FULL")
        await metric("queue_rejected", 1, this.pool);
      throw new OperationsError(
        outcome.error,
        outcome.status,
        outcome.retryAfter,
      );
    }
    if (!outcome.reused) await metric("submitted", 1, this.pool);
    return outcome;
  }
  async endpointQuota(actor, action) {
    if (
      !actor ||
      !["clientHash", "ipHash"].every((name) =>
        /^[a-f0-9]{64}$/.test(actor[name] ?? ""),
      )
    )
      throw new OperationsError("PYTHON_POLICY_REJECTED");
    const limit =
      action === "cancel" ? this.config.cancelMinute : this.config.pollMinute;
    for (const subject of [actor.clientHash, actor.ipHash]) {
      const quota = await consumeQuota(
        this.pool,
        hash("python-" + action + ":" + subject),
        limit,
        60,
      );
      if (!quota.allowed) {
        await metric("rate_rejected", 1, this.pool);
        throw new OperationsError(
          "PYTHON_RATE_LIMITED",
          429,
          quota.retry_after,
        );
      }
    }
  }
  async access(id, capability, actor, action = "poll") {
    await this.endpointQuota(actor, action);
    if (
      !/^[a-f0-9-]{36}$/.test(id) ||
      !/^[A-Za-z0-9_-]{43}$/.test(capability ?? "")
    )
      return null;
    const found = await this.pool.query(
      "SELECT * FROM execution_jobs WHERE id=$1 AND expires_at>now()",
      [id],
    );
    const row = found.rows[0];
    if (
      !row ||
      !constantEqual(row.capability_hash, hash(capability)) ||
      row.client_hash !== actor.clientHash ||
      (row.owner_user_id && row.owner_user_id !== actor.ownerId)
    )
      return null;
    if (action === "cancel") {
      const changed = await this.pool.query(
        `UPDATE execution_jobs SET cancel_requested_at=now(),
        status=CASE WHEN status='queued' THEN 'cancelled' WHEN status='running' THEN 'cancelling' ELSE status END,
        termination_reason=CASE WHEN status='queued' THEN 'PYTHON_CANCELLED' ELSE termination_reason END,
        finished_at=CASE WHEN status='queued' THEN now() ELSE finished_at END,
        source=CASE WHEN status='queued' THEN NULL ELSE source END,
        input=CASE WHEN status='queued' THEN NULL ELSE input END
        WHERE id=$1 RETURNING *`,
        [id],
      );
      if (row.status === "queued" && changed.rows[0]?.status === "cancelled")
        await metric("cancelled", 1, this.pool);
      return this.view(changed.rows[0]);
    }
    return this.view(row);
  }
  view(row) {
    return row
      ? {
          id: row.id,
          status: row.status,
          code: row.termination_reason ?? undefined,
          errorLine: row.error_line ?? undefined,
          result: row.result ?? undefined,
        }
      : null;
  }
  async claim({ allowGuest = true, allowVerified = true } = {}) {
    return transaction(this.pool, async (db) => {
      const flags = await controls(db);
      if (flags.runner_paused || flags.python_disabled) return null;
      const found = await db.query(
        "SELECT j.* FROM execution_jobs j WHERE status='queued' AND queue_deadline>now() AND CASE WHEN EXISTS(SELECT 1 FROM users u WHERE u.id=j.owner_user_id AND u.email_verified_at IS NOT NULL) THEN $1::boolean ELSE $2::boolean END ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1",
        [
          allowVerified && !flags.python_verified_disabled,
          allowGuest && !flags.python_guest_disabled,
        ],
      );
      if (!found.rowCount) return null;
      const row = found.rows[0];
      await db.query(
        "UPDATE execution_jobs SET status='running',started_at=now(),attempt_count=1 WHERE id=$1",
        [row.id],
      );
      return row;
    });
  }
  async expireQueued() {
    const result = await this.pool
      .query(`UPDATE execution_jobs SET status='failed',termination_reason='PYTHON_TIMEOUT',finished_at=now(),source=NULL,input=NULL
      WHERE status='queued' AND queue_deadline<=now() RETURNING id`);
    if (result.rowCount) {
      await metric("failed", result.rowCount, this.pool);
      await metric("timeouts", result.rowCount, this.pool);
    }
  }
  async finish(
    id,
    {
      status,
      code,
      result,
      errorLine,
      durationMs = 0,
      cleanupMs = 0,
      waitMs = 0,
    },
  ) {
    if (result && Buffer.byteLength(JSON.stringify(result)) > 262144)
      throw new OperationsError("PYTHON_OUTPUT_LIMIT");
    const updated = await this.pool.query(
      `UPDATE execution_jobs SET
      status=CASE WHEN cancel_requested_at IS NOT NULL THEN 'cancelled' ELSE $2 END,
      termination_reason=CASE WHEN cancel_requested_at IS NOT NULL THEN 'PYTHON_CANCELLED' ELSE $3 END,
      result=CASE WHEN cancel_requested_at IS NOT NULL THEN NULL ELSE $4::jsonb END,error_line=$5,
      source=NULL,input=NULL,finished_at=now(),expires_at=now()+($6::int*interval '1 millisecond')
      WHERE id=$1 RETURNING status,termination_reason`,
      [
        id,
        status,
        code ?? null,
        result ? JSON.stringify(result) : null,
        errorLine ?? null,
        this.config.retentionMs,
      ],
    );
    if (!updated.rowCount) return;
    const row = updated.rows[0];
    await metric(row.status, 1, this.pool);
    const reasons = {
      PYTHON_TIMEOUT: "timeouts",
      PYTHON_MEMORY_LIMIT: "memory_limit",
      PYTHON_OUTPUT_LIMIT: "output_limit",
      PYTHON_TRACE_LIMIT: "trace_limit",
      PYTHON_POLICY_REJECTED: "policy_rejected",
    };
    if (reasons[row.termination_reason])
      await metric(reasons[row.termination_reason], 1, this.pool);
    for (const [name, value] of [
      ["execution_ms", durationMs],
      ["cleanup_ms", cleanupMs],
      ["queue_wait_ms", waitMs],
      ["result_bytes", result ? Buffer.byteLength(JSON.stringify(result)) : 0],
    ])
      await metric(name, value, this.pool);
  }
  async metrics() {
    const state = await this.pool.query(
      "SELECT status,count(*)::int AS count FROM execution_jobs GROUP BY status",
    );
    const counts = await this.pool.query(
      "SELECT name,sum(value)::float8 AS value FROM operational_metrics WHERE day>=current_date-7 GROUP BY name",
    );
    return {
      states: Object.fromEntries(state.rows.map((r) => [r.status, r.count])),
      counters: Object.fromEntries(counts.rows.map((r) => [r.name, r.value])),
    };
  }
}
