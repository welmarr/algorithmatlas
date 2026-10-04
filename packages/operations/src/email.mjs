import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import nodemailer from "nodemailer";
import { operationsPool, transaction, controls, metric } from "./db.mjs";
import { appOrigin, secret, integer } from "./config.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const aad = (row) =>
  Buffer.from(row.id + ":" + row.user_id + ":" + row.purpose + ":1");
export function sealEmail(payload, row, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(aad(row));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((x) => x.toString("base64url"))
    .join(".");
}
export function openEmail(value, row, key) {
  const [iv, tag, data] = value
    .split(".")
    .map((x) => Buffer.from(x, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(aad(row));
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
  );
}
export function smtpConfig(env = process.env) {
  const local = env.EMAIL_TRANSPORT === "mailpit";
  if (!env.SMTP_HOST || !/^[a-zA-Z0-9.:-]+$/.test(env.SMTP_HOST))
    throw new Error("SMTP_CONFIG_INVALID");
  if (local && !["localhost", "127.0.0.1", "mailpit"].includes(env.SMTP_HOST))
    throw new Error("SMTP_LOCAL_HOST_REQUIRED");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0")
    throw new Error("SMTP_TLS_REQUIRED");
  const secure = env.SMTP_SECURE === "true";
  if (!local && env.SMTP_STARTTLS === "false" && !secure)
    throw new Error("SMTP_TLS_REQUIRED");
  const user = env.SMTP_USERNAME ?? env.SMTP_USER;
  if ((user && !env.SMTP_PASSWORD) || (!user && env.SMTP_PASSWORD))
    throw new Error("SMTP_AUTH_INVALID");
  const address =
    env.MAIL_FROM_ADDRESS ??
    (local ? "accounts@algorithmatlas.test" : undefined);
  if (!address || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address))
    throw new Error("SMTP_SENDER_REQUIRED");
  const name = env.MAIL_FROM_NAME ?? "Algorithm Atlas";
  if (/[\r\n]/.test(name) || name.length > 128)
    throw new Error("SMTP_SENDER_INVALID");
  return {
    options: {
      host: env.SMTP_HOST,
      port: integer(
        env,
        "SMTP_PORT",
        local ? 1025 : secure ? 465 : 587,
        1,
        65535,
      ),
      secure,
      requireTLS: !local && !secure,
      ignoreTLS: local,
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      auth: user ? { user, pass: env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    },
    from: { name, address },
  };
}
export function emailReadyConfig(env = process.env) {
  try {
    appOrigin(env);
    secret("EMAIL_OUTBOX_KEY", env);
    smtpConfig(env);
    return true;
  } catch {
    return false;
  }
}
function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
}
export function renderAccountEmail(purpose, url) {
  if (!["verify", "reset"].includes(purpose))
    throw new Error("EMAIL_TEMPLATE_INVALID");
  const verify = purpose === "verify";
  const title = verify ? "Verify your email" : "Reset your password";
  const description = verify
    ? "Verify your email to save your work. This link expires in 24 hours."
    : "Choose a new password. This link expires in 30 minutes. All existing sessions will be signed out.";
  return {
    subject: title + " — Algorithm Atlas",
    text:
      title +
      "\n\n" +
      description +
      "\n\n" +
      url +
      "\n\nIf you did not request this, ignore this email.",
    html:
      '<!doctype html><html lang="en"><body style="margin:0;background:#f3f6f4;color:#102b2b;font-family:Arial,sans-serif"><main style="max-width:560px;margin:40px auto;padding:32px;background:white;border:1px solid #d3dfda;border-radius:12px"><p style="font-size:12px;letter-spacing:2px;color:#00756a">ALGORITHM ATLAS</p><h1>' +
      title +
      '</h1><p style="line-height:1.7">' +
      description +
      '</p><p style="margin:32px 0"><a style="display:inline-block;background:#00756a;color:white;padding:14px 20px;border-radius:6px;text-decoration:none" href="' +
      escapeHtml(url) +
      '">' +
      title +
      '</a></p><p style="font-size:14px;line-height:1.6;color:#52696a">If you did not request this, ignore this email. You can always explore and simulate without an account.</p></main></body></html>',
  };
}
export class EmailStore {
  constructor({ pool = operationsPool(), env = process.env } = {}) {
    this.pool = pool;
    this.env = env;
    this.key = secret("EMAIL_OUTBOX_KEY", env);
    this.origin = appOrigin(env);
    this.maxAttempts = integer(env, "EMAIL_MAX_ATTEMPTS", 5, 1, 5);
  }
  async enqueueOn(client, user, purpose) {
    if (!["verify", "reset"].includes(purpose))
      throw new Error("EMAIL_PURPOSE_INVALID");
    await client.query("SELECT pg_advisory_xact_lock(71420303)");
    const count = await client.query(
      "SELECT count(*)::int AS n FROM email_outbox WHERE status IN ('pending','retry','processing')",
    );
    if (count.rows[0].n >= 10000) throw new Error("EMAIL_QUEUE_FULL");
    const locked = await client.query(
      "SELECT id FROM users WHERE id=$1 FOR UPDATE",
      [user.id],
    );
    if (!locked.rowCount) throw new Error("ACCOUNT_NOT_FOUND");
    // The token and outbox row commit together. Replacements invalidate old links.
    await client.query(
      "UPDATE account_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
      [user.id, purpose],
    );
    await client.query(
      "UPDATE email_outbox SET status='cancelled',encrypted_payload=NULL,finished_at=now() WHERE user_id=$1 AND purpose=$2 AND status IN ('pending','retry','processing')",
      [user.id, purpose],
    );
    const token = randomBytes(32).toString("base64url"),
      tokenHash = hash(token);
    const expires = new Date(
      Date.now() + (purpose === "verify" ? 86400 : 1800) * 1000,
    );
    await client.query(
      "INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,$4)",
      [tokenHash, user.id, purpose, expires],
    );
    const row = { id: randomUUID(), user_id: user.id, purpose };
    const url = new URL(
      purpose === "verify"
        ? "/account/verify-email"
        : "/account/reset-password",
      this.origin,
    );
    url.hash = new URLSearchParams({ token }).toString();
    await client.query(
      "INSERT INTO email_outbox(id,user_id,purpose,recipient,token_hash,encrypted_payload,dedupe_key) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        row.id,
        user.id,
        purpose,
        user.email,
        tokenHash,
        sealEmail({ url: url.toString() }, row, this.key),
        hash(user.id + ":" + purpose + ":" + tokenHash),
      ],
    );
    return row.id;
  }
  async enqueue(user, purpose) {
    return transaction(this.pool, (client) =>
      this.enqueueOn(client, user, purpose),
    );
  }
  async register(email, displayName, passwordHash) {
    return transaction(this.pool, async (client) => {
      if ((await controls(client)).signup_disabled)
        throw new Error("SIGNUP_DISABLED");
      const user = {
        id: randomUUID(),
        email,
        displayName,
        passwordHash,
        emailVerified: false,
      };
      await client.query(
        "INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)",
        [user.id, email, displayName, passwordHash],
      );
      await this.enqueueOn(client, user, "verify");
      return user;
    });
  }
  async claim() {
    return transaction(this.pool, async (client) => {
      if (
        this.env.OUTGOING_EMAIL_ENABLED === "false" ||
        (await controls(client)).email_paused
      )
        return null;
      const exhausted = await client.query(
        "UPDATE email_outbox SET status='failed',encrypted_payload=NULL,finished_at=now(),last_error_code='EMAIL_ATTEMPTS_EXHAUSTED' WHERE id IN (SELECT id FROM email_outbox WHERE attempt_count>=$1 AND (status IN ('pending','retry') OR (status='processing' AND lease_until<now())) LIMIT 100 FOR UPDATE SKIP LOCKED)",
        [this.maxAttempts],
      );
      if (exhausted.rowCount)
        await metric("email_failed", exhausted.rowCount, client);
      const result = await client.query(
        "SELECT * FROM email_outbox WHERE ((status IN ('pending','retry') AND available_at<=now()) OR (status='processing' AND lease_until<now())) AND attempt_count<$1 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
        [this.maxAttempts],
      );
      if (!result.rowCount) return null;
      const row = result.rows[0],
        claim = randomUUID();
      await client.query(
        "UPDATE email_outbox SET status='processing',attempt_count=attempt_count+1,last_attempt_at=now(),lease_until=now()+interval '60 seconds',claim_id=$2 WHERE id=$1",
        [row.id, claim],
      );
      return { ...row, claim_id: claim, attempt_count: row.attempt_count + 1 };
    });
  }
  async deliver(row, transport) {
    const valid = await this.pool.query(
      "SELECT 1 FROM email_outbox e JOIN account_tokens t ON t.token_hash=e.token_hash WHERE e.id=$1 AND e.claim_id=$2 AND e.status='processing' AND t.consumed_at IS NULL AND t.expires_at>now()",
      [row.id, row.claim_id],
    );
    if (!valid.rowCount) {
      await this.finish(row, "cancelled");
      return "cancelled";
    }
    try {
      const { url } = openEmail(row.encrypted_payload, row, this.key);
      const parsed = new URL(url);
      if (
        parsed.origin !== this.origin ||
        ![
          "/account/verify",
          "/account/reset",
          "/account/verify-email",
          "/account/reset-password",
        ].includes(parsed.pathname)
      )
        throw new Error("EMAIL_PAYLOAD_INVALID");
      const { from } = smtpConfig(this.env);
      await transport.sendMail({
        ...renderAccountEmail(row.purpose, url),
        from,
        to: row.recipient,
        messageId: "<" + row.id + "@" + new URL(this.origin).hostname + ">",
      });
      await this.finish(row, "sent");
      return "sent";
    } catch (error) {
      const permanent =
        error?.code === "EAUTH" ||
        Number(error?.responseCode) >= 500 ||
        /EMAIL_PAYLOAD|authenticate data/.test(error?.message ?? "");
      const terminal = permanent || row.attempt_count >= this.maxAttempts;
      const delay = Math.min(3600, 5 * 2 ** (row.attempt_count - 1));
      await transaction(this.pool, async (client) => {
        const updated = await client.query(
          "UPDATE email_outbox SET status=$3,encrypted_payload=CASE WHEN $4::boolean THEN NULL ELSE encrypted_payload END,finished_at=CASE WHEN $4::boolean THEN now() ELSE NULL END,available_at=now()+($5::int*interval '1 second'),lease_until=NULL,claim_id=NULL,last_error_code=$6 WHERE id=$1 AND claim_id=$2 AND status='processing'",
          [
            row.id,
            row.claim_id,
            terminal ? "failed" : "retry",
            terminal,
            delay,
            permanent
              ? "EMAIL_DELIVERY_REJECTED"
              : "EMAIL_DELIVERY_UNAVAILABLE",
          ],
        );
        if (updated.rowCount)
          await metric(terminal ? "email_failed" : "email_retry", 1, client);
      });
      console.warn(
        JSON.stringify({
          event: "email-delivery",
          id: row.id,
          status: terminal ? "failed" : "retry",
          attempt: row.attempt_count,
          ...(this.env.DISPOSABLE_VERIFICATION === "1"
            ? { errorCode: error?.code ?? error?.name ?? "UNKNOWN" }
            : {}),
        }),
      );
      return terminal ? "failed" : "retry";
    }
  }
  async finish(row, status) {
    await transaction(this.pool, async (client) => {
      const updated = await client.query(
        "UPDATE email_outbox SET status=$3,encrypted_payload=NULL,finished_at=now(),lease_until=NULL,claim_id=NULL WHERE id=$1 AND claim_id=$2 AND status='processing'",
        [row.id, row.claim_id, status],
      );
      if (updated.rowCount && status === "sent")
        await metric("email_sent", 1, client);
    });
  }
  async heartbeat(status) {
    await this.pool.query(
      "INSERT INTO service_heartbeats(name,status) VALUES('email',$1) ON CONFLICT(name) DO UPDATE SET status=$1,updated_at=now()",
      [status],
    );
  }
  async health() {
    const flags = await controls(this.pool);
    if (this.env.OUTGOING_EMAIL_ENABLED === "false" || flags.email_paused)
      return { ready: true, status: "paused" };
    const result = await this.pool.query(
      "SELECT status,updated_at>now()-interval '30 seconds' AS fresh FROM service_heartbeats WHERE name='email'",
    );
    const ready = !!result.rows[0]?.fresh && result.rows[0]?.status === "ready";
    return { ready, status: ready ? "ready" : "unavailable" };
  }
}
export class EmailWorker {
  constructor({ store = new EmailStore(), transport, intervalMs = 500 } = {}) {
    this.store = store;
    this.transport =
      transport ?? nodemailer.createTransport(smtpConfig(store.env).options);
    this.intervalMs = intervalMs;
    this.closed = false;
    this.pending = null;
  }
  async tick() {
    if (this.closed || this.pending) return;
    this.pending = (async () => {
      const paused =
        this.store.env.OUTGOING_EMAIL_ENABLED === "false" ||
        (await controls(this.store.pool)).email_paused;
      await this.store.heartbeat(paused ? "paused" : "ready");
      const row = await this.store.claim();
      if (row) await this.store.deliver(row, this.transport);
    })();
    try {
      await this.pending;
    } catch {
      console.error(JSON.stringify({ event: "email-worker-unavailable" }));
    } finally {
      this.pending = null;
    }
  }
  async start() {
    await this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    return this;
  }
  async close() {
    this.closed = true;
    clearInterval(this.timer);
    if (this.pending) await this.pending;
    this.transport.close?.();
    await this.store.heartbeat("stopped").catch(() => {});
  }
}
