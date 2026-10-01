# Problem SDK v0.1

`defineProblem<T>` accepts metadata, default input, displayed reference source, a `parseInput(raw): T` validator, and a `trace(input): {initialState, rawTrace?, events, output}` generator. `runProblem` validates input, assigns deterministic event IDs, validates the protocol, creates a timeline, and derives versioned `TeachingStep` groups. `ProblemRun` exposes `rawTrace`, `events`, `teachingSteps`, and `timeline` separately. It throws `InputError` for user input failures and protocol/simulation errors for invalid traces.

Increasing Array uses `@sim/code-runtime`: the displayed JavaScript subset is parsed and interpreted for both the reference run and edited runs. Array reads, writes, variable changes, branches, and return values become raw trace records, then semantic events with source lines from the parsed code. `ProblemEntry.runCode(raw, source)` exposes this vertical slice to the editor. The other four displayed algorithms are illustrative references for their curated trace generators; they are labeled accordingly in the UI.

Use `packages/problems/src/index.ts` as an executable example. Add a problem without editing the reducer or renderers when existing state primitives suffice. Register it in `problems`; attach a stable source link, concise original summary, example, complexity, intuition, and tests. Keep input sizes bounded and iteration order explicit for deterministic traces. A problem pack is a versioned collection of IDs; pack discovery and CLI validation are planned.

New event vocabulary requires a protocol change and tests. A new visual family requires a renderer with a canonical state contract; it must not inspect problem IDs.
