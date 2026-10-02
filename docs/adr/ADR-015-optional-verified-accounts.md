# ADR 015 — Optional verified accounts

Status: accepted.

Keep anonymous learning and execution independent of account storage. PostgreSQL persists verified user saves and hashed sessions/tokens; migrations extend the existing schema without deleting older data. Transactional one-use links and session revocation protect password changes.

Use local Mailpit for reproducible verification/reset tests. Real SMTP is server-configured and TLS-required. Link fragments avoid token-bearing request URLs. Forgotten-password mail delivery runs after an identical response; a durable outbox remains a public deployment gate.

Use scrypt with OWASP parameters and a small derivation concurrency bound. Retain legacy hash verification to avoid locking out existing users. Keep structured errors and logs free of credential material.

Browser drafts are per-tab sessionStorage, so moving through registration does not discard input/code. They are explicitly temporary and separate from verified durable saves.
