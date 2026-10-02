# VNext final execution record

Date: 2026-10-02. Branch: feature/vnext-visual-auth-python.

- Starting preserved baseline SHA: 5a5e6c7baffe369949f25a78b6c65f71ac2fe3cb.
- Lot A ending SHA: 6fb3573131642cdff4017c5e3e31e093489bb5b2.
- Lot B ending SHA: 4cfa0d67af106a6d2665de0af7a76eda839f7473.
- Lot C ending SHA: 00089c3b0b9727e30d8a0b043a5e397e22f159e8.
- Reproducibility candidate: 4873ad58938d61260b584642fe7d13eda2b8af98.
- Final documentation/release commit: resolve the annotated vnext-visual-auth-python tag; the completion report records the exact hash after creation.

## Subsystems and architecture

Added the framework-free choreography package/shared player runtime; versioned teaching facts and stable item identity; optional verified account/email/reset/session lifecycle; migrations 003/004; a trusted local execution service and bounded job queue around the existing isolated Python runner; browser Own Code and verified source/input persistence. Core results remain deterministic with AI off. Accounts remain optional for use.

Tests added cover phase immutability and actual motion, four viewport widths and reduced motion, database token/session races, real SMTP/browser account flows, queue/capability/cancellation limits, actual Docker settings/attack payloads and edited Python end-to-end visualization. Current reports and ADRs 014–016 describe the implementation. Earlier audits remain unchanged.

## Verification

Primary and fresh-clone full gates passed: 138 unit/integration/security tests, 4 optional skips, 27 browser tests with no skips, production build and both dependency audits. Separate fast gate passed: 127 tests, 15 opt-in skips. Three optional Node benchmarks were run separately and passed, leaving only live optional AI untested. Clean web/runner builds, 9 post-rebuild runner/security tests and Docker HTTP startup passed. Fresh DB/mail instances applied all four migrations and executed verification/reset/save/restore journeys.

Initial Linux GitHub full CI passed at 00089c3 (run 36972546880). Final main CI is checked after push; local final report records its link and exact SHA. The local browser preview is refreshed using the tested development launcher and intentionally retained local DB/mail.

## Failures and fixes

The original visual/auth lots record their own failures. Combined verification corrected a stale one-active-element accessibility assertion and Playwright's Secure-cookie localhost test origin. The first Windows clone exposed CRLF conversion; .gitattributes now enforces LF and a second true GitHub clone passed. No source/data result was hard-coded to satisfy the checks.

## Security and limits

Proven controls include password/token/session protections, verified ownership, CSRF/body/quota bounds and actual nonroot/no-network/read-only/capability/resource container settings with cleanup. Local-only Python remains disabled by default in ordinary deployments. Public hostile-code hosting, production email/operations, manual full accessibility assessment, broader semantics/languages and live AI remain documented gates.

## Cleanup and retained environment

Disposable verification databases/mail were removed automatically. Baseline test database/mail and the old preview container were retired. Superseded known project images were removed only after checking container references; no global prune was used. Fresh clone directories and generated test reports/screenshots are removed after their results are recorded. Shared dependency caches and unrelated containers/volumes remain untouched.

The active local preview uses localhost:3000, a labeled local DB on 54328 with simulator-vnext-pgdata and a labeled Mailpit on 11025/18025. Credentials remain only in ignored .env. Keep that database volume, runner image and active preview output while developing; the volume is useful account data, not disposable test data.
