# Test, build, and observed behavior report

Executed on 2026-10-01 against the uncommitted `D:\Simulator` working tree. No implementation code or existing tests were changed during this audit. All counts below are command output or explicitly described one-off read-only probes, not inferred from file presence.

## Documented commands run

| Command                | Result            | Exact useful output / limitation                                                                                                                                                                                             |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`    | PASS              | “All matched files use Prettier code style!” (before these audit reports were added)                                                                                                                                         |
| `pnpm lint`            | PASS              | Exit 0, no diagnostics                                                                                                                                                                                                       |
| `pnpm typecheck`       | PASS              | Root `tsc --noEmit` and `@sim/web` `tsc --noEmit`, exit 0                                                                                                                                                                    |
| `pnpm test`            | PASS              | 4 files, **25 passed, 0 failed, 0 skipped**; file counts: `ai` 4, `code-runtime` 3, `correctness` 4, `simulation` 14                                                                                                         |
| `pnpm build`           | PASS with warning | Next.js 15.5.26 production build generated `/`, `/lab`, `/api/health`, five `/problems/[id]` static paths; warned “Next.js plugin was not detected in your ESLint configuration” despite plugin rules in `eslint.config.mjs` |
| `pnpm test:e2e`        | PASS              | 1 Playwright file, **6 passed, 0 failed, 0 skipped** on Chromium against the healthy localhost container                                                                                                                     |
| `docker compose build` | PASS, cached      | Image `simulator-web` built; every relevant build stage was cache hit in this audit. `pnpm build` independently compiled source on host.                                                                                     |
| `docker compose ps`    | HEALTHY           | `simulator-web-1` up on port 3000, health check passed                                                                                                                                                                       |
| `pnpm audit --prod`    | FAIL              | **5 advisories: 3 high, 2 moderate**; dependency scan finding, not a failing product test. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).                                                                                           |

Rust/API/Python/database builds are not applicable: there is no Rust crate, independent API project, Python tooling, or database service. The only API is bundled in Next.js. No CI run can be attributed to a commit because Git has no commit or remote.

## Complete test inventory

| Type                               | Files / cases                                                                                 | Command                  | Pass / fail / skip                      | Quality boundary                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Protocol/core unit and integration | `tests/simulation.test.ts`, 14 cases                                                          | `pnpm test`              | 14 / 0 / 0                              | Includes three protocol tests, timeline tests, five parameterized problem runs, oracle and input checks. Some tests check consistency rather than an independent answer. |
| AI connector unit                  | `tests/ai.test.ts`, 4 cases                                                                   | `pnpm test`              | 4 / 0 / 0                               | External response is a `vi.fn` mock; no real model request.                                                                                                              |
| Restricted-code unit               | `tests/code-runtime.test.ts`, 3 cases                                                         | `pnpm test`              | 3 / 0 / 0                               | Includes changed source and rejected host calls/loop cap; no parser fuzzing or lexical-scope conformance suite.                                                          |
| Correctness/oracle integration     | `tests/correctness.test.ts`, 4 cases                                                          | `pnpm test`              | 4 / 0 / 0                               | Looped seeded cases within test cases; independent references listed below.                                                                                              |
| Browser E2E                        | `tests/e2e/player.spec.ts`, 6 cases                                                           | `pnpm test:e2e`          | 6 / 0 / 0                               | Increasing Array gets deep checks; other four mostly route smoke/custom one-off audit probes.                                                                            |
| Randomized/property                | Embedded in `correctness.test.ts` and `simulation.test.ts`; no property-testing library       | `pnpm test`              | Above counts, not additional test cases | Seeded generator; no shrinking.                                                                                                                                          |
| Snapshot/replay                    | One explicit timeline snapshot test plus per-problem deterministic replay and read-only probe | `pnpm test` plus probe   | Passed for observed cases               | No persisted snapshot format or cross-version test.                                                                                                                      |
| Security                           | Embedded protocol, AI, and runtime rejection tests; 0 dedicated files                         | `pnpm test`              | Embedded tests passed                   | No isolated sandbox, fuzzing, or penetration suite.                                                                                                                      |
| Performance                        | 0 checked-in files, 0 checked-in cases                                                        | One-off Node probe below | Measurements collected                  | Synthetic one-entity timeline only.                                                                                                                                      |
| Accessibility                      | 0 automated audit files; one reduced-motion E2E                                               | `pnpm test:e2e`          | Reduced-motion test passed              | No axe/screen-reader/contrast certification.                                                                                                                             |

### Test quality observations

- `tests/simulation.test.ts` “produces a deterministic valid replay” runs each problem twice and compares their traces/final states; this proves repeatability, not answer correctness. Independent oracles in `correctness.test.ts` cover some of that gap.
- The “600-case” Increasing Array oracle loops 6 lengths × 100 seeds but uses a deterministic arithmetic formula, so it is a generated exhaustive-style sample, not broad random fuzzing. It compares output only, not all final array properties.
- `tests/correctness.test.ts` uses seeded LCG: graph seed 39 / 100 trials, tree seed 2026 / 100 trials, grid seed 711 / 60 trials; dice compares targets 0–12 (13 values) against recursive counts.
- The E2E route test checks that five pages load and Next is enabled; it does not deeply validate all five renderers. The Increasing Array E2E checks each of four writes for `[8,2,5,1,7]`, array state, cumulative moves, edited code, new input, and unsafe-call rejection.
- AI adapter tests use a mocked `fetcher`. They establish normalization/error handling, not provider compatibility or CORS in a live environment.
- No tests are disabled or skipped. No general teaching-step, multi-language, migration, or authentication tests exist because those systems do not exist.

## Increasing Array reference acceptance

One-off probe imported `getProblem('increasing-array')`, called `run({values})`, sought to `timeline.length`, and read each final `array:i` entity. It was run with `node --experimental-transform-types --input-type=module` because this source uses a TypeScript parameter property. Results:

| Case | Input         | `run.output` | Replay final array | Event/UI step count | Dedicated pedagogical steps |
| ---- | ------------- | -----------: | ------------------ | ------------------: | --------------------------- |
| A    | `[3,2,5,1,7]` |            5 | `[3,3,5,5,7]`      |                  27 | NOT STARTED                 |
| B    | `[8,2,5,1,7]` |           17 | `[8,8,8,8,8]`      |                  29 | NOT STARTED                 |
| C    | `[1,2,3,4]`   |            0 | `[1,2,3,4]`        |                  20 | NOT STARTED                 |
| D    | `[2,1,1]`     |            2 | `[2,2,2]`          |                  17 | NOT STARTED                 |

For B, event types/counts are: `READ_INDEX` 5, `UPDATE_VALUE` 10, `MOVE_POINTER` 5, `COMPARE` 4, `WRITE_INDEX` 4, `FUNCTION_RETURN` 1. Their sum is 29. The E2E test also verified the four intermediate writes: `[8,8,5,1,7]`/moves 6; `[8,8,8,1,7]`/9; `[8,8,8,8,7]`/16; `[8,8,8,8,8]`/17.

The first audit probe with `node --experimental-strip-types` failed with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` because strip-only Node cannot handle a parameter property in `CodeRuntimeError`. Retrying with `--experimental-transform-types` succeeded. This failure is recorded so a reproducer does not mistake the first command for a product failure.

