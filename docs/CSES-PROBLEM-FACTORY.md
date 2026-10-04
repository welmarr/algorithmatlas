# CSES problem factory

The catalog is a set of executable `ProblemDefinition` entries, not a list of links. Start from the [official CSES catalog](https://cses.fi/problemset/list/). Keep the official title, task ID, and URL, and write original summaries and teaching text. CSES publishes its own material under [CC BY-NC-SA 4.0](https://cses.fi/problemset/text/2433); do not paste the full statements into this repository.

## Add one problem

1. Choose a CSES task that fills a real algorithm or category gap. Check `docs/CSES-CATALOG.md` and `packages/problems/src/certification.ts` to avoid duplicate official IDs.
2. Define it with the existing `defineProblem` SDK. Use `metadata` from `extended-shared.ts` for the official task URL, title, category, bounded interactive constraints, tags, example, complexity, and original learning copy. Preserve the CSES algorithmic task even when the interactive bound is smaller than the contest bound.
3. Write one bounded `parseInput`. Reject missing fields, wrong types, oversize arrays/strings, invalid indices, impossible graph shapes, and out-of-range values with `InputError`. Keep the supplied input as JSON so the browser editor can rerun it.
4. Write a complete reference algorithm in `source`. Label it **Reference algorithm** in the UI. It must agree with the traced implementation for fixtures and random inputs; it is not the code being executed by the trace.
5. Implement `trace(input)` as deterministic events over `SimulationState`. Use stable IDs (`array:i`, `graph:node:x`, `dp:i`, etc.), valid semantic events, and a result derived from the same computation. State changes belong in semantic events; React and renderers must never calculate the answer.
6. Provide clear Teaching Steps. The SDK can derive them from events; supply a custom mapping when the default grouping obscures a key decision. For every step, `createChoreography` must produce a valid plan. Select a family strategy through tags and renderer. Static equations or variable changes are appropriate when movement would mislead.
7. Add known fixtures, handwritten edge cases, and an independent oracle or property test. Use brute force for small bounds, exhaustive enumeration for constructions, or a deliberately different algorithm. Seed random tests. Check output **semantics** for tasks with multiple valid answers.
8. Register the `ProblemEntry` once in `packages/problems/src/index.ts`, then add its official ID, algorithm, strategy, oracle, edge-case, and browser evidence to `certification.ts`.
9. Run `pnpm problems:status`, `pnpm problems:verify`, and `pnpm verify`. Inspect the generated certificate in `artifacts/problem-certificates/<id>.json` and the route in a real browser. Do not mark an entry certified when any evidence fails.

## Certificate rules

`tests/problem-certification.test.ts` audits unique task IDs, metadata, bounds, trace and Teaching Steps, repeatability, replayed final state, renderer support, example execution, and choreography for every step. `pnpm problems:status` runs the complete evidence suite before publishing `docs/progress/cses-status.json` and `docs/CSES-CATALOG.md`. `pnpm problems:verify` also reruns every registered route and its example as custom input. `pnpm problems:release` adds the hard minimum of 100 certified unique CSES tasks.

Certificate evidence points to source tests and the all-route browser smoke. Contributors must add meaningful assertions at those locations; a file path alone is not an oracle. The current checker verifies evidence file existence but does not statically prove that a named test covers every claim. Review each new test and its failure behavior.

## Architecture and performance

The simulation core accepts semantic events and produces replay state. The renderer observes that state; choreography observes a Teaching Step and never mutates canonical state. Keep algorithm-specific branches inside problem definitions or reusable family primitives. Prefer one family helper over many problem-ID branches in generic layers.

Home renders one compact server-computed demo trace; the client receives only the selected frames. `/problems` passes only metadata into its client search/filter component. The server currently imports the full registry for both routes; this is acceptable at 30 entries but should be split into lightweight metadata and lazy implementation loaders before the catalog approaches 100–200. Watch build time, server import cost, Home and Library JS, and the workbench bundle after each wave.

## Release sequence

For a wave: implement → write independent evidence → run fast and problem gates → inspect representative visuals → update catalog and report → commit → push. The final release additionally needs full operations gates, dependency audits, a fresh-clone reproduction, remote CI, and the 100-problem count. Never merge a wave to `main` merely because its own tests pass.
