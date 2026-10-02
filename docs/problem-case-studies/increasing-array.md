# Increasing Array — greedy writes from executed code

**Problem/representation.** Parse 1–64 integers into array entities `array:0…n−1`; index labels remain stable. For each position after the first, the least legal final value is `max(previous final value, current value)`. Increasing exactly by the difference is forced because earlier positions cannot decrease. Summing those differences gives the minimum moves.

**Implementation and trace.** `packages/problems/src/index.ts` registers the problem and `packages/code-runtime` interprets the editable JavaScript subset. The executed reads, comparisons, assignments, and variable changes become raw operations, then array semantic events including `WRITE_INDEX`. A run keeps the original input, source references, semantic events, and output. With `[8,2,5,1,7]`, four writes yield `[8,8,8,8,8]` and 17 moves. Changing either input or code reruns this path, so the trace is not a static illustration.

**Teaching/replay/visual.** The mapping groups technical operations into an initial state, meaningful increases, and a final result. `SimulationTimeline` reduces validated events; `WRITE_INDEX` updates the targeted entity, and the array renderer reads the state. An update shows a text `before → after` cue and the changed cell, while the code panel highlights the executed source line. Learning seek maps to an event boundary; technical seek can inspect every read or comparison.

**Verification/generalization.** `tests/correctness.test.ts` includes a seeded oracle; `tests/e2e/player.spec.ts` checks each intermediate array and moves value for the five-number input and reruns edited code. The same raw-to-semantic pattern applies to other bounded array algorithms, but only this curated page currently has editable browser code.
