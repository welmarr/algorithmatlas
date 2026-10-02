# Production email/account operations checkpoint

Branch: feature/public-runner-prod-ops. Starting SHA: d66c0b9 (durable runner checkpoint). Ending checkpoint SHA: 4725b04.

Implemented migration 006, encrypted transactional outbox, generic TLS SMTP adapter, separate worker, transactional claims and leases, bounded retries/dead letters, replacement cancellation, stable message IDs, aggregate counters and readiness heartbeat. Account mutations use canonical origin/proxy policy plus per-identity/IP/global limits and Retry-After. Added account data inspection and password-confirmed deletion. Web Docker runtime now uses the node user.

## Evidence

- Email-focused tests: 7 passed, including real unavailable SMTP followed by a new worker delivering through Mailpit, lease recovery, tamper detection, one active link, bounded attempts and deletion.
- Self-contained verify:prod-ops: 17 tests passed across five files; fresh migrations 001–006; production Web build passed; 4 browser tests passed (saved work, auth/reset/ownership/rates, account deletion, readiness).
- Initial browser rerun found an ambiguous alert locator matching Next's route announcer. Scoped it to main; the complete isolated gate then passed.
- Production SMTP credentials/domain delivery were not tested; generic transport was exercised through Mailpit. SMTP remains at-least-once across acceptance/commit crashes.

Dedicated disposable gate containers/databases/mail were removed in finally. Development data was preserved. Final full/fresh-clone/remote-CI and capture gates remain pending.

Final requirement review added bounded EMAIL_MAX_ATTEMPTS configuration (1–5, default five). Lowering the budget terminalizes existing exhausted retries and expired leases, preventing stranded pending messages. The existing dead-letter test covers the default, a one-attempt policy, invalid configuration and restart with a lower budget.

## Final split evidence

The preceding sections preserve intermediate checkpoints, including work pending at those dates. Final tested application SHA: 968f005086c66838ab638f0d796eb43d79acce9f. Ending release identity: refs/tags/public-runner-prod-ops-v1 (peeled commit); branch feature/public-runner-prod-ops. Fast: 134 passed/36 skipped; full: 166 passed/4 optional live-AI skipped and 28 browser; public runner: 33; prod-ops: 17 and 4 browser. Fresh GitHub clone, six clean migrations, both no-cache Docker builds, dependency audits and actual source CI run 37016318709 passed. Backup restore verified seven data tables. Real-UI capture: six scenarios, 150 originals, 78 contact sheets; verified ZIP/gallery complete. Final-candidate verification is required before merge. See ../audit/public-runner-prod-ops/README.md and TEST_REPORT.md for failures/fixes and final evidence.

Six superseded project images, disposable DB/mail services, failed captures and temporary backup/test output were removed; current images and active development data are preserved. The temporary clone is removed after final release verification. Public exposure remains off by default; independent security review, target production host/proxy/SMTP and operator backup/alerting gates remain open.
