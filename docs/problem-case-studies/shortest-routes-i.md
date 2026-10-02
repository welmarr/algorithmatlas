# Shortest Routes I — weighted directed graph

**Problem/representation.** Parse 2–12 named nodes, up to 30 directed positive-weight edges, and a source. Nodes use `graph:node:<name>`; edges use `graph:edge:<index>` with direction and weight metadata. The reference algorithm selects the nearest unsettled finite-distance node, settles it, and relaxes outgoing edges. Positive weights make each settled distance final.

**Implementation and trace.** `packages/problems/src/extended-graphs.ts` builds the entities and directly instruments semantic events such as `SET_DISTANCE`, `RELAX_EDGE`, and visits. This curated code already knows each relaxation, so no lower-level raw trace is fabricated. The final output lists distances, including unreachable nodes. The reference source is displayed but is not an editable graph-code runner.

**Teaching/replay/visual.** Learning steps group distance initialization, settlement, and useful relaxations. The event-specific validator checks payloads; the reducer stores node distances and edge state. The graph renderer uses directed arrows, weight labels, distance labels, predecessor/path cues, and active text to show why a better route was found. Timeline seek reconstructs any prior distance state.

**Verification/generalization.** Representative and seeded correctness tests compare the result with independent shortest-path logic and replayed state. The local Python semantic interpreter can classify a narrower observed `dist[v]` update as a relaxation only when source, edge, and numeric evidence agree; that is separate from this curated instrumentation.