## Trace and replay invariants

`SimulationTimeline` stores an immutable copy of input events, reduces into a new `SimulationState`, and seeks from the nearest preceding snapshot. On default Labyrinth (105 events), observed snapshot positions were `[0,100,105]`. A full `reduceEvent` pass from initial state matched snapshot-backed `seek()` at positions `0,1,99,100,101,105,3,17,0`. A second sequence on a 44-event custom grid (`0→1→2→1→2→0→20→3→17→0→44`) matched at every point. A timed API probe with speed 16 advanced 3 positions after `play()`, then remained at 3 after `pause()` and an additional wait. Unit tests separately verify `next`, `previous`, `rewind`, configurable snapshots, focus state, and isolation.

`ProblemRun.output` is a separate string rather than a value reduced into `SimulationState`. Thus the literal target equality `algorithm(input).result == replay(trace(input)).result` cannot be checked generically through a replay result API. For the five default problems, we compared observable final state to output: Increasing Array final values `[3,3,5,5,7]` with moves variable 5; Labyrinth eight marked path cells ↔ “7 steps”; Message Route marked nodes `A,B,D,F` ↔ its output path; Tree Diameter five marked nodes ↔ “4 edges”; Dice Combinations final DP cell 492 ↔ output “492”. No violation was observed in these cases. This is not a proof for every input.

