# VNext baseline preservation

Date: 2026-10-02. Repository: `welmarr/algorithmatlas`.

The inspected starting HEAD was `77a5db364f2fc77b9d1741a3eafa2704fd71c600`
on `build/full-platform`, with no uncommitted changes and no configured remote.
The remote had no branches or tags at inspection and again after fetching.
An authenticated dry-run push succeeded before any write.

## Reproduction and drift

- `pnpm install --frozen-lockfile`: passed.
- The first `pnpm verify` stopped at Prettier on `docs/ROADMAP.md`.
  This was a documentation formatting defect in the starting checkout. Only
  formatting was repaired; no application code was changed for preservation.
- `.gitignore` now excludes Python caches/environments, generic development
  cache, and local Mailpit/PostgreSQL data directories.
- Rerun `pnpm verify`: passed (118 tests, 12 optional skips; production build).
- `pnpm verify:full`: passed using a new PostgreSQL 16 database, migrations
  001 and 002, and the isolated Python Docker image. Unit/integration: 126
  passed, 4 opt-in tests skipped. Browser: 19 passed, 1 performance opt-in
  skipped. Production and web Docker builds passed.
- Production and complete dependency audits: no known vulnerabilities.
- Existing Next ESLint configuration and Node shell-spawn deprecation warnings
  remain recorded; they did not fail the verification.

The database is disposable, on loopback port 54329 with tmpfs data and the
`com.algorithmatlas.scope=baseline-test` label. It contains only test records.
The existing web preview on port 3000 remained running throughout validation.

## Publication scope

No feature work precedes the baseline push. The preservation commit is named
by `main`, `archive/mvp-before-visual-auth-python`, and the annotated
`mvp-before-visual-auth-python` tag. Their exact shared SHA is available with
`git rev-parse mvp-before-visual-auth-python^{commit}`. The older prototype
branch and annotated tag are preserved too. Feature work starts from that
same commit on `feature/vnext-visual-auth-python`.

Tracked `.env.example` contains a placeholder, not a credential. A limited
historical signature scan found no common private-key, GitHub, AWS, or OpenAI
token formats. Generated build/test output and local data are ignored.
Historic audit reports are unchanged. This baseline remains an MVP, not a
claim of public arbitrary-code sandbox readiness.
