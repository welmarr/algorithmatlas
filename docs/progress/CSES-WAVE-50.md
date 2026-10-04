# CSES wave 50 checkpoint

**Starting SHA:** `bc30baef7d9936390ad7b9ab69ba6cd3d4c1d092`  
**Ending implementation SHA:** `f283230` (`feature/cses100-ux-polish`)  
**Unique certified CSES count:** 30 → 50.

## Families and implementation

Nine Sorting and Searching problems were added: Maximum Subarray Sum, Stick Lengths, Missing Coin Sum, Collecting Numbers, Playlist, Nearest Smaller Values, Subarray Sums I, Subarray Sums II, and Subarray Divisibility. Eleven Dynamic Programming problems were added: Minimizing Coins, Coin Combinations I/II, Removing Digits, Grid Paths I, Book Shop, Money Sums, Two Sets II, Increasing Subsequence, Rectangle Cutting, and Array Description. All use official CSES IDs and original summaries/teaching copy.

The existing Problem SDK, semantic reducer, and `array`/`dp`/`grid` renderers were reused. There are no problem-ID branches in generic renderers. DP, sorting, sliding-window, range, array, and generic grid choreography profiles were reused. The book's [CSES DP and scans case study](../book/cses-dp-and-scans.md) explains the major recurrences and trace choices.

## Evidence

- `pnpm problems:status`: 50 unique registered, 50 certified, zero partial/failed. Generated catalog and status are in `docs/CSES-CATALOG.md` and `docs/progress/cses-status.json`.
- `pnpm problems:verify`: 62 focused Vitest tests passed, plus all 50 routes loaded and reran their example as custom input. The browser route smoke took 2.1 minutes.
- `pnpm verify`: formatting, lint, types, 199 tests passed (36 opt-in/environment tests skipped), and production build passed with 80 static pages.
- Independent oracles directly enumerate subarrays, subsets, ordered coin sequences, coin-count vectors, grid paths, valid arrays, partitions, and increasing subsequences; use breadth-first search for minimum steps; and use top-down cutting for the rectangle task. Every new default/example also agrees with its displayed reference algorithm.
- Twenty-six real anonymous desktop/mobile screenshots were captured under `artifacts/visual-audit/cses100-ux-polish`. Representative new array, prefix-sum, coin-DP, grid-DP, and table-DP views were reviewed. A mobile sticky playback panel obscured the visualization and left a layout gap in full-page capture; the panel now follows the visualization in normal flow. The recapture shows clear controls and no overlap. Internal `GENERIC` text was replaced by learner-facing reasoning labels. Authenticated/dashboard views still need visual capture.

## Performance, limitations, cleanup

Build first-load JS at 50: Home 107 kB, Library 108 kB, problem workbench 201 kB (192 kB at 30). The server registry and client workbench still import all implementations eagerly; split metadata and load selected implementations before the 100–200 catalog becomes expensive. Search/filter latency at 100+ is not yet measured. Interactive inputs are intentionally bounded for legible traces; contest algorithms and complexity explanations still represent the official tasks.

The release is **50 problems short**. Graph, tree, range-query, mathematics, string, and geometry quotas remain weak. The full email/runner/prod-ops gates, development dependency audit, fresh clone, CI, and final visual/accessibility audit remain open. No merge or release tag is authorized by the prompt's release policy. The screenshot and certificate artifacts are ignored; disposable `atlas-verify-*` containers were checked and none remained after earlier attempts.
