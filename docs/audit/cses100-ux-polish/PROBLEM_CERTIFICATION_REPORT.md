# Problem certification

`pnpm problems:release` reports **100 registered, 100 certified, zero partial, zero failed** against a hard minimum of 100. The starting set had 20 certified entries, so this milestone added 80. Every entry has a distinct official CSES task ID and source URL.

The certificate records in `packages/problems/src/certification.ts` identify algorithm, visual strategy, independent oracle or property test, edge cases and browser evidence. `tests/problem-certification.test.ts` checks metadata, input and solution availability, deterministic trace, replay/result agreement, Teaching Steps and supported visual strategy. The focused suite passed **128 tests in 19 files**. The release command also opens each route and reruns the published example as custom input. No metadata-only entries count.

The independent seeded and exhaustive family tests include direct number-theory calculations, brute permutations/distributions, geometry predicates, naive range scans, parent-chain and BFS tree answers, simple-path graph enumeration, Floyd–Warshall comparisons, SCC reachability and semantic cycle/centroid validation. See the wave reports and `docs/book/cses-wave-100-families.md` for the individual method and limitation of each oracle.

The current renderer breakdown is array 38, DP 16, graph 19, grid 5, tree 11 and variables 11. There are **19 choreography strategy names** in the machine status. The 100-task screenshot capture and all-route smoke cover browser loading; family E2E and the focused tests cover deeper state behavior. This evidence does not replace a human proof review of every lesson or a full accessibility audit.

Exact IDs and per-entry statuses are in [status.json](status.json) and [the catalog](../../CSES-CATALOG.md).
