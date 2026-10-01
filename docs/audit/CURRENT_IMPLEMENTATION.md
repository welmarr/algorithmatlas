# Current implementation audit

Audit date: 2026-10-01, America/New_York. Scope: the uncommitted working tree at `D:\Simulator`, not a reproducible Git revision. No implementation code was changed for this audit. Supporting detail is in [FEATURE_MATRIX.md](FEATURE_MATRIX.md), [ARCHITECTURE_REALITY.md](ARCHITECTURE_REALITY.md), [TEST_REPORT.md](TEST_REPORT.md), [KNOWN_ISSUES.md](KNOWN_ISSUES.md), and [EXTERNAL_AUDITOR_HANDOFF.md](EXTERNAL_AUDITOR_HANDOFF.md).

## Exact repository state before audit reports

| Requested fact              | Observed value                                                  | Evidence                                                                                                  |
| --------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Repository path             | `D:\Simulator`                                                  | PowerShell working directory for all commands                                                             |
| Branch                      | `master`                                                        | `git branch --show-current` → `master`                                                                    |
| Commit SHA                  | **None**                                                        | `git rev-parse HEAD` → `fatal: ambiguous argument 'HEAD'`; `git log -1 --oneline` → branch has no commits |
| Remote                      | None                                                            | `git remote -v` produced no lines                                                                         |
| Dirty working tree          | Yes                                                             | `git status` → “No commits yet”, “nothing added to commit but untracked files present”                    |
| Untracked files             | 71 before creating these eight audit files                      | `git status --short --untracked-files=all`, counted with PowerShell                                       |
| Modified tracked files      | 0; there are no tracked project files                           | `git status`                                                                                              |
| Observation time            | `2026-10-01T18:17:21.8132359-04:00`                             | `Get-Date -Format o`                                                                                      |
| Host OS                     | Microsoft Windows NT `10.0.26200.0`                             | `[System.Environment]::OSVersion.VersionString`                                                           |
| Host Node / pnpm            | `v25.8.0` / `11.25.0`                                           | `node --version`; `pnpm --version`                                                                        |
| Host Rust / Python / Docker | `rustc` command unavailable / Python `3.14.3` / Docker `28.2.2` | version commands; the failed `rustc --version` is an environment finding                                  |
| Database                    | None to version                                                 | No database package/service/migration; `compose.yaml` contains only `web`                                 |
| Running preview             | `simulator-web-1`, healthy, port 3000                           | `docker compose ps` at audit time                                                                         |

The requested Git command outputs, in substance, were: `git status` → branch `master`, no commits, all source untracked; `git branch --show-current` → `master`; `git rev-parse HEAD` → fatal/no SHA; `git remote -v` → empty. A commit-specific CI claim is impossible at this state.

## Useful repository tree

```text
D:\Simulator
├── .github/workflows/ci.yml             format/lint/type/unit/build/E2E workflow
├── apps/web
│   ├── src/app/{page.tsx,lab/page.tsx,problems/[id]/page.tsx}
│   ├── src/app/api/health/route.ts
│   ├── src/app/{globals.css,animation.css,teacher.css,layout.tsx}
│   └── src/components/{ProblemWorkspace.tsx,Visuals.tsx}
├── packages
│   ├── domain/src/index.ts               types and empty state
│   ├── semantic-events/src/index.ts      protocol and validation
│   ├── simulation-core/src/index.ts      reducer and snapshot timeline
│   ├── problem-sdk/src/index.ts          problem definition and runner
│   ├── problems/src/index.ts             five bundled algorithms
│   ├── code-runtime/src/index.ts         restricted array-code interpreter
│   └── ai-sdk/src/index.ts               optional explanation connectors
├── tests
│   ├── {simulation,correctness,code-runtime,ai}.test.ts
│   └── e2e/player.spec.ts
├── docs
│   ├── ROADMAP.md, DEPENDENCIES.md
│   ├── adr/ADR-001..ADR-012
│   └── audit/                         this report set
├── {README,ARCHITECTURE,DEVELOPMENT,TESTING,SECURITY}.md
├── {SIMULATION-PROTOCOL,PROBLEM-SDK,RENDERER-SDK,AI-CONNECTORS}.md
├── {CONTRIBUTING,DEPLOYMENT}.md
├── {Dockerfile,compose.yaml,package.json,pnpm-lock.yaml,tsconfig.json}
└── {vitest.config.ts,playwright.config.ts,eslint.config.mjs}
```

