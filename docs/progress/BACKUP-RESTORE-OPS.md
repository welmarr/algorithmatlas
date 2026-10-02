# Backup, restore and retention checkpoint

Branch: feature/public-runner-prod-ops. Starting SHA: d66c0b9. Ending checkpoint SHA: 4725b04.

Implemented native PostgreSQL custom backup, transactional empty-database restore, bounded retention batches, aggregate status and incident-control CLI. Restore drill validates migration version, password verification, hashed sessions, saved inputs, simulation runs, progress, Python workspaces and foreign-key ownership in a fresh database. Nonempty destinations are rejected. Retention keeps orphan IDs for container cleanup and never silently ages out saved work.

## Evidence

Backup/retention tests: 2 passed. Included in isolated verify:prod-ops: 17 tests plus 4 browser flows passed. The first ad-hoc drill used an incorrect temporary container-name field; fixed the invocation to the actual recorded service name and the drill passed. The reusable isolated wrapper sets PG_TOOLS_CONTAINER correctly and its complete gate passed.

Temporary dump directories and both drill databases were removed. Test services are scoped and removed. Operator-encrypted backup storage, real production recovery timing and scheduled alerting remain deployment responsibilities; final release evidence/capture remains pending.

## Final split evidence

The preceding sections preserve intermediate checkpoints, including work pending at those dates. Final tested application SHA: 968f005086c66838ab638f0d796eb43d79acce9f. Ending release identity: refs/tags/public-runner-prod-ops-v1 (peeled commit); branch feature/public-runner-prod-ops. Fast: 134 passed/36 skipped; full: 166 passed/4 optional live-AI skipped and 28 browser; public runner: 33; prod-ops: 17 and 4 browser. Fresh GitHub clone, six clean migrations, both no-cache Docker builds, dependency audits and actual source CI run 37016318709 passed. Backup restore verified seven data tables. Real-UI capture: six scenarios, 150 originals, 78 contact sheets; verified ZIP/gallery complete. Final-candidate verification is required before merge. See ../audit/public-runner-prod-ops/README.md and TEST_REPORT.md for failures/fixes and final evidence.

Six superseded project images, disposable DB/mail services, failed captures and temporary backup/test output were removed; current images and active development data are preserved. The temporary clone is removed after final release verification. Public exposure remains off by default; independent security review, target production host/proxy/SMTP and operator backup/alerting gates remain open.
