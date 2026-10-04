# CSES factory checkpoint: 20 → 30

**Starting SHA:** `ec610a1443a58473936c6bdab00ef184a9a404e5`  
**Implementation checkpoint SHA:** `331fad1` (`feature/cses100-ux-polish`)  
**Certified count:** 20 before; 30 after; target 100.

## Family and factory changes

Ten official Introductory Problems were added: Weird Algorithm (1068), Missing Number (1083), Repetitions (1069), Permutations (1070), Number Spiral (1071), Two Knights (1072), Two Sets (1092), Bit Strings (1617), Trailing Zeros (1618), and Coin Piles (1754). Each has an original summary and teaching explanation, bounded JSON parser, complete reference algorithm, semantic trace, Teaching Steps, visualization, and known/example fixture. The existing SDK and `array`/`variables` renderers were reused. The existing choreography layer now selects a DSU strategy for Road Construction.

`pnpm problems:status` emits the generated catalog, 30 certificates, and machine-readable category/algorithm/renderer/choreography counts only after the complete evidence suite passes. `pnpm problems:verify` adds all-route browser custom-input reruns. `pnpm problems:release` is a hard count gate; it still fails at 30. See `docs/CSES-PROBLEM-FACTORY.md` for contributor steps and known checker limits.

## Tests and failures found

- Forty focused Vitest tests passed across certification, baseline correctness, representative problems, and new independent introductory oracles.
- New oracle checks include exhaustive small inputs or direct enumeration for missing values, DNA runs, coin-pile moves, knight attacks, subset sums, and spiral layers; exact BigInt modular checks for bit strings; and bounded/boundary checks for the remaining tasks.
- All 30 routes loaded with visualization and controls, then accepted each problem's example as custom input (`pnpm problems:verify`, 1.3 minutes).
- One exhaustive Missing Number test exceeded Vitest's default five-second timeout. It was reduced to complete small-size coverage plus representative large boundaries, then passed. The status command was fixed to avoid publishing a certified count after any evidence test fails.
- `pnpm verify` passed after the wave. The full isolated gate remains blocked by Docker Desktop's Mailpit host SMTP mapping: TCP connects, but no SMTP greeting arrives. The verification script now tests that greeting before claiming readiness.

## Visuals, performance, and remaining work

The earlier UX screenshot set covers representative array/graph/DP/range/tree/string/geometry views at the 20-problem baseline. New introductory route smoke passed, but the ten new views have not received a representative visual audit. Build first-load JS is 107 kB Home, 108 kB Library, and 192 kB workbench. The server still eagerly imports the complete registry; metadata/implementation splitting is needed before 100–200 entries. No temporary containers remain from the isolated verification attempts; ignored certificate and screenshot artifacts remain for inspection.

The count is 70 short of the release requirement. Category breadth is still weak in DP, graphs, trees, range queries, mathematics, strings, and geometry. No merge or release tag is permitted yet.
