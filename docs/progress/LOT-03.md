# LOT 03 — Renderer foundation

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `78ee08f925d27c559628017aa7414733ea3b3691`

## Implemented

- Expanded the renderer boundary to ten families: array, grid, graph, tree, 1D/2D DP, queue, stack, heap/priority queue, variables, and code.
- Replaced the tree's fixed index positions with a deterministic hierarchical layout that centers parents above their children.
- Added directed graph arrows, edge weights, active/visited/path edge cues, predecessor links, and distance/parent labels without a third-party graph dependency.
- Added 2D DP layout and visible dependency/target cues. `DP_TRANSITION` highlights candidates without mutating state; `DP_UPDATE` changes only the first target entity.
- Added ordered collection cards with front/top/minimum labels and accessible item names. The player now renders BFS queues as cards rather than inspector text. Stack and heap events have tested reducer semantics, including minimum-priority extraction.
- Extracted reusable variable and code views from the player. Added `/lab/renderers` to show all ten families and linked it from Algorithm Lab.
- Updated contextual graph and DP legends, responsive layout, and event governance for newly implemented experimental semantics.

## Changed architecture

- `RendererKind` covers ten generic view types. Components read simulation state and do not branch on problem IDs.
- Pure tree and DP layout functions can be tested without React. SVG and DOM components remain behind the `Visuals` selector.
- Collection reducers enforce FIFO/LIFO/minimum ordering and reject invalid removal or nonnumeric heap priorities.

## Tests

- Unit and integration: **41 passed, 0 failed, 0 skipped**. Includes isolated component markup checks, tree/DP layout, queue/stack/heap semantics, DP transition state, and prior correctness oracles.
- E2E: **9 passed, 0 failed, 0 skipped**. All ten gallery renderers have labeled views and no page overflow at 390px.
- Security: no new sandbox surface; event and state validation tests pass.
- Format, lint, typecheck: passed.
- Production build: passed, including the new gallery route.
- Docker: image build passed; temporary container returned HTTP 200 from `/api/health` and `/lab/renderers`, then was stopped.

The first isolated component run used Vitest's classic JSX transform and failed because React was not injected. Vitest now uses automatic JSX. An initial gallery test matched both Queue and Priority queue by an imprecise region name; exact accessible-name selection resolved it. The final full suites passed.

## Known limitations

- Dense graphs still use circular positioning, so some edge labels may overlap; a larger graph layout engine is deferred behind the renderer boundary.
- Stack, heap, and 2D DP transition demonstrations currently use gallery/sample state and semantic tests. Curated algorithms that produce those states arrive in Lot 04.
- The heap view shows ordered priority items rather than an animated binary-tree heap layout.

## Documentation updated

- `RENDERER-SDK.md`, `ARCHITECTURE.md`, `README.md`, `TESTING.md`, and `docs/protocol/EVENT_GOVERNANCE.md`.
- Historic audit files remain unchanged.

## New technical debt

- The ten-family gallery creates synthetic states by hand. A fixture helper could reduce duplication when the problem catalog grows.

## Deferred items

- A representative algorithm suite for collection and 2D DP producers, advanced graph geometry, persistence, and later platform lots.

## Next lot

Lot 04 — Representative problem suite.
