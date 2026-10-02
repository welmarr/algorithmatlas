# Backup / restore / retention evidence

## Actual native restore drill: PASS

Tooling uses pg_dump custom format and pg_restore --single-transaction --exit-on-error --no-owner --no-privileges. Passwords are passed through process environment, not shell arguments or reports. Local PostgreSQL clients or an explicitly named PG_TOOLS_CONTAINER are supported. A nonempty restore target is refused.

Commands:

```sh
pnpm db:backup /operator/secure/location/database.dump
pnpm db:restore /operator/secure/location/database.dump
```

Set DATABASE_URL to the source for backup and a new empty target for restore. The acceptance test calls the same backupDatabase/restoreDatabase implementation with two independently created databases. It applies migrations 001–006 to the source, inserts sanitized user/password/session/saved-input/run/progress/Python-workspace data, dumps, restores and validates seven tables, six migration records, password verification, session ownership and foreign-key enforcement.

Measured drill on this host: **34,495 bytes**, **1,243 ms backup**, **1,289 ms restore**. These are tiny-fixture timings, not production RPO/RTO claims. Both drill databases and the temporary archive were removed in finally. This drill is included in full and prod-ops verification and was also run with verbose output to record timings.

## Retention

pnpm db:prune processes bounded batches (default 500, maximum 1000) with SKIP LOCKED. It removes expired sessions, consumed/expired token hashes, old quota buckets, expired execution results/capabilities/idempotency metadata, terminal outbox rows and old metrics. Source/input are cleared at terminal execution or queue expiration; orphan running IDs are retained until cleanup. Saved user work is preserved until explicit item/account deletion.

Default terminal execution retention: five minutes, configurable up to fifteen. Queue deadline: fifteen seconds, maximum thirty. Terminal email metadata: seven days, configurable 1–30. Aggregate metrics: thirty days. Periodic pruning is required when workers are stopped.

Production backup archives must be encrypted and stored with restricted access, separate key backup and a documented expiry/restore schedule. This tool does not itself encrypt archives or rewrite offline backups after account deletion. Actual production backup storage, alerting and larger restore drills remain deployment gates.
