# Public runner / production operations split

Starting SHA: 113ddfc09275fc21f44f8f2e74c82dd76e64da7e.
Pre-split branch: archive/pre-public-runner-prod-ops.
Pre-split annotated tag: pre-public-runner-prod-ops (tag object 546bb2ed8d14789cdc0a197897c22599ebb72e58).
Development branch: feature/public-runner-prod-ops. Ending SHA: pending.

Baseline reverified before source changes: frozen install, fast gate (127 passed / 15 optional skipped), full isolated gate (138 passed / 4 optional skipped; 27 browser tests passed), both dependency audits, migrations 001–004 and Docker builds. Temporary baseline services removed. Previous active local preview paused for clean builds; existing local account data retained.

## Execution plan

1. Durable PostgreSQL queue, private capabilities/idempotency, quotas, kill switches, trusted runner recovery, pinned image, preflight and adversarial/load tests.
2. Durable encrypted email outbox, SMTP worker/retries, fixed-origin trusted proxy policy, account data operations.
3. Backup/restore drill, bounded retention, readiness/metrics/incident tooling and Linux deployment guidance.
4. Full fast/full/public-runner/prod-ops gates, candidate CI and fresh GitHub clone.
5. Reusable real-UI capture of all discovered routes/problems/states, sanitized manifest, contact sheets, local HTML gallery and ZIP.
6. New independent audit directory, non-force merge and annotated release only after all gates; scoped cleanup retaining final screenshots/ZIP.

Current implementation status: IN PROGRESS. No public exposure or independent security-review approval is claimed.

## Verification concurrency correction

A later clean-clone fast run also exceeded the default 5-second randomized grid/queen tests under Vitest's automatic host-wide file concurrency. Limited Vitest to two files at once so property checks and Docker probes have a predictable shared host budget. No test assertion or Python execution deadline was relaxed. The final candidate is reverified with this setting.

Remote run 37014521862 exposed a test synchronization race: worker.fault becomes true before the asynchronous durable pause transaction commits. The worker correctly stops immediately; the assertion now polls the actual database pause row instead of dereferencing it prematurely. Public runtime behavior is unchanged.
