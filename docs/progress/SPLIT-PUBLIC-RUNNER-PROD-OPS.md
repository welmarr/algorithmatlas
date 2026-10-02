# Public runner / production operations split

Starting SHA: 113ddfc09275fc21f44f8f2e74c82dd76e64da7e.
Pre-split branch: archive/pre-public-runner-prod-ops.
Pre-split annotated tag: pre-public-runner-prod-ops (tag object 546bb2ed8d14789cdc0a197897c22599ebb72e58).
Development branch: feature/public-runner-prod-ops. Ending release identity: refs/tags/public-runner-prod-ops-v1 (peeled commit). Tested application SHA: 968f005086c66838ab638f0d796eb43d79acce9f.

Baseline reverified before source changes: frozen install, fast gate (127 passed / 15 optional skipped), full isolated gate (138 passed / 4 optional skipped; 27 browser tests passed), both dependency audits, migrations 001–004 and Docker builds. Temporary baseline services removed. Previous active local preview paused for clean builds; existing local account data retained.

## Execution plan

1. Durable PostgreSQL queue, private capabilities/idempotency, quotas, kill switches, trusted runner recovery, pinned image, preflight and adversarial/load tests.
2. Durable encrypted email outbox, SMTP worker/retries, fixed-origin trusted proxy policy, account data operations.
3. Backup/restore drill, bounded retention, readiness/metrics/incident tooling and Linux deployment guidance.
4. Full fast/full/public-runner/prod-ops gates, candidate CI and fresh GitHub clone.
5. Reusable real-UI capture of all discovered routes/problems/states, sanitized manifest, contact sheets, local HTML gallery and ZIP.
6. New independent audit directory, non-force merge and annotated release only after all gates; scoped cleanup retaining final screenshots/ZIP.

Current implementation status: COMPLETE for the controlled deployment candidate. No public exposure or independent security-review approval is claimed.

## Verification concurrency correction

A later clean-clone fast run also exceeded the default 5-second randomized grid/queen tests under Vitest's automatic host-wide file concurrency. Limited Vitest to two files at once so property checks and Docker probes have a predictable shared host budget. No test assertion or Python execution deadline was relaxed. The final candidate is reverified with this setting.

Remote run 37014521862 exposed a test synchronization race: worker.fault becomes true before the asynchronous durable pause transaction commits. The worker correctly stops immediately; the assertion now polls the actual database pause row instead of dereferencing it prematurely. Public runtime behavior is unchanged.

## Final evidence and packaging repair

Fast 134 passed/36 skipped; full 166 passed/4 optional live-AI skipped plus 28 browser; public runner 33; production operations 17 plus 4 browser. Clean GitHub clone, six migrations, no-cache runner/Web builds, both audits and actual source CI run 37016318709 passed. All six capture scenarios passed, producing 150 originals and 78 contact sheets. The initial Windows packaging process failed on the Program Files path; native executable launches now bypass the shell. Resuming with the corrected helper produced a ZIP whose 232 entries matched their original SHA-256 hashes, and all 14 gallery filters passed. Runtime/captured UI is unchanged.

See ../audit/public-runner-prod-ops/ for the full final audit, failures and fixes, artifact paths, exact quotas, deployment gates and cleanup. Six unused superseded project images and all completed test-service/capture/backup artifacts were removed; the final review package, active preview/database/mail and current release images are retained. Final candidate CI and fresh-clone gates are checked before non-force merge and remote tag verification.
