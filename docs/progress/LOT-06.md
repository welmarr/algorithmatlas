# LOT 06 — Algorithm comparison

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `0a46793`

## Implemented

- Added `/lab/compare` with graph BFS versus DFS, grid BFS versus DFS, and tree preorder DFS versus level-order BFS. A shared validated JSON input regenerates both deterministic traces without depending on a CSES problem page.
- Each side has an independent timeline, seek slider, event log, playback controls, visualization, collection and variable inspectors, result, complexity description, and per-operation event counts. Optional synchronized playback advances one semantic event per side on each tick; independent seek remains available.
- Added live and total counts for semantic events, unique visited and discovered entities, and queue/stack operations. These are explicitly identified as trace metrics, not wall-clock benchmarks.
- Added independent result checks for valid graph/grid routes, BFS shortest unweighted length, unreachable goals, and complete tree traversal. The result explanation distinguishes a valid longer DFS route from BFS's shortest route.
- Added comparison navigation and documentation. Visual review led to a compact comparison heading and editor so the two players appear sooner on desktop and mobile.

## Tests

- Unit and integration: **98 passed, 0 failed, 0 skipped**. New checks cover shared input, independent timelines, seeking, result validation, metrics, unreachable goals, and sixty varied graphs.
- E2E: **15 passed, 0 failed, 0 skipped**. New checks cover edited shared input, synchronized play, independent seeking, error feedback, pair switching, and 390px layout. Focused comparison browser tests passed again after the final spacing adjustment.
- Format, lint, typecheck, and production build: passed. The build generated `/lab/compare`.
- Docker image build: passed. Updated local container on port 3000 returned HTTP 200 for `/lab/compare` and a healthy `/api/health` response.

## Known limitations

- The initial comparison set is traversal focused. Dijkstra versus Bellman–Ford, merge sort versus quick sort, and naive versus optimized examples are not yet present. The pair definition and comparison model are structured for additions.
- Synchronized playback advances event positions together rather than aligning semantically equivalent operations. Each side can have a different trace length. Inputs remain within the Algorithm Lab's interactive bounds.
- Comparison runs built-in algorithms. Arbitrary user-code execution still requires the future isolated runtime.

## Cleanup

- Removed generated Playwright results and two local comparison screenshots after visual review. No Docker volume is labeled for the Simulator Compose project; other project volumes were left intact.
- Historic audit files remain unchanged; no remote push was made.

## Next lot

Lot 07 — Contributor problem SDK, renderer SDK, and versioned community packs.
