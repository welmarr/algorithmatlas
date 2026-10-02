# LOT 04 — Representative problem suite

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `ef2820b`

## Implemented

- Expanded the catalog from five to twenty interactive problems. New coverage includes sorting, two pointers, sliding window, binary search, 2D DP, DFS, weighted shortest path, tree traversal, static and dynamic range queries, strings, backtracking, modular arithmetic, geometry, and disjoint set union. Existing problems cover arrays, 1D DP, grid BFS, graph BFS, and tree diameter.
- Each addition has an official CSES source link, an original summary, interactive bounds, validated custom JSON input, a reference algorithm, deterministic semantic events, learning content, complexity, and generated learning steps.
- The fifteen new reference code bodies execute for their defaults and examples and agree with their traced results. The problem pages accept new input and regenerate trace, output, state, and steps.
- Introduced `CREATE_ENTITY` for roads that appear only when built and `SET_SUBTREE_SIZE` for descendant counts. Promoted `RELAX_EDGE` and `UNMARK` to active vocabulary with producers. The tree renderer shows descendant counts separately from depth.
- Restricted the special Increasing Array teaching-step wording to that problem. Other array families now follow their own salient events.
- Updated the catalog overview, SDK, architecture, testing guide, roadmap, and event governance.

## Tests

- Unit and integration: **79 passed, 0 failed, 0 skipped**. Includes examples for all fifteen additions, rejected malformed inputs, executable reference code checks, and independent randomized oracles for the feasible families.
- E2E: **10 passed, 0 failed, 0 skipped**. New checks regenerate Edit Distance from custom input and confirm Road Construction reveals edges during playback.
- Format, lint, typecheck, and production build: passed. Next.js generated all twenty problem routes.
- Docker image build: passed. Updated container at port 3000 returned HTTP 200 for `/problems/edit-distance` and a healthy `/api/health` response.

## Known limitations

- Interactive bounds are intentionally smaller than CSES judge bounds. Sliding Window Sum uses an explicit sequence instead of CSES's generated sequence; Chessboard and Queens allows 1–6 rows instead of a fixed eight; Exponentiation presents one query at a time.
- Shortest Routes I uses an O(V² + E) Dijkstra selection for readable small graphs. The graph renderer still uses circular positioning, and Polygon Area currently shows edge cross-product contributions in an array view rather than spatial coordinates.
- Reference code is displayed for the new problems, while editable code execution remains the bounded Increasing Array vertical slice. Independent lab, comparison mode, contributor tooling, AI protocol expansion, isolated multi-language execution, persistence, and hardening remain later lots.

## Cleanup

- No Docker volume is labeled for the Simulator Compose project. Other named volumes belong to separate projects and were left intact. Generated Playwright results were removed after verification.
- Historic audit files remain unchanged; no remote push was made.

## Next lot

Lot 05 — Real algorithm lab.
