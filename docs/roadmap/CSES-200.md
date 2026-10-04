# CSES 200 roadmap

Current verified wave: 100 unique certified CSES entries. The 200 target remains planning only; the 100-task release is still gated by the development dependency audit, final visual/service regressions, fresh clone, and remote CI.

## Candidate waves

| Wave      | Emphasis                                                                        | Reusable capabilities to add                                                           |
| --------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 30 → 50   | Sorting/searching and 1D/2D DP (completed)                                      | Shared SDK, array/DP/grid renderers, independent family oracles                        |
| 50 → 75   | Graphs, trees, range queries, strings, advanced DP (completed)                  | Topological sort, binary lifting, segment tree, trie, Z-function                       |
| 75 → 100  | Mathematics, geometry, graph and tree breadth, advanced range tasks (completed) | Modular arithmetic, geometric decisions, shortest paths, LCA, Fenwick order statistics |
| 100 → 150 | CSES breadth in remaining categories                                            | Reuse existing family strategies and add oracles                                       |
| 150 → 200 | Advanced variants and hard graph/range tasks                                    | Profile large traces, virtualize long timelines, incremental browser smoke             |

The next content gap is 100 additional genuinely certified problems. Sorting/searching (10 exact-category entries), string variants (5), and advanced graph/geometry problems remain useful candidate areas. The current 100 includes 17 exact `Graphs` entries plus graph-oriented `Shortest Path` and `Depth-First Search` entries, 10 `Trees`, 10 `Range Queries`, 8 `Mathematics`, and 3 `Geometry`. Selection must follow official IDs and a correctness oracle; do not fill quotas with duplicates or metadata-only pages.

## Bottlenecks

- The server registry still eagerly imports every implementation for static generation and metadata pages. The client workbench now loads only the selected family, reducing initial problem-route JS from 219 kB to 133 kB at 75 entries. Consider a generated lightweight metadata index as server import cost grows.
- All-route browser smoke takes about 3.3 minutes for 100 entries. Keep lightweight route smoke for every entry and deeper browser tests per family.
- Problem certificates verify replay and evidence paths, while human review still needs to confirm pedagogical quality and independent oracle strength.
- The full development dependency audit has an unresolved `braces` advisory in the Next ESLint dependency chain; the advisory currently lists no patched upstream release. Keep this release gate strict and monitor upstream.
- Docker Desktop Mailpit SMTP startup required disabling reverse DNS in disposable verification containers. That setting is now part of the isolated test harness; retain its 220-greeting readiness check.
