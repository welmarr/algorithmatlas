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

The failed full gate remains a release blocker. The supplemental browser gate is additional evidence and does not change the full gate's result. Fresh-clone and remote CI results are recorded after the final candidate push.
