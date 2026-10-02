# LOT 11 — PostgreSQL accounts and learning progress

Status: **COMPLETE** for the optional local account workflow.

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `3e2a8b7`

## Implemented

- Added a versioned PostgreSQL migration for users, hashed sessions, problem progress, simulation runs, saved inputs, source submissions, concept progress, and provider metadata without an API-key column. Migration runs in a serialized transaction and rejects changed checksums.
- Added account registration, login, logout, private dashboard, saved input restoration, and explicit save controls on problem pages. Browsing and simulating still work without a database or account.
- Curated runs are recomputed on the server from the supplied input. Edited code can be saved as source but is not represented as a verified curated run. User-owned queries include user scoping; form and API mutations check Origin and cap body size.
- Added optional Compose PostgreSQL stack and setup guidance. The project preview can remain database-free; `/account` reports when storage is not configured.

## Verification

- Full unit/integration suite with Docker and PostgreSQL enabled: **124 passed, 0 failed, 1 skipped**. The skip is the separately opt-in live AI provider test.
- Browser suite with PostgreSQL: **16 passed, 0 failed** under four workers. This includes register/login/logout, saved input restore, server-recomputed Increasing Array output, and cross-origin mutation rejection.
- The two-account database test confirmed one user could not read or delete another user's saved input. Migration rerun made no changes.
- Typecheck, lint, format, production build, and updated Docker image build passed.

## Incident resolved during verification

- The first full browser suite exposed an input-edit race before React hydration. Under load, Playwright could fill the textarea before React controlled it, concatenating the entered JSON with the default JSON. The editor and save controls now become enabled after hydration. The full suite then passed.

## Limitations

- Account storage is optional and requires operator configuration and migrations. The current port-3000 preview has not yet been switched to the database-backed stack.
- Login rate limiting, production proxy/transport review, backup and recovery, and dependency/security review remain Lot 12 gates. This lot does not declare production readiness.

## Cleanup

- Removed generated Playwright results after verification. The test PostgreSQL container uses tmpfs and has no Docker volume. It remains available for Lot 12 checks and will be removed when those checks finish. No project-owned volumes were found.
