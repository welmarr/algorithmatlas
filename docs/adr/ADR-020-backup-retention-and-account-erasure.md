# ADR 020 — Native backups, bounded retention and account erasure

Status: accepted for the production-operations candidate.

Use native PostgreSQL custom dumps and transactional restore into an empty offline target. Test restored credential hashes, ownership and durable learning data in a fresh database. Backup encryption/storage/expiry remain operator responsibilities and are explicitly separate from live retention.

Use bounded SKIP LOCKED retention batches and preserve orphan container identifiers until cleanup is confirmed. Explicit saved work is never silently aged out. Account deletion requires password reauthentication and exact confirmation, serializes against password reset, cascades saved data and cancels/redacts active executions. Aggregated metrics contain no user identity.
