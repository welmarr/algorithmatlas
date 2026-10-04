# CSES 200 roadmap

Current verified wave: 75 unique certified CSES entries. The next gate is 100; the 200 target remains planning only.

## Candidate waves

| Wave      | Emphasis                                                            | Reusable capabilities to add                                               |
| --------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 30 → 50   | Sorting/searching and 1D/2D DP (completed)                          | Shared SDK, array/DP/grid renderers, independent family oracles            |
| 50 → 75   | Graphs, trees, range queries, strings, advanced DP (completed)      | Topological sort, binary lifting, segment tree, trie, Z-function           |
| 75 → 100  | Mathematics, geometry, graph and tree breadth, advanced range tasks | Modular arithmetic, geometric decisions, shortest paths, LCA               |
| 100 → 150 | CSES breadth in remaining categories                                | Reuse existing family strategies and add oracles                           |
| 150 → 200 | Advanced variants and hard graph/range tasks                        | Profile large traces, virtualize long timelines, incremental browser smoke |

The immediate gap is 25 genuinely certified problems. Mathematics and geometry are especially thin. Graph, tree, range, and sorting coverage also needs more breadth. Selection must follow official IDs and a correctness oracle; do not fill quotas with duplicates or metadata-only pages.

## Bottlenecks

- The server registry still eagerly imports every implementation for static generation and metadata pages. The client workbench now loads only the selected family, reducing initial problem-route JS from 219 kB to 133 kB at 75 entries. Consider a generated lightweight metadata index as server import cost grows.
- All-route browser smoke takes about 2.5 minutes for 75 entries. Keep lightweight route smoke for every entry and deeper browser tests per family.
- Problem certificates verify replay and evidence paths, while human review still needs to confirm pedagogical quality and independent oracle strength.
- The full development dependency audit has an unresolved `braces` advisory in the Next ESLint dependency chain; monitor for a patched upstream release.
- The local Docker Desktop Mailpit SMTP host mapping accepts TCP but does not send a greeting, blocking the isolated full email gate in this environment.
