# ADR 017 — Durable bounded public runner and capability model

Status: accepted for the production candidate; supersedes the local in-memory public-path limitation of ADR 016.

Use PostgreSQL already required for durable accounts. Admission locks global quota/capacity decisions; SKIP LOCKED claims jobs; a session advisory lock elects one worker per queue database with at most two active containers. Keep the in-memory runner only as a database-free local fallback. Public mode always requires PostgreSQL and a successful isolation preflight.

Do not retry started jobs after a crash. Clean the recorded container, report interruption and let the user rerun. Bind a queue to its Docker runtime identity so a new machine cannot silently assume old containers were cleaned. Fail closed when cleanup or the database fails.

Use scoped expiring idempotency keys and independent HMAC-derived random job capabilities, storing only hashes. Require the capability and current client/owner context for poll/cancel. Clear source/input promptly; retain bounded results for five minutes. This avoids a plaintext capability store while supporting retry recovery with a stable secret.

This simple single-leader design trades horizontal compute scale for auditable capacity/recovery behavior. A stronger multi-host fencing design is required before distributed workers are introduced.
