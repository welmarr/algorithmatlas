# Feature and UI reality matrix

Statuses here use only `COMPLETE`, `PARTIAL`, `STUB`, `MOCK`, `PLANNED`, `NOT STARTED`, `BROKEN`, and `UNKNOWN`. `COMPLETE` means the bounded capability named in that row works in the audited local build; it does not mean the target platform is production complete. Evidence commands and counts are in [TEST_REPORT.md](TEST_REPORT.md).

## Executive status summary

| Area                        | Status      | Evidence                                                                              | Missing or boundary                                                                 |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Domain model                | PARTIAL     | `packages/domain/src/index.ts`; actual `SimulationState` and `VisualEntity` instances | Numerous interfaces never instantiated; no DB entities                              |
| Event protocol              | PARTIAL     | `semantic-events` `validateEvent/createEvents`; protocol tests                        | No per-type payload schema or version migration                                     |
| Semantic event vocabulary   | PARTIAL     | 45 declared types, 22 emitted on default runs                                         | 23 schema-only types; no governance beyond source array                             |
| Simulation core             | COMPLETE    | `simulation-core` `reduceEvent`, no React/AI imports; seek tests                      | Bounded in-memory scope only                                                        |
| Timeline                    | COMPLETE    | `SimulationTimeline` public methods; probe and tests                                  | No persistence                                                                      |
| Play/Pause                  | COMPLETE    | `play/pause`; timed API probe advanced 3 steps then remained stable                   | No extensive browser timer test                                                     |
| Next/Previous               | COMPLETE    | `next/previous`; unit and E2E tests                                                   | None found in bounded traces                                                        |
| Seek                        | COMPLETE    | `seek`; unit, keyboard E2E, snapshot/full replay probe                                | No million-event UX claim                                                           |
| Replay                      | COMPLETE    | Pure reduction from initial state and events; five deterministic-run tests            | Final output string is separate from replay state                                   |
| Snapshots                   | COMPLETE    | Default interval 100; observed `[0,100,105]` on Labyrinth                             | Memory strategy unbenchmarked for very large entities                               |
| Array renderer              | COMPLETE    | `Visuals.tsx` `ArrayVisual`; exact-input E2E array values and color cues              | One-dimensional arrays only                                                         |
| Grid renderer               | PARTIAL     | `GridVisual`; Labyrinth route and custom input                                        | No generic grid editor or grid accessibility audit                                  |
| Graph renderer              | PARTIAL     | `GraphVisual`; Message Route route, labels/distances/visit state                      | Undirected/unweighted only; no weighted/directed edge UI                            |
| Tree renderer               | PARTIAL     | `GraphVisual(tree)`; Tree Diameter route                                              | Fixed grid positions, mobile overflow, no hierarchical layout                       |
| DP renderer                 | PARTIAL     | `DPVisual`; Dice Combinations route and final cells                                   | One-dimensional DP only; mobile overflow                                            |
| Queue renderer              | NOT STARTED | `QUEUE_PUSH/POP` populate `state.collections`; inspector prints collection            | No queue-specific visual component                                                  |
| Stack renderer              | NOT STARTED | Types/reducer cases exist                                                             | No producer or visual component                                                     |
| Heap renderer               | NOT STARTED | Types/reducer cases exist                                                             | No producer or visual component                                                     |
| Variable panel              | COMPLETE    | `ProblemWorkspace` state inspector reads `state.variables`                            | Metadata such as graph parent is not shown there                                    |
| Code highlighting           | PARTIAL     | `event.sourceRef.line` selects `.code-line.active`                                    | Real parser locations only for Increasing Array; other four use hand-assigned lines |
| Problem SDK                 | PARTIAL     | `defineProblem`, `runProblem`, `ProblemEntry`                                         | No external-pack loader or plugin validation                                        |
| Custom inputs               | COMPLETE    | All five `parseInput` functions and browser rerun probe                               | JSON textarea only; no saved inputs                                                 |
| Algorithm Lab               | PARTIAL     | `/lab` links to five problem workspaces                                               | No independent algorithm/structure selection or lab state                           |
| Algorithm comparison        | NOT STARTED | No `/compare` route or compare state                                                  | Simultaneous execution and metrics absent                                           |
| User code execution         | PARTIAL     | `runArrayScript`, `runCode`, editor, unit/E2E                                         | Only restricted array JavaScript on Increasing Array                                |
| Tree-sitter integration     | PLANNED     | ADR-007                                                                               | Acorn currently parses restricted code                                              |
| Raw trace engine            | PARTIAL     | `runArrayScript().rawTrace`                                                           | Only one problem; no general trace protocol across families                         |
| Semantic engine             | PARTIAL     | Array raw operations map to `EventDraft`; other problems emit drafts directly         | No general parser/classifier/teaching-step layer                                    |
| Sandbox                     | NOT STARTED | No isolated process/WASI; `SECURITY.md` and ADR-010                                   | Browser syntax whitelist is not a full-language sandbox                             |
| WebAssembly                 | PLANNED     | ADR-012                                                                               | No WASM module or runtime use                                                       |
| AI connector layer          | PARTIAL     | `ai-sdk` built-in, local compatible, external compatible factories                    | No native Gemini/Claude; no real provider integration test                          |
| AI response standardization | PARTIAL     | `StepExplanation` and `validateExplanation`                                           | Only explanations, no hint/review/classification schemas                            |
| Local model connector       | PARTIAL     | `localModelTeacher` accepts loopback endpoint; mocked unit test                       | No live local model request verified                                                |
| External provider connector | PARTIAL     | `openAICompatibleTeacher`, HTTPS check, mock fetch test                               | No real provider request verified; CORS dependent                                   |
| PostgreSQL persistence      | NOT STARTED | No database service, client, schema, migration                                        | All run state in browser memory                                                     |
| Authentication              | NOT STARTED | No auth routes/session code                                                           | No users/roles/protected data                                                       |
| Problem library             | PARTIAL     | Five `ProblemEntry`s on home and `/lab`                                               | Target catalog 15–20+ and packs missing                                             |
| Learning pages              | PARTIAL     | Learn tab with bundled text and original source links                                 | No standalone learning routes/progression                                           |
| Simulator page              | COMPLETE    | `/problems/[id]` with controls, state, log, result                                    | Educational grouping and full code support missing                                  |
| Dashboard                   | NOT STARTED | No route or data model                                                                | No progress/history                                                                 |
| CI/CD                       | PARTIAL     | `.github/workflows/ci.yml` runs seven validation commands on push/PR                  | No commit/remote to prove CI run; no deployment workflow                            |
| Security                    | PARTIAL     | Input/event/AI validation and restricted interpreter                                  | No full sandbox; `pnpm audit --prod` found five advisories                          |
| Performance testing         | PARTIAL     | One-off synthetic 1k/10k/100k audit measurements                                      | No checked-in benchmark or browser responsiveness measurement                       |
| Accessibility               | PARTIAL     | Labels/roles, focus CSS, non-color text cues, reduced-motion E2E                      | No automated audit; mobile overflow on tree/DP                                      |
| Documentation               | PARTIAL     | README, SDK, protocol, deployment, 12 ADRs                                            | Some claims overstate responsiveness; no full architecture runbook                  |

