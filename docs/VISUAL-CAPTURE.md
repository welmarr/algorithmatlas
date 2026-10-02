# Actual application visual capture

Run `pnpm capture:visual` from the repository root. The command provisions fresh disposable PostgreSQL/Mailpit, migrates the schema, builds the pinned Python runner, verifies domain/choreography behavior, builds the production Web application, and runs the reusable Playwright capture suite. It then generates contact sheets, a static gallery, a manifest/index and a portable ZIP. AI stays off. Services are removed in finally.

The capture suite refuses to run without its explicit disposable-database marker. It exercises real HTTP, SMTP and Docker execution. Operational fixtures use database incident controls, real bounded queue records and actual server-side quota counters. A temporary table rename in that isolated database provokes the application's real error boundary; the table is restored in finally.

## Output and coverage

Output lives in ignored `artifacts/visual-audit/<UTC timestamp>/`. The ZIP is beside that directory. Do not delete the final package during project cleanup. Commit only the capture source/configuration/docs.

Route inventory is discovered recursively from actual page.tsx files and expanded from the current problem registry. Home/catalog and sign-in/registration each share a route. The manifest records exact teaching IDs, technical positions, held choreography phases, sanitized fixture data, auth state, viewport, reduced motion and page overflow.

Desktop: 1440×1000; tablet: 768×1024; mobile: 390×844. All registered problems use meaningful steps. Ten family triptychs use the application's explicit phase controls. Additional states cover both two-pointer directions, BFS/frontier/path reconstruction, Dijkstra, DP dependencies, binary-search decisions, queen candidates/conflicts/backtracking and real geometry. Responsive core and reduced-motion checks are included. No dark mode is fabricated.

Account screenshots use only visual-audit@example.test. Password fields must be empty before capture. Token fragments are removed by the application; manifest routes omit queries/fragments. Actual delivered email HTML has action URLs replaced by REDACTED before rendering. Captures reject obvious credential/private-path content. Traces/videos are disabled. Only the final sanitized screenshots are packaged.

The gallery works offline with no external dependencies; originals are full resolution and contact sheets are labeled navigation aids. ZIP uses standard stored entries (PNG is already compressed). No generative image tools are used.

Capture production after release gates pass; record the tested commit in the final audit. Screenshot production is evidence of coverage, not a substitute for human visual assessment. The index supplies fifteen questions for the external reviewer.
