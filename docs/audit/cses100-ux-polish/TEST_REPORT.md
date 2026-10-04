# Test report

| Gate                                   | Latest local result          | Evidence                                                                                                                                          |
| -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm problems:release`                | PASS                         | 100 unique certified IDs; 128 focused tests; all 100 routes opened and reran example custom input.                                                |
| `pnpm verify`                          | PASS                         | Formatting, lint, type checks, 315 tests passed with 36 opt-in skips, 130 static pages built.                                                     |
| `pnpm verify:public-runner`            | PASS                         | Disposable runner preflight and 33 public-runner tests.                                                                                           |
| `pnpm verify:prod-ops`                 | PASS                         | 17 service tests, production build and four account/readiness browser flows.                                                                      |
| `pnpm verify:browser`                  | PASS                         | Fresh disposable database/mail, 34 active production E2E tests (one optional visual capture skipped), all-route smoke and web Docker image build. |
| `pnpm capture:visual`                  | PASS                         | Six browser tests; 234 images and complete route manifest from the final UI.                                                                      |
| `pnpm audit --prod --audit-level=low`  | PASS                         | No known production dependency vulnerabilities.                                                                                                   |
| `pnpm audit --audit-level=low`         | FAIL                         | High `braces <=3.0.3` advisory through the development Next ESLint plugin; advisory lists no patched version.                                     |
| `pnpm verify:isolated` / `verify:full` | FAIL at all-dependency audit | Service migrations, 347 tests and production build passed before the audit. Browser/image stages were separately exercised by `verify:browser`.   |

## Fresh clone and remote CI

The final code candidate `442f9634caece565542fbb7918b0d7fc414babc5` was cloned from GitHub into a separate short-path checkout. Frozen install, six migrations, 128 focused certification tests, all 100 custom-input browser routes, 315 fast tests and the 347-test service suite passed. Its supplemental browser gate passed 34 active E2E tests and built the web Docker image; public-runner passed 33 tests and prod-ops passed 17 service tests plus four browser flows. The full command then stopped at the same `braces` advisory.

[GitHub CI run 37195396541](https://github.com/welmarr/algorithmatlas/actions/runs/37195396541) has a successful `problem-certification` job and a failed `validate` job. Its validation log shows 347 tests and a clean production audit before the same high-severity `braces` finding. Runner/prod-ops CI steps were skipped after that failure. Overall fresh-clone full verification and CI are **FAIL** as release gates.

An initial temporary clone under `C:\Users\dolat\AppData\Local\Temp` had incomplete Windows pnpm junctions for `pg-types` despite a successful frozen install, so migration could not start there. A separate short-path GitHub clone under `D:\Simulator\artifacts\fresh-clone-442f` installed those links and produced the results above. One 55-case exhaustive DP oracle exceeded Vitest's default five-second timeout under the shared service suite in an intermediate clone. The final candidate preserves every case/assertion and gives only that oracle ten seconds; it passed in the final clone and CI.

The failed full gate remains a release blocker. The supplemental browser gate is additional evidence and does not change the full gate's result.
