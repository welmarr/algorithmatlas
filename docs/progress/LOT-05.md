# LOT 05 — Independent algorithm lab

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `ca6bd1d`

## Implemented

- Replaced the lab link hub with an independent workspace at `/lab`. It runs algorithms without loading a CSES problem definition or requiring a problem page.
- Added editable bounded inputs for arrays, grids, graphs, and trees. The eight built-in algorithms include sorting, search, BFS, DFS, and tree traversal. Every run generates deterministic semantic events and uses the shared simulation timeline.
- Added teaching and technical event modes, Play/Pause, previous/next, seek, replay reset, event map, visualization, collection and variable inspectors, and algorithm outline. Changing the structure or algorithm runs it on the current editor input.
- Documented input limits, algorithm behavior, and the fact that the lab runs built-in algorithms rather than arbitrary edited code in `ALGORITHM-LAB.md`.

## Tests

- Unit and integration: **90 passed, 0 failed, 0 skipped**. New tests cover the eight algorithms, deterministic replay, validation, and independent sorting and graph BFS oracles.
- E2E: **13 passed, 0 failed, 0 skipped**. New tests cover editing, seeking, playback, reset, structure switches, and narrow viewport layout.
- Format, lint, typecheck, and production build: passed. The production build generated the `/lab` route.
- Docker image build: passed. Updated local container on port 3000 returned HTTP 200 for `/lab` and a healthy `/api/health` response.

## Known limitations

- The lab does not execute arbitrary user code; it runs the displayed built-in algorithms. Editable code execution remains the bounded Increasing Array vertical slice.
- Interactive bounds keep traces readable: 1–20 array values, 2–8 by 2–8 grids, 2–10 graph nodes with up to 24 edges, and 1–10 tree nodes. The code panel shows algorithm outlines rather than an exact source map for each semantic event.
- Comparison mode, contributor extension tooling, AI protocol expansion, isolated multi-language execution, persistence, and hardening remain later lots.

## Cleanup

- Removed generated Playwright results and two local visual-review screenshots after verification. No Docker volume is labeled for the Simulator Compose project; volumes belonging to other projects were left intact.
- Historic audit files remain unchanged; no remote push was made.

## Next lot

Lot 06 — Algorithm comparison.
