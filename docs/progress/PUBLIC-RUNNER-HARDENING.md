# Public runner hardening checkpoint

Branch: feature/public-runner-prod-ops. Starting SHA: 113ddfc09275fc21f44f8f2e74c82dd76e64da7e. Ending checkpoint SHA: d66c0b9.

## Architecture and controls

Added @sim/operations, migration 005, durable admission/claims/idempotency/capabilities, per-guest/account/IP/global quotas, database incident controls, private service readiness/metrics, single-leader worker recovery and fail-closed cleanup. Pinned Python base/image selection and actual kernel/resource preflight. Proxy request policy fixes host/origin trust; local mode cannot become a public fallback. Core/player/AI semantics remain unchanged.

Production requires dedicated nonroot Linux/rootless Docker/cgroups-v2. The current Windows Docker Desktop is seccomp/cgroups-v1/rootful and is intentionally rejected by the production profile. Loopback test-production verifies available controls without claiming independent security approval.

## Evidence

- Public runner release command: 31 tests passed, including real Docker adversarial probes, runtime preflight, orphan cleanup, private service auth, queue/deadline/idempotency/capability and bounded concurrency.
- Targeted browser journeys against the durable public test profile: 5 passed (anonymous A–Z, errors/cancel, verified workspace restore, account persistence and auth security).
- Focused policy/queue tests: 14 passed, including pausing already queued guest jobs.
- Fast gate passed: 132 tests passed, 28 optional service tests skipped, format/lint/types and 44-route production build passed. Full release gates remain pending.

## Failures and fixes

The first queue completion test found a JSONB CASE parameter requiring an explicit cast; fixed, then queue/cancellation tests passed. A PostgreSQL idle-client failure could serialize connection metadata through the test runner; added bounded error handlers and rotated the disposable test credential. No production/local-development credential was involved.

The preflight environment allowlist initially omitted Docker's HOME/HOSTNAME and the image's public GPG signing-key metadata. The allowlist now distinguishes these non-secret runtime fields from host credentials. Concurrent Docker diagnostics hit the original five-second administrative timeout; preflight diagnostics now allow fifteen seconds, while submitted execution remains capped at five seconds. The focused browser rerun passed.

## Cleanup and remaining work

Disposable release-gate services are removed in finally; actual job/orphan/probe containers are removed and absence asserted. A separate labeled temporary DB/mail pair remains for subsequent split development. Active local user DB/mail are preserved.

Production email outbox, account operations, backup/restore/retention, full/fresh-clone/CI gates, complete visual artifact, final audit and release are still pending. No public feature is enabled by default.

## Release-candidate evidence update

Candidate d4ef3db passed fast (134/35 skipped), full (165/4 optional AI skips plus 28 browser), public runner (32), production operations (17 plus 4 browser), both dependency audits and actual remote CI run 37011853792. Added a further actual-container concurrency test: two active Docker containers, queue saturation and one-above rejection, queued/running cancellation, timeout mixed with successful queued work, final metrics and container absence. This supplements deterministic worker cleanup barriers. Its five-test integration file passes.

The first temporary-clone full run overlapped other heavy local gates and exceeded a 5-second queen-fixture test and a 15-second multi-container test. These were timing failures; release verification is repeated without competing local gates and without weakening execution/test deadlines. The final audit records the successful clone and exact candidate.

## Final split evidence

The preceding sections preserve intermediate checkpoints, including work pending at those dates. Final tested application SHA: 968f005086c66838ab638f0d796eb43d79acce9f. Ending release identity: refs/tags/public-runner-prod-ops-v1 (peeled commit); branch feature/public-runner-prod-ops. Fast: 134 passed/36 skipped; full: 166 passed/4 optional live-AI skipped and 28 browser; public runner: 33; prod-ops: 17 and 4 browser. Fresh GitHub clone, six clean migrations, both no-cache Docker builds, dependency audits and actual source CI run 37016318709 passed. Backup restore verified seven data tables. Real-UI capture: six scenarios, 150 originals, 78 contact sheets; verified ZIP/gallery complete. Final-candidate verification is required before merge. See ../audit/public-runner-prod-ops/README.md and TEST_REPORT.md for failures/fixes and final evidence.

Six superseded project images, disposable DB/mail services, failed captures and temporary backup/test output were removed; current images and active development data are preserved. The temporary clone is removed after final release verification. Public exposure remains off by default; independent security review, target production host/proxy/SMTP and operator backup/alerting gates remain open.
