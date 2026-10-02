# Production email and account operations

Migration 006 adds a PostgreSQL outbox. Signup commits user, one-use token hash and outbox row atomically. Link replacement invalidates the old token and cancels old pending delivery. The URL is encrypted with AES-256-GCM under independent EMAIL_OUTBOX_KEY, binding row/user/purpose/template as authenticated context. Terminal rows erase ciphertext.

A separate worker claims with SKIP LOCKED and a unique 60-second lease. Transient failures retry with bounded exponential backoff; EMAIL_MAX_ATTEMPTS permits 1–5 attempts, default five. Permanent SMTP/auth failures dead-letter. Expired leases are recoverable after restart, using the same Message-ID/token. Limits prevent restart storms and the active outbox is capped at 10,000 rows. Pending-token validity is checked before delivery.

SMTP supports provider-neutral host/port/auth/sender configuration, implicit TLS or mandatory STARTTLS and certificate validation. Explicit local Mailpit allows plaintext only for approved local hosts. The Web process does not wait for SMTP. Verification/reset flow messages retain generic account-existence responses and bounded resend guidance.

Seven focused tests cover TLS configuration, authenticated encryption/tampering, atomic signup/replacement, concurrent claims/lease recovery, expired/consumed links, unavailable SMTP followed by a new worker delivering through Mailpit, bounded/default/lowered retry budgets, exhausted-row retirement, heartbeat freshness and account deletion. Browser flows verify real received links, password reset/session revocation, ownership, saved-work restore and deletion.

SMTP remains at-least-once across a crash after acceptance and before database commit. A stable Message-ID cannot guarantee mailbox deduplication. An in-flight send may finish after link replacement/deletion, but its invalidated token cannot authorize an action. Production provider credentials, mailbox delivery, SPF/DKIM/DMARC, bounces and alerts remain operator work; no external mail was sent for acceptance.
