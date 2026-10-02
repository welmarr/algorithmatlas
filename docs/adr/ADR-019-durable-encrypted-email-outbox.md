# ADR 019 — Durable encrypted account email

Status: accepted for the production-operations candidate.

SMTP inside a request makes account consistency depend on transport availability; fire-and-forget callbacks lose work on process death. Commit the user, token hash and AES-GCM encrypted outbox payload atomically. Use PostgreSQL transactional claims, sixty-second leases, five bounded attempts and a separate worker. Stable Message-ID and one-use tokens limit duplicate effects; SMTP remains at-least-once. Erase encrypted links at terminal states; retain metadata seven days. Generic SMTP requires TLS; Mailpit is the local acceptance transport. No third-party queue is required.