## Visible feature versus implementation

This table distinguishes the visible UI from end-to-end behavior. “Real data” means data computed from the current input, not a static animation. None of these flows has database persistence. A refresh probe changed input/code, reloaded, and observed both reset to defaults.

| Visible feature                  | UI       | Domain and connection                                                               | Real / hard-coded / mocked                                                  | Persistence and refresh                                | Test evidence                                                            |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Home problem cards               | COMPLETE | Static `problems` registry drives cards and links                                   | Real registry metadata, bundled constants                                   | Registry survives refresh; user state N/A              | `tests/e2e/player.spec.ts` browse test                                   |
| `/lab` cards                     | COMPLETE | Links to same `ProblemWorkspace` instances; no lab engine                           | Real problem registry, static hub                                           | No lab state to persist                                | Route inspection and browser route probe; no dedicated lab E2E assertion |
| Learn tab                        | COMPLETE | Reads `metadata.learning` in problem registry                                       | Bundled instructional text, not AI                                          | Survives refresh as bundled data; tab selection resets | Browse/learn E2E                                                         |
| JSON custom input                | COMPLETE | `regenerate()` → `parseInput()` → `trace()`/interpreter → new timeline → renderer   | Input-dependent execution for all five; no mock trace                       | User input resets on refresh                           | All-five browser rerun probe; E2E on Increasing Array                    |
| Increasing Array code editor     | PARTIAL  | Edited source → Acorn restricted interpreter → raw trace → semantic events → replay | Real interpreted code; restricted syntax; no host JS `eval`                 | Source resets on refresh                               | `code-runtime.test.ts`, E2E edited-code test                             |
| Code pane on other four          | PARTIAL  | `sourceRef.line` manually assigned in curated trace functions                       | Illustrative source; not executed and may only approximate actual statement | Bundled source survives refresh                        | General source-line E2E only on Increasing Array                         |
| Visualization                    | PARTIAL  | `Visuals(kind,state)` from replay; five families                                    | Input-derived states; tree/graph layout fixed by index                      | Run resets on refresh                                  | E2E route smoke and targeted values/path/DP probe                        |
| Playback/seek/log                | COMPLETE | `SimulationTimeline` API controls event cursor; event log seeks                     | Real semantic event data                                                    | Position resets on refresh                             | Unit replay tests, E2E seek, timed API probe                             |
| State inspector                  | PARTIAL  | `state.variables` and `state.collections`                                           | Real replay values; queue list is text                                      | Resets on refresh                                      | E2E move total; no queue-specific assertion                              |
| Optional teacher: built-in       | COMPLETE | `localTeacher().explain(event)` copies curated event text                           | Deterministic event text, not a model                                       | Current answer resets on refresh                       | `ai.test.ts`; E2E built-in response                                      |
| Optional teacher: local/external | PARTIAL  | Browser `fetch` to user endpoint, normalized text                                   | Mock fetch tested; live model call unverified                               | Endpoint/model/key React memory, reset on refresh      | `ai.test.ts` mocks only                                                  |
| Health endpoint                  | COMPLETE | `GET /api/health` returns fixed JSON                                                | Static readiness response, no DB check                                      | Stateless                                              | Docker health `healthy`; no endpoint-specific automated test             |