`rg --files` showed no `crates`, `services`, `database`, `migrations`, or dedicated `tooling` source directory. `artifacts/` was empty at inspection; `node_modules/` and generated `test-results/` are excluded from this tree. The code in `packages/domain` includes types with no runtime subsystem (see below); `apps/web/src/app/lab/page.tsx` is a link hub, not an independent lab. No duplicate simulation engine was found. The `code-runtime` is experimental in scope because it supports only a restricted array language and one problem.

## Executed product path

`Home` in `apps/web/src/app/page.tsx` lists five entries from `problems`. `apps/web/src/app/problems/[id]/page.tsx` resolves an ID and renders `ProblemWorkspace`. `ProblemWorkspace.regenerate()` parses JSON and calls `ProblemEntry.run`, except Increasing Array can call `runCode` with edited source. `runProblem()` in `packages/problem-sdk/src/index.ts` validates input, builds events, and creates `SimulationTimeline`; `Visuals()` in `apps/web/src/components/Visuals.tsx` renders the resulting state. The built-in teacher copies an event explanation. The optional compatible model connectors are separate from this path.

Four curated problem trace functions in `packages/problems/src/index.ts` directly create semantic `EventDraft` objects; their displayed code is illustrative. Increasing Array calls `runArrayScript()` in `packages/code-runtime/src/index.ts`, which creates actual raw operations and maps them into semantic drafts with Acorn source locations. The five deterministic flows work with no AI provider (offline-provider browser probe in [TEST_REPORT.md](TEST_REPORT.md)).

## Domain model: runtime reality

All listed types are declared in `packages/domain/src/index.ts`. “Runtime usage” below means a value is actually created or consumed, beyond a TypeScript declaration. No domain entity is stored in a database.

