# Public runner hardening checkpoint

Branch: feature/public-runner-prod-ops. Starting SHA: 113ddfc09275fc21f44f8f2e74c82dd76e64da7e. Ending implementation SHA: the commit containing this checkpoint (resolved in final audit).

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
