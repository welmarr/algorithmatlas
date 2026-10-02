# Email operations

Account links are committed to PostgreSQL together with their one-use token hash. Signup additionally commits the user in that transaction. The Web process never waits for SMTP. A separate worker sends messages:

```sh
pnpm email:worker
```

Provide DATABASE_URL, APP_URL and a stable random 32-byte hexadecimal EMAIL_OUTBOX_KEY. Generate a key with Node crypto.randomBytes(32).toString("hex"); store it in the deployment secret manager, never source control. Ciphertext uses AES-256-GCM and binds row ID, user ID, purpose and template version as authenticated context. Back up this key separately from database dumps. The token URL is encrypted until delivery; terminal rows erase the ciphertext. The account token itself remains only a hash.

## Transport

For a production SMTP service: SMTP_HOST, SMTP_PORT (587 by default), SMTP_USERNAME, SMTP_PASSWORD, MAIL_FROM_ADDRESS and optional MAIL_FROM_NAME. SMTP_USER remains an alias. Set SMTP_SECURE=true for implicit TLS (default port 465); otherwise STARTTLS is required. Certificate validation is mandatory; NODE_TLS_REJECT_UNAUTHORIZED=0 is rejected. No provider SDK, paid service or provider account is required for local acceptance.

EMAIL_TRANSPORT=mailpit permits plaintext only to localhost, 127.0.0.1 or the compose service mailpit. It is a development/test transport. The generic adapter is tested through Mailpit; no real production mailbox/domain or deliverability claim has been verified. Configure SPF, DKIM, DMARC, bounce monitoring and provider credentials before production.

## Delivery semantics

Workers claim one row with FOR UPDATE SKIP LOCKED, a 60-second lease and a unique claim ID. EMAIL_MAX_ATTEMPTS selects 1–5 attempts (default five); transient failures retry after 5, 10, 20 and 40 seconds. Authentication/permanent SMTP rejection dead-letters immediately. A worker restart reclaims an expired lease; each attempt uses the same Message-ID and token. Replacement requests invalidate the older token and cancel its pending message.

SMTP is at-least-once: a crash after server acceptance but before the database commit can deliver the same message again. Stable Message-ID helps receiving systems but cannot guarantee deduplication. The one-use token and five-attempt ceiling bound the consequences. A send already in progress can complete during account deletion or link replacement; its invalidated token cannot authorize an action.

OUTGOING_EMAIL_ENABLED=false or `pnpm ops:control email_paused on` pauses delivery without losing pending links. Resume with the switch off. Dead letters are not automatically replayed: fix the transport and have the user request a fresh link. This avoids replaying expired credentials.

The worker updates a heartbeat. Readiness checks freshness within 30 seconds; SMTP reachability is observed through delivery outcomes, not a synchronous health email. `pnpm ops:status` reports counts without recipients, tokens or payloads. Logs contain only row ID, attempt and bounded error category. Default terminal metadata retention is seven days. Schedule `pnpm db:prune`; see RETENTION.md.

## Evidence

Tests cover authenticated encryption/context tampering, transport TLS restrictions, transactional signup/replacement, concurrent claiming, lease recovery, consumed-token rejection, actual unreachable SMTP then a fresh worker delivering through Mailpit, five-attempt dead letter, heartbeat expiry and account deletion. Browser tests cover verification and password reset. Final audit records final gate counts.

Adapter reference: [Nodemailer SMTP transport](https://nodemailer.com/smtp).
