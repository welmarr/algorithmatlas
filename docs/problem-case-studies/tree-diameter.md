# Tree Diameter — two breadth-first searches

**Problem/representation.** Validate a connected undirected tree with `n−1` edges. Tree entities have stable node IDs and hierarchy metadata for layout. An arbitrary start leads to a farthest node `u`; a second BFS from `u` yields a farthest node `v`. The `u–v` distance is a diameter of the tree.

**Implementation and trace.** `packages/problems/src/index.ts` performs both searches and directly emits semantic visits, distances, and path marks. Its curated algorithm knows the meaningful nodes; the raw trace remains empty rather than inventing machine-level operations. The result is the maximum edge count.

**Teaching/replay/visual.** The first pass identifies an endpoint, and the second pass reveals the diameter. The reducer records visited/final-path status. The tree renderer uses a hierarchical layout, node labels, explicit path cues, and state focus; it reads state instead of computing the diameter. Teaching seek lands after a grouped discovery; technical seek exposes individual visits.

**Verification/generalization.** Correctness tests compare with independent all-pairs distances on bounded trees, and browser tests check the tree at 390px width. `subordinates` uses the same tree renderer with a rooted subtree-count algorithm, showing renderer reuse across algorithms.
