# PostgreSQL backup and restore

The tools use native pg_dump custom archives and pg_restore in a single transaction. No ad-hoc JSON export substitutes for a database backup.

```sh
# DATABASE_URL identifies the source; file must not already exist.
pnpm db:backup /secure-backups/atlas-2026-10-02.dump
# Point DATABASE_URL to a separately created EMPTY target database.
pnpm db:restore /secure-backups/atlas-2026-10-02.dump
```

Install PostgreSQL client tools matching the server major version (tested: 16). PG_DUMP_BIN and PG_RESTORE_BIN may select installed binaries. Alternatively, explicitly choose a PostgreSQL tools container with PG_TOOLS_CONTAINER. This runs the native tools via docker exec; its default connection is that container's 127.0.0.1:5432. PG_TOOLS_HOST/PG_TOOLS_PORT can select an operator-approved target. Credentials are passed as environment variables, never command-line URL or printed output. Only the backup operator needs Docker access; the Web application does not.

Dump output is exclusive-create with mode 0600 where the OS supports it; apply restrictive Windows ACLs on Windows. Restore refuses an existing application schema/table before executing. Keep the destination offline and dedicated during restore; the empty-database check assumes another operator is not concurrently creating objects there. Native restore uses --single-transaction --exit-on-error --no-owner --no-privileges. Provision the destination role/privileges separately. Never restore an untrusted archive.

## Drill

`pnpm verify:prod-ops` creates fresh source and empty destination databases, applies current migrations to the source, seeds only test identities, runs a native backup/restore, and checks migration versions, scrypt password verification, hashed sessions, foreign-key ownership, saved inputs, simulation runs, progress and Python workspaces. It also proves a nonempty target is refused. Both databases and temporary dump are removed. No active local user database is used.

## Recovery runbook

1. Disable public execution, signup and outgoing email; stop Web, runner and email worker. Preserve sanitized incident evidence.
2. Create a new empty database on a supported PostgreSQL server. Restore the trusted archive with the application still offline.
3. Restore the encryption key from its separately controlled backup. Without it, cancel old encrypted messages and issue fresh links after recovery.
4. Revoke restored sessions and invalidate account tokens unless a reviewed recovery plan explicitly permits them. Reset queued/running jobs: never rerun a restored execution automatically. The runner must remove recorded orphan containers on the same runtime; changing runtime requires an explicit drained migration.
5. Apply newer migrations only after validating the restored schema. Run readiness, operations status and critical account/runner checks with public exposure off.
6. Switch the application database secret to the restored target, restart services, verify ownership and monitor; then deliberately reopen approved features.

Backups contain personal data, source and credential hashes. Encrypt archives at rest using the organization's approved storage encryption, restrict access, protect keys separately, and transport over TLS/SSH. These scripts do not supply an encryption/storage service. Configure daily backups, keep seven daily and four weekly encrypted copies as a starting policy, and document a deletion schedule. Operator backup expiration is distinct from live-record retention and account deletion. Drill at least monthly and after schema/runtime changes. RPO/RTO depend on the actual backup frequency and measured deployment drill; no production SLA is claimed.

Native-tool reference: [PostgreSQL 16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) and [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).