| Concept                                                    | Status   | Runtime usage / evidence                                                                                                                                                                                              | Tests / database                                              |
| ---------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Problem`                                                  | PARTIAL  | `ProblemMetadata` plus `ProblemDefinition<T>` in `packages/problem-sdk/src/index.ts`; five `defineProblem` values and registry in `packages/problems/src/index.ts`. No separate full `Problem` entity or persistence. | `tests/simulation.test.ts` and `correctness.test.ts`; DB none |
| `Algorithm`, `AlgorithmVariant`, `AlgorithmImplementation` | STUB     | Interfaces only; no constructed variants or selection path. Algorithms exist as `trace` functions rather than these entities.                                                                                         | No direct tests; DB none                                      |
| `Simulation` and `SimulationRun`                           | STUB     | Interfaces only. `ProblemRun` is the real in-memory run object from `runProblem()`.                                                                                                                                   | Integration tests cover `ProblemRun`; DB none                 |
| `SimulationState`                                          | COMPLETE | `emptyState()`, `reduceEvent()`, `SimulationTimeline.state`, `Visuals()` consume it.                                                                                                                                  | `tests/simulation.test.ts`; DB none                           |
| `SimulationSnapshot`                                       | COMPLETE | Constructed every 100 events by default and at final step in `SimulationTimeline`.                                                                                                                                    | Snapshot and seek tests; DB none                              |
| `AlgorithmEvent` / semantic event                          | PARTIAL  | Concrete versioned event object in `packages/semantic-events/src/index.ts`, 22 of 45 declared types emitted on default runs. Event-specific payload schemas are absent.                                               | Protocol and replay tests; DB none                            |
| `RawTraceEvent`                                            | PARTIAL  | Real records from `runArrayScript()` for Increasing Array only. Other four algorithms bypass raw trace.                                                                                                               | `tests/code-runtime.test.ts`; DB none                         |
| `VisualEntity`                                             | COMPLETE | Array/grid/graph/tree/DP values constructed by problems, reduced and rendered. Queue/stack/heap kinds are declared but not rendered.                                                                                  | Integration/E2E tests; DB none                                |
| `LearningContent`                                          | PARTIAL  | Bundled text shown in `ProblemWorkspace` Learn tab for five problems. No lesson progression or persistence.                                                                                                           | One E2E visibility check; DB none                             |
| `UserSubmission`, `ExecutionResult`                        | STUB     | Interfaces only. Edited code is React state, not a submission entity.                                                                                                                                                 | Restricted interpreter tests, no submission tests; DB none    |
| `AIConnector`, `AIResponse`, `AIProvider`                  | STUB     | Domain interfaces are unused by the actual AI SDK; `TeacherConnector` and `StepExplanation` in `packages/ai-sdk` are the real contracts.                                                                              | `tests/ai.test.ts` tests SDK contracts; DB none               |
| `ProblemPack`                                              | STUB     | Interface only; five problems are a static array, no pack loader/versioned discovery.                                                                                                                                 | Registry integration tests only; DB none                      |
| `Explanation`, `Hint`, `AlternativeAlgorithm`              | STUB     | Interfaces only. UI explanation is a string from `StepExplanation`; no hint/alternative pipeline.                                                                                                                     | No direct tests; DB none                                      |

`TeachingStep` is absent from both domain and runtime: **NOT STARTED**. Each algorithm event is one visible timeline step.

## Representative problems

| Problem / category        | Algorithm, parsing and trace                                                                                                                                             | Renderer / learning / custom input                                       | Evidence and status                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Increasing Array / Arrays | Greedy left-to-right; `arrayInput()` restricts 1–64 integers; `runArrayScript()` executes displayed restricted code and maps raw reads/writes/variables/branches/return. | Array; bundled intuition and Learn tab; JSON input and code edits rerun. | `packages/problems/src/index.ts` `increasingArray`, `tests/code-runtime.test.ts`, E2E exact-input test. PARTIAL relative to full user-code platform |
| Labyrinth / Grids         | BFS and shortest-path reconstruction; `gridInput()` validates rectangular 2–16 by 2–24 grid with A/B; `trace()` emits grid/queue/path events directly.                   | Grid; bundled learning; JSON rerun.                                      | `tests/correctness.test.ts` grid oracle and browser custom input. COMPLETE for bounded curated case                                                 |
| Message Route / Graphs    | Undirected, unweighted BFS; `graphInput()` validates 2–16 nodes and ≤40 edges; direct semantic events.                                                                   | Graph; bundled learning; JSON rerun.                                     | Seeded shortest-route oracle and browser rerun. COMPLETE for bounded curated case                                                                   |
| Tree Diameter / Trees     | Two BFS traversals; `treeInput()` checks n−1 edges and connectivity; direct events.                                                                                      | Tree via `GraphVisual(tree)`; bundled learning; JSON rerun.              | Seeded all-pairs oracle and browser rerun. COMPLETE for bounded curated case                                                                        |
| Dice Combinations / DP    | Bottom-up sum of six predecessors; `diceInput()` validates target 0–48; direct DP events.                                                                                | DP; bundled learning; JSON rerun.                                        | Recursive oracle and browser rerun. COMPLETE for bounded curated case                                                                               |

All five pages have algorithm, parser, trace, and renderer behavior. None is merely a problem-page mock. Full editable-code execution is not available on the other four pages.

## Increasing Array acceptance cases

Executed with `node --experimental-transform-types --input-type=module` importing `getProblem`, then seeking each timeline to its end. The first `--experimental-strip-types` probe failed because Node's strip-only mode cannot load the TypeScript parameter property in `CodeRuntimeError`; the full-transform probe succeeded. This is a probe/runtime-tooling limitation, not an app test failure.

| Case | Input `values` | Algorithm output | Final `SimulationState` array | Algorithm events / UI steps | Teaching steps |
| ---- | -------------- | ---------------: | ----------------------------- | --------------------------: | -------------- |
| A    | `[3,2,5,1,7]`  |                5 | `[3,3,5,5,7]`                 |                          27 | NOT STARTED    |
| B    | `[8,2,5,1,7]`  |               17 | `[8,8,8,8,8]`                 |                          29 | NOT STARTED    |
| C    | `[1,2,3,4]`    |                0 | `[1,2,3,4]`                   |                          20 | NOT STARTED    |
| D    | `[2,1,1]`      |                2 | `[2,2,2]`                     |                          17 | NOT STARTED    |

The UI step count equals `timeline.length`, which equals the number of semantic events: reads, variable assignments, pointer moves, branch comparisons, writes, and a return. Case B has 29 events although it makes only four array changes. `ProblemWorkspace` displays `STEP {position} / {length}` and `SimulationTimeline.currentEvent` is one event; there is no teaching-step grouping.
