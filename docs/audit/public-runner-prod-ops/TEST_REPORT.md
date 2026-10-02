# Verification report

Source candidate: 968f005086c66838ab638f0d796eb43d79acce9f. Runtime implementation ends at 8388e00; subsequent changes organize the visual index and stabilize test scheduling/synchronization.

## Automated gates

| Gate                                   | Result | Count / scope                                                                                                                                  |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen install                         | PASS   | pnpm 11.25.0, no dependency copying from the primary checkout                                                                                  |
| Fast                                   | PASS   | 134 passed, 36 service/live-provider tests intentionally skipped; format/lint/types/build                                                      |
| Full                                   | PASS   | 166 passed, 4 optional live-AI tests skipped; 28 browser tests                                                                                 |
| Public runner                          | PASS   | 33 tests, actual Docker preflight/security/load and PostgreSQL queue/quotas                                                                    |
| Production operations unit/integration | PASS   | 17 tests: SMTP/outbox/proxy/auth/persistence/backup/retention                                                                                  |
| Production operations browser          | PASS   | 4 account/security/deletion/readiness flows                                                                                                    |
| Production dependency audit            | PASS   | No known advisories at this checkpoint                                                                                                         |
| All dependency audit                   | PASS   | No known advisories at this checkpoint                                                                                                         |
| Runner/Web Docker no-cache builds      | PASS   | Built from fresh-clone inputs; no primary image substituted                                                                                    |
| GitHub CI                              | PASS   | [Run 37016318709](https://github.com/welmarr/algorithmatlas/actions/runs/37016318709), exact source candidate; full + public-runner + prod-ops |

Four skipped full-suite tests require optional external live AI providers; the core platform, anonymous/verified journeys and every mandatory runner/account gate ran without paid credentials. Fast skips additionally cover service-dependent tests which the full gate executes.

## Reproducibility

A separate temporary directory was cloned directly from https://github.com/welmarr/algorithmatlas.git and checked out at the candidate. Dependencies were installed from the lockfile using pnpm's normal content-addressed cache, not copied node_modules. Updates were fetched from GitHub. Each service gate provisions fresh PostgreSQL/Mailpit with random credentials/ports, applies six migrations and removes its services in finally. DOCKER_NO_CACHE=1 rebuilds both runtime and Web images.

The complete browser suite covers anonymous Home/Learn/Simulator/technical steps/custom input/Lab/Compare/Python submission, real edited execution and visualization, error/cancel/ownership paths, signup/verification, save/restore across logout/login, password reset/session revocation and self-service deletion. Public quotas apply during test-profile execution.

## Failures investigated

- Initial queue completion needed an explicit JSONB CASE parameter cast; corrected before the runner checkpoint.
- An idle PostgreSQL error could serialize client metadata; bounded error handlers were added and that disposable test credential rotated.
- Runtime preflight distinguished public image metadata from host secrets; trusted administrative diagnostics allow fifteen seconds while submitted Python remains bounded at five.
- A browser alert selector also matched Next's announcer; scoped it to main.
- Capture selectors and one-based inclusive technical event ranges were corrected. A wrongly scoped capture assertion was caught by types before commit.
- Queen candidate/conflict reasoning was missing; real deterministic trace annotations and a ×/dashed rejected-cell cue were added.
- Automatic file concurrency caused intermittent property-test timeouts on this 8-logical-CPU Windows host with limited free memory. Vitest now runs at most two files at once; assertions/deadlines were not weakened.
- Remote run 37014521862 exposed a test race between immediate worker fault and asynchronous durable pause commit. The assertion now polls the database row; candidate CI passed afterward.
- A later local Docker gate stalled during the same interval as a tool approval timeout. Two stopped test containers were inspected/removed. Docker responsiveness recovered; the identical public gate rerun passed all 33 tests. No execution limit was relaxed and no failure was hidden.

Next warns about an unrelated ancestor lockfile in the Windows temporary-clone path and its ESLint plugin detection; builds and lint pass. These warnings do not establish a production security approval.

Final screenshot/ZIP verification is recorded separately in VISUAL_CAPTURE_REPORT.md and status.json. The final release adds audit documentation and a Windows process-launch correction in scripts/verify.mjs: native executables use argument arrays without a shell, so a Program Files Node path is safe. The actual helper successfully resumed packaging. Application/runtime/test/capture behavior is unchanged. Final-candidate fresh-clone and actual remote CI gates are run before merge; final SHA/run are recorded in the completion report.

The production Web image was started independently: liveness/readiness PASS, uid 1000, zero mounts, no Docker socket or executable, execution disabled by default. The preview restored on localhost:3000 has database/execution/email ready. The real UI verifies Increasing Array [8,2,5,1,7] → 17, Python → 17, a source edit → 23 and active source-line highlighting.
