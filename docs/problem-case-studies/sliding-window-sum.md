# Sliding Window Sum — shared work between adjacent windows

**Problem/representation.** Parse 1–32 integers and a window width from 1 to `n`. Each input value is an `array:i` entity. The first window is summed once; moving right subtracts the outgoing value and adds the incoming value. This invariant gives every fixed-width sum in linear time.

**Implementation and trace.** `packages/problems/src/extended-arrays.ts` directly emits `MARK`, `UNMARK`, and `ANNOTATE` drafts as it updates the running sum. There is no synthetic raw trace. The result is the ordered list of sums, and custom input re-executes the loop. For `[1,3,2,5]` at width two, the output is `4 5 7`.

**Teaching/replay/visual.** Grouped steps describe initial inclusion and each shift. The reducer changes array status and the `sum` variable; the array and variables views show incoming/outgoing values with text cues. Exact event seek can stop after removal but before addition, while teaching seek lands at completed windows.

**Verification/generalization.** Seeded correctness cases compare against direct re-summing of every window in `tests/correctness.test.ts`; representative tests check trace replay. This pattern generalizes to other sliding-window statistics if the state and invariant are defined explicitly.
