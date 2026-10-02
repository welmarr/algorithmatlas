# Final test report — 2026-10-02

## Gates

| Gate                           | Result  | Evidence                                                                                                                                                                                                               |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary fast verification      | PASS    | 127 tests passed, 15 opt-in skips; format/lint/typecheck/build pass                                                                                                                                                    |
| Primary full verification      | PASS    | 138 unit/integration/security tests passed, 4 optional skips; 27 Chromium tests passed, 0 skipped; production build, both dependency audits, fresh migrations/mail and clean web Docker build                          |
| Fresh GitHub clone full gate   | PASS    | Candidate 4873ad58938d61260b584642fe7d13eda2b8af98; frozen install, fresh disposable PostgreSQL/Mailpit, migrations 001–004, 138 tests passed / 4 skipped, 27 browser tests passed, both audits and no-cache web build |
| Fresh clone separate fast gate | PASS    | pnpm verify: 127 passed / 15 opt-in skips, format/lint/typecheck and production build                                                                                                                                  |
| Clean runner rebuild           | PASS    | Explicit docker build --no-cache in fresh clone, then 9 actual Docker/security tests passed                                                                                                                            |
| Docker web startup             | PASS    | Clean image started on loopback 3015; health and ready returned success and Docker health became healthy; temporary smoke container removed                                                                            |
| Optional Node benchmarks       | PASS    | 3 sizes: 1k, 10k and 100k events, 500 entities; see PERFORMANCE                                                                                                                                                        |
| Optional browser benchmark     | PASS    | Included in the 27 production E2E tests; bounded 64-value/383-event workload                                                                                                                                           |
| GitHub Actions                 | PASS    | Initial complete Linux/Node 22 full gate at 00089c3b0b9727e30d8a0b043a5e397e22f159e8, run 36972546880; final main run is checked after release push                                                                    |
| Live optional AI               | SKIPPED | No live endpoint/credentials configured; deterministic core and provider schema/invalid-payload tests pass                                                                                                             |

Fresh clone: `C:\Users\dolat\AppData\Local\Temp\algorithmatlas-vnext-fresh-lf-20261002`, cloned directly from GitHub after the checkout fix. It is removed after verification. `DOCKER_NO_CACHE=1 VISUAL_CAPTURE=1 pnpm verify:isolated` provisions disposable services and invokes `verify:full`; `pnpm verify` was also run separately. No long-lived database or primary node_modules was copied into the clone.

The 4 full-gate skips are 3 optional synthetic Node benchmarks and 1 live AI test. The 3 benchmarks were subsequently run separately and passed. Fast-gate skips additionally omit the real DB and Docker integration suites; those execute in the full gate. Counts overlap across reruns and are not additive unique tests.

## Journeys and assertions

- Anonymous A–Z: Home, Learn, teaching/technical playback, custom Increasing Array input, Lab, Compare, editable Python, source highlighting, controls, graph view, raw fallback, responsive sizes and reduced motion.
- Verified A–Z: registration, actual SMTP verification, persistence, logout/login, restore/rerun; reset, old password/session revocation, token reuse and resend limits.
- Security: DB expiry/one-use races and stale login; CSRF/owner boundaries; runner forbidden imports/files/network/process access, output/trace/memory/time limits, cancellation, actual Docker settings and cleanup; queue/capability/retention limits.
- Visual correctness: all curated step projections retain canonical state; stable swap identity, before/after focus, DP dependencies and family-specific cues. Ten screenshot views were inspected.
- AI-off: no paid/provider service used by the complete core journey.

## Failures found and fixed before release

1. Lot A: ambiguous Play selector, duplicate change badge, DP focus collision, stale relaxed-edge highlight and misleading queen final label. Fixed and rechecked.
2. Lot B: missing owner-scoped DELETE input route; added and cross-user browser test passed.
3. Combined production browser gate: Playwright API Secure-cookie handling requires localhost rather than 127.0.0.1, and the old accessibility assertion expected one active element rather than comparison plus changed cell. Tests now use localhost and assert the intended two roles; cookie security was retained. Full suite rerun passed.
4. First external Windows clone: Git autocrlf produced 250 formatting failures. Added repository .gitattributes enforcing LF, pushed, created another new clone, then both full and fast gates passed.

Non-failing tooling warnings: Next's ESLint plugin detection despite a passing explicit ESLint gate; Node 25 shell:true deprecation in the fixed-argument verification launcher; an unrelated ancestor lockfile triggered Next root inference in the temporary clone. These did not bypass any gate. No unrelated lockfile was removed.

See [GitHub CI](https://github.com/welmarr/algorithmatlas/actions/runs/36972546880), [PERFORMANCE](../../PERFORMANCE.md), [ACCESSIBILITY](../../ACCESSIBILITY.md), [OPEN_GATES](OPEN_GATES.md).
