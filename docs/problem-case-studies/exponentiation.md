# Exponentiation — binary modular power

**Problem/representation.** Parse nonnegative base and exponent up to one billion. The state has `result`, `power`, and `remaining` variables. At every iteration, `result × power^remaining` is congruent to the original power modulo 1,000,000,007. If the remaining exponent is odd, multiply `result`; then square `power` and halve the exponent.

**Implementation and trace.** `packages/problems/src/extended-mixed.ts` uses `BigInt` for products before converting bounded modulo values to state numbers. It directly emits `ANNOTATE` events for odd-bit multiplication, squaring, and exponent reduction; no raw trace is asserted. The loop takes logarithmically many iterations.

**Teaching/replay/visual.** A learning step can group one exponent bit. The reducer updates named variables, and the variables renderer shows each value change with a textual cue. Technical seek distinguishes result multiplication from subsequent squaring; final output is the modular result.

**Verification/generalization.** Correctness tests compare with independent modular exponentiation and edge cases such as exponent zero. The variable-focused event pattern also supports other arithmetic algorithms without inventing array or graph entities.
