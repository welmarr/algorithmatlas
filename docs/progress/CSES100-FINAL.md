# CSES 100 and UX polish final candidate

**Starting SHA:** `ec610a1443a58473936c6bdab00ef184a9a404e5` on `main`.  
**Ending code candidate SHA:** `442f9634caece565542fbb7918b0d7fc414babc5` on `feature/cses100-ux-polish`.
**Certified CSES count:** 20 → 100, with zero partial/failed entries.  
**Release status:** held on the feature branch; no main merge or release tag.

## Product and architecture

Authentication now uses focused login, registration, recovery, reset and verification routes. Home has a three-state live simulation, the Library searches and filters 100 lightweight records including certified algorithm names, and the Dashboard guides verified learners from saved work and category progress. The simulator prioritizes visualization and reasoning, uses plain-language phases, wraps long reference code, and keeps mobile playback reachable. Color uses restrained category tints for navigation and labeled semantic states for algorithms.

The 80 added official tasks came in infrastructure/introductory, 50, 75 and 100 waves. New reusable content spans dynamic programming, graph traversal and shortest paths, DSU/MST/SCC, strings, segment/Fenwick range queries, tree lifting/LCA/Euler techniques, mathematics and geometry. Problem SDK input/trace/Teaching Step contracts stayed shared; selected-family client imports keep Home and Library from shipping every runner. Six renderer kinds and 19 choreography strategy names cover the 100 certified entries. No new problem-ID branches were added to the generic simulation core or renderers.

## Verification

`pnpm problems:release` passed its hard 100-count assertion, 128 focused tests and custom-input route smoke on every certified page. `pnpm verify` passed 315 tests, formatting, lint, types and production build. The final `pnpm verify:isolated` passed migrations, runner image, 347 service-backed tests, build and production dependency audit, then stopped at the all-dependency audit. `pnpm verify:public-runner`, `pnpm verify:prod-ops` and the supplemental `pnpm verify:browser` passed separately; the last ran 34 active production browser tests and built a web image. The production-only audit found no known issues.

The all-dependency audit reports a high `braces <=3.0.3` advisory in the development Next ESLint plugin chain, with no patched version. The strict full gate is therefore **failed**. A true GitHub clone passed frozen install, migrations, certification/all-route smoke, fast verification, public-runner/prod-ops regression and a separate production browser/web-image gate, then failed the full audit at the same dependency. [GitHub CI run 37195396541](https://github.com/welmarr/algorithmatlas/actions/runs/37195396541) passed certification but failed validation at that audit. The detailed results are in the [audit test report](../audit/cses100-ux-polish/TEST_REPORT.md). This report does not claim release readiness.

## Visual, performance and limits

The final real-UI package at `artifacts/visual-audit/2026-10-04T04-05-18Z` contains 234 screenshots and a complete 118-route inventory, including all 100 problem routes, authenticated states, mobile and reduced motion. An additional 54-view family matrix passed. Reviewed views show clearer hierarchy and coherent color, with no page-level overflow. Geometry primitives rely on equation/case views rather than a drawn directed line. Some compact reference programs still need hand-formatted code for teaching quality; wrapping now keeps them visible.

Production first-load JS is 107 kB Home, 108 kB Library, and 133 kB selected problem. A clean web Docker build's application build stage took 44.2 seconds. One local production browser sample measured Library ready in 193 ms after a cold Home navigation and 17–23 ms search completion over 100 entries. Build memory and server registry import cost were not isolated; both are future profiling tasks for CSES 200.

## Failures fixed and cleanup

The isolated Mailpit SMTP greeting was restored by disabling reverse DNS only in its disposable container. Anonymous return links now preserve a problem draft after account navigation. Capture selectors were updated for human phase labels and the route inventory includes the new Library/auth pages. Browser tests were updated to open the deliberately collapsed Teacher/event-log panel. A CPU-heavy 55-case oracle retains all assertions and has a specific ten-second timeout after an intermediate fresh-clone run exceeded Vitest's default by 0.39 seconds. Failed and superseded project-scoped visual captures and disposable test containers were removed; the final package and earlier baseline package remain. No unrelated Docker resources were pruned.

The [audit directory](../audit/cses100-ux-polish/README.md) contains exact IDs, feature evidence, test results, visual review, performance and the open release gate. The [CSES 200 roadmap](../roadmap/CSES-200.md) identifies the remaining category and scale work.
