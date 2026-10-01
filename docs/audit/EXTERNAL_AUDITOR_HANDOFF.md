# EXTERNAL AUDITOR HANDOFF

This is the reproducibility handoff for a second engineer. The audit target is **the local uncommitted working tree**, not a Git commit. Read [CURRENT_IMPLEMENTATION.md](CURRENT_IMPLEMENTATION.md) first, then [FEATURE_MATRIX.md](FEATURE_MATRIX.md), [ARCHITECTURE_REALITY.md](ARCHITECTURE_REALITY.md), [TEST_REPORT.md](TEST_REPORT.md), [GAPS.md](GAPS.md), and [KNOWN_ISSUES.md](KNOWN_ISSUES.md). `status.json` is the machine-readable summary.

| Item                          | Observed setup / command                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                    | `D:\Simulator` on Windows NT 10.0.26200.0                                                                                                                                         |
| Commit / branch               | **No commit SHA** (`git rev-parse HEAD` fails); `master`; no Git remote; 71 untracked files before audit reports                                                                  |
| Required environment          | Node 22+ and pnpm 11; audited host Node 25.8.0/pnpm 11.25.0; Docker image Node 22                                                                                                 |
| Environment variables         | None required for deterministic simulations; no `.env` needed. Optional model endpoint/model/key are entered in the UI.                                                           |
| Database / migrations / seeds | None. Problem defaults and content are bundled in `packages/problems/src/index.ts`. No seed command.                                                                              |
| Install                       | `pnpm install --frozen-lockfile`                                                                                                                                                  |
| Dev server                    | `pnpm dev` → `http://localhost:3000`                                                                                                                                              |
| Production build              | `pnpm build`; Docker alternative `docker compose build` then `docker compose up -d`                                                                                               |
| Tests                         | `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm exec playwright install chromium`; `pnpm test:e2e`                                                         |
| Full local verification       | Run the above commands in order, then `pnpm audit --prod` and `docker compose ps`. The audit scan currently exits 1 with five advisories.                                         |
| API                           | `GET http://localhost:3000/api/health` returns fixed JSON `{status:"ok",service:"algorithm-atlas-web"}`.                                                                          |
| UI routes                     | `/`, `/lab`, `/problems/increasing-array`, `/problems/labyrinth`, `/problems/message-route`, `/problems/tree-diameter`, `/problems/dice-combinations`                             |
| Demo credentials              | None; no authentication exists.                                                                                                                                                   |
| Representative inputs         | Increasing Array `{ "values": [8,2,5,1,7] }` → 17; Labyrinth `{ "rows": ["A.B","..."] }` → 2 steps; Dice `{ "target": 3 }` → 4.                                                   |
| Known failures                | `pnpm audit --prod`: 3 high/2 moderate advisories; 390px Tree/DP horizontal overflow; restricted code has lexical-scope mismatch. No failing unit/E2E/build checks at audit time. |

No single `verify` script exists. CI configuration in `.github/workflows/ci.yml` lists format/lint/type/unit/build/E2E, but no remote CI run can be attributed to this uncommitted tree. `pnpm test:e2e` reuses a healthy localhost server if one exists; otherwise Playwright launches `pnpm dev`. The current local container was healthy at audit time. For exact acceptance cases and trace counts, see [TEST_REPORT.md](TEST_REPORT.md).

## A. What is fully implemented?

For the bounded local milestone: five input-validated curated algorithms, deterministic event reduction/replay, `next`/`previous`/`seek`/`rewind`/`play`/`pause`/speed, actual in-memory snapshots, five renderer families for those problems, and custom JSON reruns. Evidence: `packages/problems/src/index.ts`, `packages/simulation-core/src/index.ts`, `apps/web/src/components/Visuals.tsx`; `pnpm test` 25/25, `pnpm test:e2e` 6/6, and replay/custom-input probes in [TEST_REPORT.md](TEST_REPORT.md). “Fully” is limited to the stated bounded flows.

## B. What is partially implemented?

The event vocabulary has 45 declarations but only 22 observed producers and no type-specific payload schemas. Increasing Array supports edited restricted JavaScript with raw tracing; other problems emit semantic events directly. Code sync is parser-derived for Increasing Array and manually annotated for four others. The `/lab` experience is a navigation hub. AI connectors validate one explanation schema but live provider calls were not tested. Accessibility, security and performance are only partially validated. Evidence and exact missing pieces are in [FEATURE_MATRIX.md](FEATURE_MATRIX.md) and [ARCHITECTURE_REALITY.md](ARCHITECTURE_REALITY.md).

## C. What exists only as UI/mock/stub?

