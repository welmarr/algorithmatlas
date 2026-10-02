# String Matching — KMP prefix reuse

**Problem/representation.** Parse uppercase text (up to 32 characters) and pattern (up to 16). Each text position is an array entity. The prefix table records the longest proper prefix of each pattern prefix that is also a suffix. On mismatch or full match, falling back through this table avoids moving backward through text.

**Implementation and trace.** `packages/problems/src/extended-mixed.ts` builds the prefix table, scans text, and directly emits semantic marks and annotations for comparisons, border fallback, and occurrences. There is no fabricated raw layer. The final result counts overlapping occurrences; `ABABABA` with `ABA` gives three.

**Teaching/replay/visual.** Steps group table preparation, matching progress, and matches. The reducer updates active/path status for text entities plus matched-prefix variables. The array renderer shows which character is inspected, while explanations name the reused border. Snapshot and technical seek reconstruct any scan position.

**Verification/generalization.** Correctness tests compare KMP counts with an independent direct substring scan, including overlaps. The same array renderer can display other string scans because it consumes state rather than a string-matching problem ID.
