# Architecture reality, event protocol, and boundaries

Evidence is the uncommitted source under `D:\Simulator` plus commands in [TEST_REPORT.md](TEST_REPORT.md). This document describes actual execution, not the roadmap target.

## Actual data flow

```text
Four curated problems: validated JSON → TypeScript trace(input) ───────────┐
                                                                        EventDraft[]
Increasing Array: validated JSON + restricted edited JS → Acorn AST          │
      → bounded browser interpreter → RawTraceEvent[] → EventDraft[] ───────┘
                                      ↓
                         createEvents() / validateEvent()
                                      ↓
                       versioned AlgorithmEvent[]
                                      ↓
             SimulationTimeline / reduceEvent / snapshots
                                      ↓
                 SimulationState → Visuals() + player UI

Optional built-in or compatible-model teacher: current event → validated text
```

There is no universal `Algorithm Runner → Raw Trace → Semantic Engine` for all problems. Four of five skip raw trace. `TeachingStep` and a teaching-step aggregator do not exist. `ProblemWorkspace` uses one `AlgorithmEvent` as one visible step; the UI's 27/29/20/17 Increasing Array counts are event counts, not learning-action counts. There is no separate visual-instruction object: renderers read canonical `SimulationState` and focus data. The term “semantic engine” currently means simple raw-operation mapping inside `runArrayScript()` plus the event reducer, not a reusable cross-language classifier.

`RawTraceEvent` is a real runtime record only in the interpreter. There is no separate type literally named `SemanticEvent`; `AlgorithmEvent` is the concrete semantic event. `TeachingStep` is absent. `SimulationState` is the canonical visual state, not an event. These are distinct objects where implemented, rather than four names for one object.

## Event schema and validation

`packages/semantic-events/src/index.ts` defines `AlgorithmEvent` as `{schemaVersion:'0.1', eventId:string, step:number, type:EventType, entities:string[], payload:Record<string,Primitive>, explanation:string, sourceRef?:SourceRef}`. `SourceRef` in `packages/domain/src/index.ts` allows `file`, `line`, optional `column`, `statementId`, and `astNodeId`. Runtime events use file/line/column for Increasing Array; the other four manually supply file/line. No producer sets AST-node or statement IDs.

`validateEvent()` checks version, structural fields, known type, entity-ID grammar, finite primitive payload values, reserved object keys/variable names, and source file/line. `createEvents()` assigns contiguous IDs/steps. It **does not** validate event-specific payload shapes, allowed status strings, explanatory text length, source line against actual file, or semantic preconditions. `SimulationTimeline` checks contiguous event step numbers and referenced entity existence during reduction. `tests/simulation.test.ts` has generic protocol/replay tests; there is no exhaustive per-event schema suite.

The 45 type names below all share that one schema; there are no discriminated per-type definitions. `P` means the type was observed in a default problem trace; `C` means the core has an explicit state-changing reducer case; `I` means it only changes generic active entities/annotation/focus; `D` means some default-run integration replay covers it; `E` denotes a specific E2E check. `STUB` means the vocabulary type exists but no bundled producer emits it. Renderer descriptions identify real visual effects, not just a type declaration.

