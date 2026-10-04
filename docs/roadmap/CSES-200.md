# CSES 200 roadmap

Current verified wave: 30 unique CSES entries (20 baseline plus 10 introductory). The next gate is 100; the 200 target remains planning only.

## Candidate waves

| Wave      | Emphasis                                            | Reusable capabilities to add                                               |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| 30 → 50   | Sorting/searching, 1D/2D DP, graph traversal        | Indexed metadata split, common scan/window/DP trace helpers                |
| 50 → 75   | Trees, range queries, shortest paths                | Binary lifting, segment tree and LCA teaching strategies                   |
| 75 → 100  | Mathematics, strings, geometry, advanced structures | Modular arithmetic, string matching, geometric and symbolic views          |
| 100 → 150 | CSES breadth in remaining categories                | Reuse existing family strategies and add oracles                           |
| 150 → 200 | Advanced variants and hard graph/range tasks        | Profile large traces, virtualize long timelines, incremental browser smoke |

The immediate gap is 70 genuinely certified problems. Current coverage is broad but shallow outside Introductory Problems. Selection must follow official IDs and a correctness oracle; do not fill quotas with duplicates or metadata-only pages.

## Bottlenecks

- The server registry eagerly imports every implementation. Split metadata from executable loaders before large waves.
- All-route browser smoke takes about 80 seconds for 30 entries. Keep lightweight route smoke for every entry and deeper browser tests per family.
- Problem certificates verify replay and evidence paths, while human review still needs to confirm pedagogical quality and independent oracle strength.
- The full development dependency audit has an unresolved `braces` advisory in the Next ESLint dependency chain; monitor for a patched upstream release.
- The local Docker Desktop Mailpit SMTP host mapping accepts TCP but does not send a greeting, blocking the isolated full email gate in this environment.
