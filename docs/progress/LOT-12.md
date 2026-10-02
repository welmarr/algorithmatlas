# LOT 12 — Production hardening and final local audit

Status: **PARTIAL**. The local hardening gate passes, but the public execution and production operations gates listed below remain open.

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `1b70043`
- Construction branch: `build/full-platform`

## Implemented

- Targeted Playwright, PostCSS, and Vitest dependency fixes; full and production dependency audits report no known advisories at this checkpoint.
- Shared PostgreSQL fixed-window limits for login, registration, and account writes; PII-free structured authentication logs; session/rate-bucket pruning; database-aware readiness; security headers and partial CSP; React error boundaries.
- Additional controlled Python runner probes for memory pressure, output exhaustion, filesystem/process attempts, malformed source, and cleanup. The runner remains local CLI only.
- Keyboard-operable tabs, ARIA tabpanels, browser checks for labels/text cues, mobile overflow, and reduced motion.
- Opt-in Node benchmarks at 1k/10k/100k events and a separate real Chromium benchmark at the largest accepted array input (383 events). Results and limits are in `docs/PERFORMANCE.md`.
- `pnpm verify` and `pnpm verify:full`; CI now has a PostgreSQL service and calls the full gate. Expanded architecture, security, API, accessibility, performance, and sandbox documentation plus a reconstruction book and eleven problem-family case studies.

## Verification

- `pnpm verify`: passed formatting, lint, types, 118 tests passed / 12 optional skipped, production build.
- `pnpm verify:full`: passed migrations, Docker runner build/probes, formatting, lint, types, **126 tests passed / 4 optional skipped**, production build, production audit with no known advisories, **19 browser tests passed / 1 opt-in benchmark skipped**, and web Docker build.
- Separate opt-in Node performance suite: 3 passed. Separate opt-in Chromium performance test: 1 passed. Full `pnpm audit --audit-level=low`: no known advisories.
- Updated port-3000 web preview: `/api/ready` returned 200 with database disabled; Increasing Array returned 200; container reported healthy and used the verified image digest.

## Limitations and deferred release work

- No public arbitrary-code route; Python is a local Docker CLI, and C++/Java execution is absent. The editable browser subset is available only for Increasing Array.
- Live external AI integration was not configured, so real provider behavior and CORS remain unverified. The app works with AI disabled.
- No manual screen-reader or complete contrast audit; no browser validation at 10k/100k events, and snapshots are slow at 100k in the synthetic Node test.
- No production proxy/TLS, backup/restore, load, monitoring, or independent security review. CI workflow is locally inspectable but has not run on a remote provider because no remote exists.

## Cleanup

Removed generated Playwright results and the local Next.js build directory after verification. Stopped the project-owned auto-remove PostgreSQL test container, which used tmpfs and no Docker volume. No project-owned Compose volumes or leftover Python runner containers were present. The verified stateless web preview continues to run. Other projects' containers and volumes were untouched.

## Assessment

This checkpoint is an **MVP** with a verified local curated simulation core, optional accounts, and a developer-only Python vertical slice. It is not a production-ready public execution platform. See `docs/audit/final` for the evidence matrix.