| Event               | Producer(s) observed                                | Consumer / renderer behavior                                                     | Test evidence             | Status  |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- | ------- |
| `SELECT`            | none                                                | I; generic highlight if an entity is supplied                                    | Generic protocol only     | STUB    |
| `COMPARE`           | Increasing Array interpreter                        | I; branch text/action banner, no entity                                          | D                         | PARTIAL |
| `UPDATE_VALUE`      | Increasing Array interpreter                        | C; updates `state.variables`, inspector                                          | D, E for moves            | PARTIAL |
| `CREATE_ENTITY`     | none                                                | C; creates generic entity                                                        | No targeted producer test | STUB    |
| `REMOVE_ENTITY`     | none                                                | C; removes entity                                                                | No targeted test          | STUB    |
| `MARK`              | Labyrinth, Message Route, Tree Diameter             | C; sets path status; grid/graph/tree path styling                                | D, custom DOM probe       | PARTIAL |
| `UNMARK`            | none                                                | C; resets status                                                                 | No targeted test          | STUB    |
| `ANNOTATE`          | Tree Diameter                                       | I plus variable assignment via shared payload path; text/inspector               | D                         | PARTIAL |
| `READ_INDEX`        | Increasing Array interpreter                        | I; active array cell/read cue                                                    | D, E                      | PARTIAL |
| `WRITE_INDEX`       | Increasing Array interpreter                        | C; array value/update cue                                                        | D, E four writes          | PARTIAL |
| `SWAP`              | none                                                | C; swaps two entity values                                                       | No targeted test          | STUB    |
| `MOVE_POINTER`      | Increasing Array interpreter for variable named `i` | I plus variable assignment; active array cell when in range                      | D                         | PARTIAL |
| `VISIT_NODE`        | Message Route                                       | C; visited status; graph node                                                    | D                         | PARTIAL |
| `DISCOVER_NODE`     | Message Route                                       | C; discovered status; graph node                                                 | D                         | PARTIAL |
| `VISIT_EDGE`        | none                                                | I; would highlight referenced edge, but edge styling has no visit-specific state | No targeted test          | STUB    |
| `RELAX_EDGE`        | none                                                | C; marks edge active; graph line has only generic edge styling                   | No targeted test          | STUB    |
| `SET_DISTANCE`      | Message Route                                       | C; node metadata.distance; graph distance text                                   | D                         | PARTIAL |
| `SET_PARENT`        | Message Route                                       | C; node metadata.parent; no parent arrow/label                                   | D                         | PARTIAL |
| `QUEUE_PUSH`        | Labyrinth, Message Route                            | C; appends entity ID to `state.collections.queue`; inspector text                | D                         | PARTIAL |
| `QUEUE_POP`         | Labyrinth, Message Route                            | C; shifts queue; inspector text                                                  | D                         | PARTIAL |
| `QUEUE_PEEK`        | none                                                | I; no queue view                                                                 | No targeted test          | STUB    |
| `STACK_PUSH`        | none                                                | C; appends ID to collection; no stack renderer                                   | No targeted test          | STUB    |
| `STACK_POP`         | none                                                | C; pops collection; no stack renderer                                            | No targeted test          | STUB    |
| `STACK_PEEK`        | none                                                | I; no stack renderer                                                             | No targeted test          | STUB    |
| `HEAP_INSERT`       | none                                                | C; appends ID to collection, not heap ordering; no heap renderer                 | No targeted test          | STUB    |
| `HEAP_EXTRACT`      | none                                                | C; pops last ID, not heap-min extraction; no heap renderer                       | No targeted test          | STUB    |
| `HEAP_UPDATE`       | none                                                | I with update focus; no value write case or heap renderer                        | No targeted test          | STUB    |
| `VISIT_CELL`        | Labyrinth                                           | C; visited status; grid cell                                                     | D                         | PARTIAL |
| `DISCOVER_CELL`     | Labyrinth                                           | C; discovered status; grid cell                                                  | D                         | PARTIAL |
| `SET_CELL_STATE`    | none                                                | C; status from payload; grid cell                                                | No targeted test          | STUB    |
| `SET_CELL_DISTANCE` | Labyrinth                                           | C; cell distance metadata; action text (grid does not display numeric distance)  | D                         | PARTIAL |
| `DP_READ`           | Dice Combinations                                   | I; active DP cell                                                                | D                         | PARTIAL |
| `DP_UPDATE`         | Dice Combinations                                   | C; changes DP cell value                                                         | D, custom DOM probe       | PARTIAL |
| `DP_TRANSITION`     | none                                                | I; no transition arrow view                                                      | No targeted test          | STUB    |
| `DP_BASE_CASE`      | Dice Combinations                                   | C; changes DP cell value                                                         | D                         | PARTIAL |
| `SET_SEARCH_RANGE`  | none                                                | I; no binary-search range view                                                   | No targeted test          | STUB    |
| `SET_MIDPOINT`      | none                                                | I; no midpoint view                                                              | No targeted test          | STUB    |
| `DISCARD_RANGE`     | none                                                | I; no discarded-range view                                                       | No targeted test          | STUB    |
| `VISIT_TREE_NODE`   | Tree Diameter                                       | C; visited status; tree node                                                     | D                         | PARTIAL |
| `ENTER_SUBTREE`     | none                                                | I with explore focus; no traversal stack view                                    | No targeted test          | STUB    |
| `EXIT_SUBTREE`      | none                                                | I with explore focus; no traversal stack view                                    | No targeted test          | STUB    |
| `SET_DEPTH`         | Tree Diameter                                       | C; depth metadata; tree node label                                               | D                         | PARTIAL |
| `FUNCTION_CALL`     | none                                                | I; no call-stack view                                                            | No targeted test          | STUB    |
| `FUNCTION_RETURN`   | Increasing Array interpreter                        | I with result focus; result text uses separate `ProblemRun.output`               | D, E                      | PARTIAL |
| `BACKTRACK`         | none                                                | I; no backtracking-specific view                                                 | No targeted test          | STUB    |

