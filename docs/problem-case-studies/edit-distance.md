# Edit Distance — two-dimensional dynamic programming

**Problem/representation.** Parse two uppercase words of at most eight characters. Entity `dp:i:j` represents the least edits converting the first `i` characters of one word to the first `j` of the other. Empty-prefix base cases cost `i` deletions or `j` insertions.

**Implementation and trace.** `packages/problems/src/extended-mixed.ts` fills `dp[i][j]` from deletion, insertion, and substitution/match predecessors. Each `DP_BASE_CASE` and `DP_UPDATE` event names a target; updates also reference three dependencies. The recurrence is correct because every optimal edit sequence has one of those final operations. This curated implementation directly emits semantic events; no raw trace is claimed.

**Teaching/replay/visual.** Learning steps present base cases and cell decisions. The reducer writes cell values. The DP renderer arranges rows and columns from entity metadata, highlights dependencies and the active target, and labels cells for assistive technology. Timeline seek recreates the exact partially filled table; final output is the bottom-right value.

**Verification/generalization.** `tests/correctness.test.ts` checks examples and independent dynamic-programming results. A browser custom-input test changes `CAT` to `CUT` and confirms output 1. The same target/dependency event model supports 1D DP such as Dice Combinations.