The other four code panels are illustrative references, not executable source. `/lab` cards link to existing workspaces rather than independent lab controls. Local/external model choices have real request adapters but only mocked-fetch tests, not verified live integrations. Domain `UserSubmission`, `ProblemPack`, `AlgorithmVariant`, `SimulationRun` and several AI types are interfaces without runtime storage/flow. Queue/stack/heap event names and reducer branches exist without matching visual renderers. No static fake simulation was found: custom JSON inputs regenerate real traces across all five problems.

## D. What has not been started?

Teaching-step aggregation; isolated arbitrary-code sandbox; PostgreSQL/database migrations; authentication; dashboard; simultaneous comparison; graphical input editors; dedicated queue/stack/heap views; native Gemini/Claude providers; external pack distribution; and a full catalog. Tree-sitter and WASM remain planned ADRs. Evidence: absent routes/services plus `docs/ROADMAP.md` and the source inventory.

## E. What is currently broken?

No unit/E2E/build check failed. Reproduced defects: Tree Diameter mobile page scrolls to 436px and Dice Combinations to 685px at 390px; restricted-code lexical shadowing returns 2 instead of JavaScript's 1; `i` is treated as a pointer by name; malformed `SET_CELL_STATE` status is accepted; every technical event is presented as a teaching step. `pnpm audit --prod` also exits 1 with five dependency advisories. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for commands and locations.

## F. What architectural compromises were made?

Four curated algorithms bypass raw trace; all run state is browser memory; the single editable-code path uses an Acorn whitelist on the main thread rather than an isolated runner; source refs in four problems are hand-assigned; tree/graph positions use simple fixed SVG geometry; all algorithm events map one-to-one to UI steps. These choices allowed a working vertical slice but do not satisfy the complete target architecture.

## G. What implementation strategies were actually used?

Strict TypeScript/pnpm monorepo, versioned semantic event objects, a pure clone-and-reduce state engine, eager 100-event snapshots, React subscription to an in-memory timeline, five bundled problem definitions, DOM/SVG renderers selected by `RendererKind`, optional teacher adapters that return text only, and one restricted Acorn interpreter mapping raw operations to events. No database or server-side code execution strategy is implemented.

## H. What should be validated independently next?

Reproduce the mobile overflows; challenge the interpreter with scope/conformance and worst-case responsiveness; implement and test event-specific payload schemas; check the five dependency advisories for actual reachability; run live local/external provider integration; perform screen-reader/contrast testing; and verify teaching-step grouping against the Increasing Array 29-event case. These are concrete gaps rather than claims of current failure in untested areas.

## I. What files should the external auditor inspect first?

In order, no more than 20 paths: `packages/problems/src/index.ts`; `packages/code-runtime/src/index.ts`; `packages/problem-sdk/src/index.ts`; `packages/semantic-events/src/index.ts`; `packages/simulation-core/src/index.ts`; `packages/domain/src/index.ts`; `apps/web/src/components/ProblemWorkspace.tsx`; `apps/web/src/components/Visuals.tsx`; `packages/ai-sdk/src/index.ts`; `tests/simulation.test.ts`; `tests/code-runtime.test.ts`; `tests/correctness.test.ts`; `tests/e2e/player.spec.ts`; `.github/workflows/ci.yml`; `apps/web/src/app/globals.css`; `Dockerfile`; `compose.yaml`; `docs/ROADMAP.md`; `SECURITY.md`; `pnpm-lock.yaml`.

## J. What commands should the external auditor run?

From `D:\Simulator`, in order:

```powershell
git status --short --untracked-files=all
git branch --show-current
git rev-parse HEAD
git remote -v
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
docker compose build
docker compose ps
pnpm audit --prod
```

Expect `git rev-parse HEAD` to fail until there is a commit, and `pnpm audit --prod` to exit 1 at the audited lockfile. Do not treat the audit scan as a unit-test failure. The handoff deliberately contains no command that changes implementation code.

## K. What are the five highest-risk areas?

1. Event-to-teaching-step conflation misrepresents the learning sequence.
2. Restricted-code semantics and main-thread execution could mislead users or stall the UI within the allowed budget.
3. No commit/remote means no reproducible revision or attributable CI result.
4. Dependency scan reports five advisories; actual app exposure is unverified.
5. Protocol/renderer mismatch: 23 un-emitted event types, no event-specific schemas, and mobile overflow on two renderer families.

## L. Is the current system a prototype, MVP, production-ready core, or production-ready platform?

**Prototype.** Five bounded demonstrations run correctly and the deterministic replay core passes its present tests. The target platform still lacks teaching steps, isolated general code execution, persistence, authentication, comparison, broader pack validation, full accessibility/security verification, and a reproducible committed release. Calling this production-ready would conflict with the observed uncommitted state, dependency findings, and mobile defects.