Probe command: import `EVENT_TYPES` and all five `ProblemEntry`s, run their defaults, and aggregate `event.type`. Result: **45 declared, 22 emitted, 23 un-emitted**. The table lists all 45. The shared reducer consumes every validated event in the sense of annotation/focus, but many types have no dedicated state change or renderer. Emitted queue events have no queue renderer; emitted graph parent changes have no parent-arrow view; emitted grid distances are stored but not drawn as distance numbers.

## Simulation core and timeline public API

`packages/simulation-core/src/index.ts` imports only `@sim/domain` and `@sim/semantic-events`; it imports neither React, Next.js, nor AI. `reduceEvent(previous,event)` validates the event, clones the previous state, applies state changes, and returns a new state. Its input state is not mutated in observed tests. `SimulationTimeline` clones initial state and frozen events, eagerly reduces the complete trace in the constructor to build snapshots, then exposes `position`, `length`, cloned `state`, `initialState`, cloned `snapshots`, `currentEvent`, `speed`, `playing`, `subscribe`, `seek`, `next`, `previous`, `rewind`, `setSpeed`, `play`, `pause`, `dispose`, `filterEvents`, `eventsForEntity`, and `eventsForCodeLine`. The UI subscribes in `ProblemWorkspace` and disposes replaced timelines in a React effect.

Snapshots have `{position,state}`. Default interval is 100, plus position 0 and final event position; configuration accepts `snapshotInterval`. `seek()` selects the closest prior stored snapshot and reduces only the remaining events. This is actual code and was verified against full replay at positions around 100. All snapshots are held in memory; `snapshots` getter clones them. No persistence or serialization versioning exists. The algorithm's final output is stored in `ProblemRun.output`, not reduced into `SimulationState`, limiting generic output-vs-replay assertions.

## Source synchronization

Increasing Array's Acorn parser supplies `sourceRef.file='solution.js'`, line and column for observed raw operations, and the same edited source is shown as executed code. `tests/code-runtime.test.ts` verifies a write at source line 7 and edited code at line 3; E2E highlights the return line. The other four problems use `draft(..., line)` in `packages/problems/src/index.ts`, assigning `solution.ts` line numbers to illustrative strings; the displayed pseudocode is not what executes. `ProblemWorkspace` highlights solely on numeric `event.sourceRef.line`; it does not compare file names or validate that the line corresponds to an executed statement. AST and statement ID fields are declared but unused.

## AI optionality and safety boundary

`packages/ai-sdk/src/index.ts` implements `TeacherConnector.explain(event)` and canonical `StepExplanation {schemaVersion:'0.1', eventId, explanation, provider}`. `localTeacher()` returns existing deterministic event text, not a model response. `localModelTeacher()` and `openAICompatibleTeacher()` both use the same OpenAI-compatible chat completions request; local permits loopback HTTP, external requires HTTPS. They use browser `fetch`, a 15-second abort signal, configured model and key, parse `choices[0].message.content` as JSON, and call `validateExplanation()`. That validator requires matching version/event ID, nonempty string ≤4,000 chars, and discards additional fields. `tests/ai.test.ts` uses mock fetch and checks rejection/extra-field stripping. No live provider request was verified; no native Gemini or Claude adapter exists.

The UI stores endpoint, model, key and returned text in React memory only. It never passes model response into `reduceEvent()`. The teacher cannot mutate simulation state, execute code, or issue renderer instructions through the normal connector path; it can supply displayed explanation text. A user-chosen HTTPS endpoint receives the key in an Authorization header and current event content. That is a user-controlled privacy boundary, not server-side secret storage. Browser provider calls are subject to CORS. External requests were blocked during an AI-off browser probe; deterministic browsing, learning, simulation and rendering still worked.

