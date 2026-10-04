# CSES graph algorithms: one state model, distinct invariants

The seven additional graph tasks in the CSES 100 expansion use the same graph entities and bounded parser rules. Nodes retain stable `graph:node:*` identities, and edges retain `graph:edge:*` identities. The renderer reads those entities; each deterministic problem implementation decides which roads, routes, or assignments are valid.

## Connected components and bipartiteness

**Building Roads (1666)** explores each undirected component and records one representative. If there are `c` components, at least `c − 1` new roads are necessary because one road can reduce the component count by at most one. Joining consecutive representatives meets the lower bound. The trace first discovers each component, then creates the proposed bridge edges. The oracle checks the count and verifies that the proposed graph is connected.

**Building Teams (1668)** colors each component during breadth-first search. An edge forces opposite colors. When both endpoints already have the same color, no two-team solution exists. The oracle tries every two-color assignment on small graphs. A successful output is checked edge by edge, so correctness does not rely on one canonical coloring.

## Ordering and cycles

**Course Schedule (1679)** uses Kahn's indegree algorithm. Removing a course only after its indegree reaches zero makes every output prefix valid. If the queue empties before all courses have been removed, the remaining graph contains a directed cycle. Its oracle independently explores bounded orders and validates every prerequisite position in a successful result.

**Round Trip II (1678)** searches for a directed cycle. DFS colors distinguish unseen, active, and finished cities. A flight to an active ancestor closes a cycle on the current path. Parent links reconstruct that route. The oracle checks every flight in the output, the repeated start/end, and distinct intermediate cities. A flight to a finished city is not mistaken for a cycle.

## Spanning trees and all-pairs routes

**Road Reparation (1675)** sorts roads by cost and uses disjoint-set union to accept only roads that join different components. The cut property justifies each accepted minimum-cost choice. The trace marks accepted edges and explains rejected cycle edges. The bounded oracle enumerates candidate spanning edge subsets and finds the true minimum cost, including disconnected cases.

**Shortest Routes II (1672)** starts with direct undirected road costs and zero diagonal distance. Floyd–Warshall permits one additional intermediate city at a time. After city `k`, `distance[a][b]` is the shortest route with intermediate cities drawn from `1…k`. Each improvement is narrated in the trace. The independent oracle runs a separate shortest-path search for each query, including disconnected and self queries. The graph visualization marks each permitted intermediate city; table values appear in deterministic explanations.

## Strong connectivity

**Flight Routes Check (1682)** traverses the original graph from city 1 and then the reversed graph from city 1. The first traversal proves `1 → v` for each reached city. The second proves `v → 1`. Both together give a route between every ordered pair. If either traversal misses a city, the returned pair is a concrete counterexample. The oracle computes reachability for all sources and checks the witness rather than demanding a particular witness.

Each interactive graph is intentionally small enough to show its vertices and meaningful decisions. The published complexity describes the algorithmic family on general input; the JSON editor's smaller bound is a visual and execution safety limit. Determinism, replay, Teaching Steps, choreography capability, and route/input checks are enforced by the problem factory.
