# Full-project visual capture

## Artifact

- Application commit: 968f005086c66838ab638f0d796eb43d79acce9f.
- Directory: D:\\Simulator\\artifacts\\visual-audit\\2026-10-02T14-11-51Z.
- ZIP: D:\\Simulator\\artifacts\\visual-audit\\AlgorithmAtlas-visual-audit-2026-10-02T14-11-51Z.zip.
- ZIP bytes: 52,173,063.
- SHA-256: 7afd8bd143b952f32f821f30621b155d90c1d00984779c407724f01b15887247.
- 150 original screenshots: 126 desktop (1440×1000), 10 tablet (768×1024), 14 mobile (390×844), with full-page height where needed.
- 78 labeled contact sheets; 232 ZIP entries including originals and four metadata/gallery files.
- Generated binaries are outside Git. The reusable capture harness, manifest schema, packaging script and documentation are committed.

## Coverage

All source-discovered user-facing routes were covered; routesNotCaptured is empty. Home and catalog share /. Login and registration share /account. The actual registry supplies all 20 curated problems; each has a noninitial meaningful teaching state.

| Category                               | Original screenshots |
| -------------------------------------- | -------------------: |
| Overview                               |                    1 |
| Public/empty states                    |                    2 |
| Curated problems                       |                   20 |
| Choreography and pedagogical triptychs |                   54 |
| Lab                                    |                    8 |
| Compare                                |                    3 |
| Python                                 |                    8 |
| Operational states                     |                    4 |
| Auth                                   |                   11 |
| Account/saved work                     |                    7 |
| Email                                  |                    2 |
| Errors                                 |                    7 |
| Responsive additions                   |                   20 |
| Reduced motion                         |                    3 |

Ten representative problem families include before/reason/after states. Increasing Array uses [8,2,5,1,7], shows 2 < 8, 2 → 8, +6 and final total 17. Additional states expose both pointer directions/original indices, BFS frontier/queue/distance/reconstruction, Dijkstra selection/relaxation, DP dependencies, binary-search discarded intervals, queen candidate/conflict/placement/recursion/backtrack and geometric representation.

Python states use real executions: queued/running/completed, semantic array/graph, raw fallback, syntax/runtime/policy/memory/CPU timeout, cancellation, disabled, queue-busy and rate-limited. Quota/incident fixtures use actual disposable database controls/counters. Auth uses a sanitized test identity and real Mailpit verification/reset. A temporary database dependency failure exercises the application error boundary; the root-layout catastrophic boundary is not a separate route.

## Verification and sanitization

The production capture build and 28 domain/choreography tests pass. All six Playwright capture scenarios pass (5.6 minutes). Explicit phase selectors and settled state checks avoid random transition screenshots. Page-level overflow assertions pass for all 150 images; local code scrollers remain intentional.

Only disposable services and example.test identities were used. Password fields were cleared before screenshots; token fragments were removed and rendered email links replaced with REDACTED. Manifest routes contain no query/fragment credentials. Body guards reject secrets/internal paths. AI was disabled. There is no supported dark mode; darkModeSupported is false.

The capture command's packaging launch initially failed on Windows because Node's Program Files path was passed through a shell. The verification helper now invokes native executables directly with argument arrays; only the pnpm.cmd shim uses a shell. Packaging was resumed using that exact corrected helper and the already-complete original capture. No screenshot or application state was altered.

Independent .NET ZIP decoding read all 232 entries and verified each SHA-256 against the original file; no escaping paths. A headless Chromium offline-gallery check decoded all 150 images, exercised all 14 category filters and reported no page error. A labeled email contact sheet was visually inspected at native output resolution. Original image resolution is preserved.

## Selected visual inspection and review notes

Inspected final Increasing Array desktop/mobile, queen conflict, tablet Edit Distance, operational rate-limit, reset email and labeled email contact sheet; Home/mobile/auth were also inspected during capture development. Text/borders/icons accompany purposeful blue/orange/green states. The queen conflict has a × and dashed rejected cell. Edit Distance shows top/left/diagonal dependencies with arrows and USED/UPDATE labels. The rate-limit message explains waiting without exposing infrastructure secrets.

Areas for external review: desktop player columns leave substantial whitespace beneath a short visualization; queen board scale is small relative to its panel; mobile full-page views are long; the restored-draft hint can remain visible after execution; operational messages lead with technical error codes. These are recorded UX observations rather than hidden by cropping or regenerated mockups.

Capture is evidence for human review, not independent visual-regression certification. The human index includes all fifteen requested review questions; the offline gallery links to full-resolution originals.