## Frontend route audit

| Requested or actual route                                                                       | Observed page state                                                         | Evidence                                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/`                                                                                             | Fully functioning static catalog of five live problem links                 | `apps/web/src/app/page.tsx`; browse E2E                         |
| `/lab`                                                                                          | Partially functional link hub; no independent lab controls                  | `apps/web/src/app/lab/page.tsx`; browser route probe            |
| `/problems/:id`                                                                                 | Functional simulator/Learn tabs for five IDs; unknown IDs call `notFound()` | `apps/web/src/app/problems/[id]/page.tsx`; E2E five-route smoke |
| `/api/health`                                                                                   | Functional fixed JSON endpoint                                              | `apps/web/src/app/api/health/route.ts`; healthy Docker process  |
| `/problems`, `/learn/:id`, `/simulate/:id`, `/compare`, `/visualize`, `/dashboard`, `/settings` | NOT STARTED; no corresponding route files                                   | `rg --files apps/web/src/app` and Next build route output       |

All visible controls on the audited pages have handlers or links in `ProblemWorkspace.tsx`/route files. No button that appears enabled but does nothing was found. This is a source/UI inspection, not exhaustive keyboard or click testing of every control.

## User-code workflow by stage

| Stage                   | Status                        | Evidence and limit                                                                                  |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Code editor             | COMPLETE for Increasing Array | `ProblemWorkspace` textarea and Run/Restore handlers; absent on four other problems                 |
| Parsing                 | PARTIAL                       | Acorn parses a restricted JavaScript subset with locations; no Tree-sitter or multi-language parser |
| Compilation             | NOT STARTED                   | Interpreter executes AST; no compiler or transpilation of user code                                 |
| Execution               | PARTIAL                       | `runArrayScript()` interprets bounded array code in browser; no isolated full-language runtime      |
| Raw tracing             | PARTIAL                       | Reads/writes/variables/branches/return recorded for one array workflow                              |
| Semantic interpretation | PARTIAL                       | Fixed raw-operation mapper, no general semantic inference                                           |
| Visualization           | PARTIAL                       | Edited array code drives replay; graph/grid/tree/DP user-code visualization absent                  |

## Renderer and graph capability matrix

All five renderer components consume `SimulationState` rather than a problem ID (`Visuals.tsx`). No `if problem === "increasing-array"` was found in a renderer. They are semantic-state driven through the reducer, although the visual styles are simple and coverage differs.

| Family               | Exists / generic / coupled                               | Responsive / accessible evidence                                | Direct tests                        | Production readiness                                      |
| -------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Array                | `ArrayVisual`; selects `kind === "array"`, no problem ID | No 390px overflow; labels, cue text, reduced motion             | Exact-input and color E2E           | PARTIAL for general arrays; bounded current problem works |
| Grid                 | `GridVisual`; selects `kind === "grid"`                  | No 390px overflow on tested Labyrinth; grid roles/labels        | Route smoke and custom-result probe | PARTIAL                                                   |
| Graph                | `GraphVisual`; graph-node/edge entities; circular layout | No 390px overflow in tested route; SVG label + hidden node list | Route smoke, result/path probe      | PARTIAL                                                   |
| Tree                 | `GraphVisual(tree)`; nodes and parent metadata           | 390px route overflows to 436px; SVG label + hidden node list    | Route smoke only                    | PARTIAL                                                   |
| DP                   | `DPVisual`; `kind === "dp"` cells                        | 390px route overflows to 685px; table roles                     | Route smoke, final DP cells probe   | PARTIAL                                                   |
| Queue / Stack / Heap | No dedicated component                                   | Inspector collection text only for emitted queue events         | No renderer tests                   | NOT STARTED                                               |

Graph support is **undirected and unweighted**: `graphInput()` accepts `[from,to]` pairs and `messageRoute.trace()` adds both directions to adjacency. Node discovered/visited/path statuses, distance and parent metadata are real. `GraphVisual` shows distance labels and status; it does not draw parent arrows, weights, directed arrows, or relaxation. `RELAX_EDGE` has a reducer case but no producer. Graph editing exists only as JSON text, not as a graphical editor.

## Target platform versus current system

| Target layer                                                | Current status | Concrete boundary                                                                                                                                    |
| ----------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing problem → runner → raw trace → semantic engine     | PARTIAL        | Four curated runners skip raw trace and emit semantic drafts directly; Increasing Array follows the full path within a restricted array interpreter. |
| Semantic events → simulation core → five renderers → player | PARTIAL        | Working for five bounded examples; 23 event types are only declared and teaching-step grouping is absent.                                            |
| Own code → code sandbox → same renderers                    | PARTIAL        | One browser-interpreted JavaScript subset, only array input. No isolated full-language sandbox.                                                      |
| Optional AI pedagogical connectors                          | PARTIAL        | Core works without AI; one normalized explanation operation; external requests unverified.                                                           |
| Problem platform / community extensibility                  | PARTIAL        | Five static entries, no external pack discovery, auth, persistence, comparison, or dashboard.                                                        |