An additional one-off seeded Increasing Array audit used seed `81331`, 200 arrays of length 1–16 with values −20..20. It independently computed the prefix-maximum oracle and checked output, exact final array, nondecreasing order, and `final[i] >= original[i]`: **200 cases, 0 failures**. Existing tests add the 600 deterministic oracle cases and the 100/100/60 seeded graph/tree/grid trials described above.

## Browser functional and AI independence probes

Using Playwright against the running local container, changing input and clicking Run changed event counts and final results on all five pages:

| Problem           | Default events → custom events | Custom input / final output  | Final renderer evidence   |
| ----------------- | ------------------------------ | ---------------------------- | ------------------------- |
| Increasing Array  | 27 → 11                        | `[5,1]` → 4                  | Array DOM values `[5,5]`  |
| Labyrinth         | 105 → 25                       | `['A.B','...']` → 2 steps    | 3 path cells              |
| Message Route     | 38 → 16                        | `A-C` direct graph → `A → C` | 2 marked path nodes       |
| Tree Diameter     | 31 → 12                        | two-node tree → 1 edges      | 2 marked path nodes       |
| Dice Combinations | 91 → 13                        | target 3 → 4                 | DP row values `[1,1,2,4]` |

No provider was configured in a separate browser probe. All external requests were aborted (one non-core request was blocked); home browsing, Learn tab, custom input `[2,1,1]`, next/seek, final result 2, and array `[2,2,2]` still worked. This directly supports AI core independence for those flows. Live local/external model calls were not tested.

## Responsive and accessibility observations

Playwright viewport checks at 390×844, 768×1024, 1280×800, and 1920×1080 found no horizontal overflow on Increasing Array. At 390px, `/`, `/lab`, Labyrinth, and Message Route also did not overflow. **Tree Diameter overflowed to 436px; Dice Combinations overflowed to 685px.** DOM bounds identified `.sim-main`/visual panels as expanded by graph/tree or DP content; details are in [KNOWN_ISSUES.md](KNOWN_ISSUES.md). A 390px Increasing Array screenshot was inspected in the OS temporary directory during the audit and was not added to the repo.

`globals.css` declares focus-visible styles; `ProblemWorkspace` uses native buttons/selects/textarea/slider and ARIA labels; `Visuals` adds text cue labels; `animation.css` disables animation under `prefers-reduced-motion`; an E2E test checks reduced motion. Keyboard seek was exercised. Contrast ratios, screen-reader traversal, focus order across the full page, and WCAG conformance were **UNKNOWN** because no dedicated accessibility audit was run.

## Safe synthetic performance probe

One Node 25.8 process on this Windows host generated valid one-entity `WRITE_INDEX` events using `createEvents`, built `SimulationTimeline` (100-event default snapshot interval), then sought to end and middle. Timings are single-run wall-clock milliseconds; heap delta is approximate and includes event/timeline allocations and temporary copies. These are **not** browser rendering or production workload benchmarks.

|  Events | Event creation | Timeline/snapshot build | Seek end | Seek middle | Snapshots | Approx. heap increase |
| ------: | -------------: | ----------------------: | -------: | ----------: | --------: | --------------------: |
|   1,000 |        2.02 ms |                 8.13 ms |  0.26 ms |    0.009 ms |        11 |               1.0 MiB |
|  10,000 |       12.98 ms |                30.70 ms | 0.014 ms |    0.053 ms |       101 |              10.9 MiB |
| 100,000 |       46.61 ms |               229.66 ms | 0.047 ms |    0.260 ms |     1,001 |              85.5 MiB |

These seek positions coincide with stored snapshots or are close to them. The browser code interpreter caps traces at 5,000 events, so the 100,000-event probe applies only to the generic timeline core. Renderer responsiveness, concurrent users, million-event handling, and realistic multi-entity memory use remain **UNKNOWN**.