There is **one normalized response type**. `HintResponse`, `AlternativeAlgorithmResponse`, `CodeReviewResponse`, and `SemanticClassificationResponse` do not exist as runnable normalized AI protocols. Related domain interfaces (`Hint`, `AlternativeAlgorithm`, `AIResponse`, `AIConnector`) are type declarations with no production flow.

| Connector                   | API / operation                                                                           | Validation and failure behavior                                                                       | Tested versus configured                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Built-in `localTeacher()`   | No network; `explain(event)` copies event explanation                                     | `validateExplanation()` still normalizes it                                                           | Unit and browser E2E pass; always available                                   |
| `localModelTeacher()`       | Direct browser POST to user-supplied loopback OpenAI-compatible chat-completions endpoint | Requires model ID and loopback HTTP/HTTPS; timeout/HTTP/JSON/schema failures raise `AIConnectorError` | Factory and rejection unit tests; no live model configured/verified           |
| `openAICompatibleTeacher()` | Direct browser POST to user-supplied HTTPS chat-completions endpoint                      | Same normalized schema; HTTPS required; extra response fields discarded                               | Mocked successful fetch + malformed-response tests; no live provider verified |

All three are in `packages/ai-sdk/src/index.ts`; the UI provider selector and error handling are in `ProblemWorkspace.tsx`. No separate Gemini or Claude native API module exists. The factory accepting endpoint/model is configuration support, not evidence of successful external integration.

## Restricted code, sandbox, persistence, and API

