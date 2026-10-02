# Backup, restore and retention checkpoint

Branch: feature/public-runner-prod-ops. Starting SHA: d66c0b9. Ending SHA: commit containing this checkpoint; resolved in final audit.

Implemented native PostgreSQL custom backup, transactional empty-database restore, bounded retention batches, aggregate status and incident-control CLI. Restore drill validates migration version, password verification, hashed sessions, saved inputs, simulation runs, progress, Python workspaces and foreign-key ownership in a fresh database. Nonempty destinations are rejected. Retention keeps orphan IDs for container cleanup and never silently ages out saved work.

## Evidence

Backup/retention tests: 2 passed. Included in isolated verify:prod-ops: 17 tests plus 4 browser flows passed. The first ad-hoc drill used an incorrect temporary container-name field; fixed the invocation to the actual recorded service name and the drill passed. The reusable isolated wrapper sets PG_TOOLS_CONTAINER correctly and its complete gate passed.

Temporary dump directories and both drill databases were removed. Test services are scoped and removed. Operator-encrypted backup storage, real production recovery timing and scheduled alerting remain deployment responsibilities; final release evidence/capture remains pending.
