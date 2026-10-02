# Dynamic Range Sum — Fenwick tree updates and queries

**Problem/representation.** Parse 1–32 values and 1–16 operations: `[1,index,value]` assigns a one-based position, while `[2,left,right]` asks for an inclusive sum. The Fenwick array stores partial sums indexed by the lowest set bit. Updating position `i` propagates its value difference to ancestors; a prefix query walks downward through covering cells. A range sum is `prefix(right)−prefix(left−1)`.

**Implementation and trace.** `packages/problems/src/extended-arrays.ts` maintains a private Fenwick array and the current values. Direct semantic `WRITE_INDEX` events show assignments; `ANNOTATE` events show each prefix-cell read and final query answer. No raw trace is invented. Array entities represent user values, while variable annotations explain internal query sums.

**Teaching/replay/visual.** A lesson groups one update propagation or range query. The reducer changes the visible value at an assignment and the named variables at query events. The array renderer and source panel show the current input state; exact event seek can inspect each intermediate prefix sum. The final output joins only query answers.

**Verification/generalization.** Correctness tests compare operations against a simple mutable-array oracle, which is deliberately independent of Fenwick logic. The sample `[1,2,3]`, query all, update second to 5, query all yields `6 9`. The same event contract can illustrate a segment tree with a different internal representation.
