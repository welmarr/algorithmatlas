# Labyrinth — grid breadth-first search

**Problem/representation.** A bounded character grid supplies walls, one start, and one target. Each `grid:r:c` entity records coordinates and wall/open status. Breadth-first search explores open neighbors in distance layers. The first time the target is reached, its parent chain is a shortest path because every edge costs one step.

**Implementation and trace.** `packages/problems/src/index.ts` validates rectangular rows and unique endpoints, runs the queue-based reference algorithm, and emits domain-aware BFS raw operations. `packages/problems/src/bfs-mapper.ts` turns them into discovered/visited, parent, queue, and final-path semantic events; it does not issue color commands. The output is a path or an unreachable result based on actual custom input.

**Teaching/replay/visual.** Grouping emphasizes frontier expansion and path reconstruction rather than every queue micro-operation. The reducer changes entity status and parent metadata. The grid renderer reads coordinates, cell status, active focus, and path labels from canonical state; the same state can be revisited through snapshots or precise technical seek. Text descriptions identify exploration and final path without relying on color.

**Verification/generalization.** Input errors and shortest paths are checked against independent BFS cases in `tests/correctness.test.ts` and UI behavior in `tests/e2e/player.spec.ts`. `counting-rooms` reuses grid state but explores all connected components instead of reconstructing one route.