`packages/code-runtime/src/index.ts` uses Acorn, then interprets a whitelist of expressions/statements on a cloned numeric `values` array. It accepts `let`/`const`, numeric/boolean expressions, `if`, `for`, `return`, `values[i]` and `values.length`. Calls, imports, host globals and object construction are not executable via supported AST cases. Limits are 4,096 source characters, 20,000 interpreter operations, 5,000 raw events, 1–64 input integers ±100,000, and finite bounded arithmetic. It runs synchronously in the browser. **It is not an isolated JavaScript sandbox**: no worker, independent memory/time quota, filesystem/process boundary, multi-language execution, WASI, Rust, or Tree-sitter exists. A safe probe found lexical-block behavior differs from JavaScript (`let x=1; { let x=2; } return x;` yielded 2, not 1); see [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

There is no PostgreSQL service/client/table/migration or local-storage use. Bundled metadata, examples and default inputs are constants in `packages/problems/src/index.ts`. Current input, edited code, timeline position, provider configuration and key are React component state and reset on refresh (verified browser probe). No user submissions are stored.

The sole API endpoint is `GET /api/health` in `apps/web/src/app/api/health/route.ts`. It returns fixed JSON `{"status":"ok","service":"algorithm-atlas-web"}`, accepts no input and requires no authentication. Docker health calls it. No endpoint-specific automated test was found. There are no protected routes, sessions, roles, or authorization checks because account features have not started.

Security surface review: JSON inputs are validated per problem before trace generation (`packages/problems/src/index.ts`); event data passes generic protocol validation before reduction; model output passes `validateExplanation` before display. React text interpolation is used for user input and model text, and no `dangerouslySetInnerHTML`/`innerHTML` usage was found by source search. No shell/subprocess/filesystem call is exposed through a web route. The restricted AST interpreter has no host-call execution path, but it runs on the browser main thread without a wall-clock/memory isolation boundary. External AI endpoints are network destinations chosen by the user; their trustworthiness and CORS behavior were not verified. API validation for `/api/health` is inapplicable because it takes no input. Secret storage beyond browser React memory is absent.

## Dependency and security observations

Production web dependencies in `apps/web/package.json`: Next.js for routing/build/health endpoint, React/React DOM for UI, and workspace domain/events/core/problem/AI packages. `packages/code-runtime` adds Acorn 8.18.0 for parsing. `pnpm list --prod --depth 2` observed Next 15.5.26, React 19.3.0, PostCSS 8.4.31 through Next, and Playwright 1.52.0 as a Next peer linked to the root test dependency. No obvious duplicate UI framework was found; two PostCSS versions are present because Vite uses 8.5.28 in dev dependencies. No dependency was changed during the audit.

`pnpm audit --prod` exited 1 with five advisories: three high and two moderate. Four concern locked PostCSS 8.4.31, one Playwright 1.52.0. See [PostCSS advisory](https://github.com/advisories/GHSA-6g55-p6wh-862q) and [Playwright advisory](https://github.com/advisories/GHSA-7mvr-c777-76hp); [KNOWN_ISSUES.md](KNOWN_ISSUES.md) lists all five IDs. These are package-level findings; attack reachability through this particular app was **UNKNOWN** and no exploit was attempted. The PostCSS advisory requires untrusted CSS processing; no user-CSS ingestion route was found in app source. The runtime rejects host calls in tests. Event/AI validation reduces some injection risk, but event-specific payloads and overall security were not independently penetration tested.

## ADR and actual implementation alignment

`docs/adr` contains ADR-001 through ADR-012. Implemented in the current bounded milestone: 001 TypeScript, 002 React boundary, 003 semantic events, 004 replay, 005 snapshots, 008 optional AI, 009 normalized explanation, 011 renderer boundary. Planned: 006 Rust execution, 007 Tree-sitter, 010 isolated full-code sandbox, 012 WASM. ADR-006/007 language about “when user code arrives” is outdated now that the restricted Acorn editor exists; the planned Rust/Tree-sitter decisions remain unimplemented. ADR-010's title/status can read as conflicting with the existing editor, although its body distinguishes arbitrary full-language execution from the restricted interpreter. ADR-011 is upheld structurally, but the actual graph layout is simple fixed SVG positioning.

| ADR                      | Current alignment                                                                |
| ------------------------ | -------------------------------------------------------------------------------- |
| 001 TypeScript ecosystem | Implemented in all source packages/UI                                            |
| 002 React boundary       | Implemented; core imports no React/Next                                          |
| 003 Semantic events      | Implemented for five problems, without full per-type governance                  |
| 004 Replay               | Implemented and tested                                                           |
| 005 Snapshots            | Implemented and tested at interval 100                                           |
| 006 Rust execution       | Planned, not implemented; wording predates restricted editor                     |
| 007 Tree-sitter          | Planned, not implemented; Acorn is current parser                                |
| 008 Optional AI          | Implemented for deterministic core independence                                  |
| 009 Teacher protocol     | Implemented for explanation only                                                 |
| 010 Isolated sandbox     | Planned for arbitrary code; status wording is ambiguous beside restricted editor |
| 011 Graph boundary       | Renderer consumes state, but layout is simple and bounded                        |
| 012 WASM                 | Planned; no module                                                               |

## Explicit architectural violation search

| Target boundary                                        | Finding and evidence                                                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core depends on React/Next or AI                       | **No violation observed:** `simulation-core/src/index.ts` imports only domain/events.                                                                                                          |
| Algorithm directly manipulates visual UI               | **No violation observed:** `packages/problems` and `code-runtime` emit data, not DOM/SVG commands.                                                                                             |
| Renderer computes algorithm answer                     | **No violation observed:** `Visuals.tsx` reads `SimulationState`; answer text comes from `ProblemRun.output`.                                                                                  |
| AI controls simulation or bypasses response validation | **No violation observed on configured path:** `validateExplanation()` returns text fields; `ProblemWorkspace` never sends teacher output to timeline. Live provider behavior remains untested. |
| Provider-specific types leak into core                 | **No violation observed:** core has no AI import.                                                                                                                                              |
| User code runs without isolation                       | **Target deviation:** a bounded syntax-whitelist interpreter executes edited source synchronously in browser; it is not arbitrary host JavaScript, but also not the target isolated sandbox.   |
| Problem modifies core                                  | **No violation observed:** problem pack imports SDK/contracts; reducer contains no problem-ID branch.                                                                                          |

## Implementation strategy actually used

The repository was built as one TypeScript/pnpm monorepo. The sequence visible in code and project docs is: domain/event contract → reducer/snapshot timeline → five curated trace functions → five React renderer families/player → optional explanation adapters → a restricted Acorn array-code vertical slice. Problem functions provide initial canonical state and semantic drafts; `runProblem()` wraps validation/event IDs/timeline. React holds per-page transient state and subscribes to the framework-independent timeline. Four problems generate events directly; one records raw operations then maps them. There is no database strategy beyond deferral; no deployed model dependency; and no isolated sandbox strategy implemented beyond syntax whitelisting and execution budgets. These are the major deviations from the target architecture.
