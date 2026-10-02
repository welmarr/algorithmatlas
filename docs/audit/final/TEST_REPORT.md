# Verification record

Audit target: `build/full-platform` implementation commit `1b70043`, Windows development host, local Docker Desktop, Node 25.8.0, pnpm 11.25.0, PostgreSQL 16 test container with tmpfs. No remote CI run was available.

| Gate                                  | Result                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`                         | Passed format, lint, typecheck, unit/integration (118 passed, 12 optional skipped), Next production build                                                                                                |
| `pnpm verify:full`                    | Passed migrations, Python runner build, format/lint/types, unit/integration (126 passed, 4 optional skipped), Next build, production audit, Playwright (19 passed, 1 optional skipped), web Docker build |
| `pnpm audit --prod --audit-level=low` | No known advisories                                                                                                                                                                                      |
| `pnpm audit --audit-level=low`        | No known advisories, including development tools                                                                                                                                                         |
| Docker runner security probes         | 7 passed with local image: normal execution, source trace, imports, output, filesystem/process/malformed source, infinite loop, memory pressure, forced timeout cleanup                                  |
| Node performance, opt-in              | 3 passed: 1k, 10k, 100k synthetic events with 500 entities                                                                                                                                               |
| Chromium performance, opt-in          | 1 passed: 64 input values, 383 events, generation/render/seek measured                                                                                                                                   |
| Web preview smoke                     | `/api/ready` 200 (`database: disabled`); Increasing Array 200; image digest `sha256:dcc89f0bca324968d3fe0cfde2cdb801f3aa153ced9ab454143c73980ccb0a48`; healthy                                           |
| AI disabled                           | Core/unit/browser suite passes with no model or key                                                                                                                                                      |
| Live optional AI connector            | Not run; no endpoint/model configured                                                                                                                                                                    |

The first full browser run exceeded the default 30-second test timeout near the end of the account flow under four-worker load. That test is now marked slow; the correctly configured full rerun completed its account flow in 34.4 seconds and passed. A separate targeted rerun omitted `DATABASE_URL` on the web server and therefore failed the readiness/account assertions; the full gate rerun set it correctly and passed. These failed attempts are retained here as diagnostic history, not counted as a successful gate.

The performance results and sampling limits are in `docs/PERFORMANCE.md`. The accessibility coverage and missing manual work are in `docs/ACCESSIBILITY.md`. Dependency and sandbox threat-model details are in `SECURITY.md` and `docs/SANDBOX.md`.
