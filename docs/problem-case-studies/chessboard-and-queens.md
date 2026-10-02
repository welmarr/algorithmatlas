# Chessboard and Queens — reversible backtracking

**Problem/representation.** Parse a square 1–6 board of open and blocked cells. `grid:r:c` entities show squares. A recursive search chooses one column per row while tracking occupied columns and diagonals `r−c` and `r+c`. Every legal arrangement corresponds to exactly one sequence of row choices.

**Implementation and trace.** `packages/problems/src/extended-mixed.ts` directly emits `MARK` when placing and `UNMARK` when undoing a queen, plus a solution-count annotation at a complete board. No raw trace is invented. Backtracking restores all three occupancy sets after each branch, so sibling branches see the correct state.

**Teaching/replay/visual.** Learning steps emphasize choice, conflict pruning, and undo; technical events preserve every placement/removal. The reducer updates square status and solution count. The grid renderer labels blocked cells and active choices in text as well as color. Timeline rewind and seek demonstrate the reversible search without mutating an earlier snapshot.

**Verification/generalization.** Examples, blocked-board cases, and an independent oracle are covered in `tests/correctness.test.ts`; browser tests exercise the grid renderer. The same event vocabulary can illustrate other bounded recursive searches with explicit undo operations.
