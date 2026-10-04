# Reconstructing Algorithm Atlas

This book describes the implemented platform. The original build lots are followed by the [visual/account/Python milestone chapter](vnext-visual-auth-python.md) and the [CSES 50 dynamic programming and scans case study](cses-dp-and-scans.md). Start with the frozen prototype audit in `docs/audit`, then read `docs/progress/LOT-01.md` through `LOT-12.md` in order. Each lot records an implementation checkpoint. The separate case studies in `docs/problem-case-studies` follow complete problem paths.

## 1. Domain and dependency direction

Create a pnpm workspace with `apps/web` and framework-independent packages. Define `SimulationState`, visual entities, `RawTraceEvent`, and `TeachingStep` in `packages/domain`. Define event vocabulary, event-specific payload validation, `createEvents`, and raw mapping interfaces in `packages/semantic-events`. Implement a pure reducer and `SimulationTimeline` in `packages/simulation-core`. These packages must have no imports from React, Next.js, or AI. Keep algorithms in `packages/problems`, definitions and input validation in `packages/problem-sdk`, UI renderer contracts in `packages/renderer-sdk`, and the composition root in `apps/web`.

The flow is input → validated problem → trace or bounded execution → raw operation (where available) → semantic event → reducer state → teaching-step projection → choreography → renderer. Direct curated semantic instrumentation is allowed when the algorithm already knows the action; the raw layer is not a demand to produce useless CPU-level noise. Each semantic event has a deterministic ID, contiguous technical position, stable entity IDs, bounded payload, and source reference where available. Reducer changes are the only authority for replay state.

## 2. Replay and teaching

Begin with an immutable initial state. Validate an event before reduction. Clone state so previous positions cannot be changed by later events. Save snapshots at a configurable interval; seek clones the nearest preceding snapshot and applies the remaining events. Position zero is the untouched input. Tests must seek back and forth, then compare the final result with an independent algorithm oracle. A learning step groups one or more technical events and covers the complete event stream without gaps or overlap. Navigation resolves to an event position, while technical mode remains exact. Keep teaching cues separate from canonical reducer state.

## 3. Rendering and interaction

The web player receives only canonical state plus teaching focus. `Visuals.tsx` dispatches by renderer capability (`array`, `grid`, `graph`, `tree`, `dp`, `queue`, `stack`, `heap`, `variables`, `code`); it does not branch by problem ID. State status and focus become color **and** text cues. A source panel uses the executed source reference when the bounded Increasing Array editor is used. Tests must inspect the actual values after each write: `[8,2,5,1,7]` becomes `[8,8,5,1,7]`, `[8,8,8,1,7]`, `[8,8,8,8,7]`, and finally `[8,8,8,8,8]` with 17 increments. Learning mode shows four meaningful changes plus initial/final states; technical mode retains reads and comparisons.

## 4. Optional systems

AI is a validated advisory adapter. It never controls correctness, events, or reducer state. PostgreSQL is optional for accounts, saved inputs, submissions, and progress. Migrations are versioned and checksummed; user-scoped queries and session hashing protect ownership. The separate Python CLI executes inside a bounded Docker container, emits raw trace records, and applies a narrow semantic interpreter. The same runner now powers a gated local browser flow via a separate authenticated loopback scheduler. The bounded browser JavaScript subset is a separate educational interpreter, not arbitrary JavaScript execution.

## 5. Reproduction and verification

Install Node 22+, pnpm 11, and Docker for the full gate. `pnpm install --frozen-lockfile`, then `pnpm verify` runs formatting, lint, types, unit/integration, and production build. For automatic fresh service setup use `pnpm verify:isolated`. For `pnpm verify:full`, configure disposable PostgreSQL plus Mailpit; the command migrates it, builds and probes the Python runner, audits production dependencies, runs browser tests with the database, and builds the web image. Optional benchmarks and live model tests are separate because they measure host-dependent behavior or require configured external endpoints. See `TESTING.md`, `docs/PERFORMANCE.md`, `docs/ACCESSIBILITY.md`, and `SECURITY.md`.

## 6. Boundaries to preserve when extending

For a new curated problem, specify metadata, bounded input parser, independent reference algorithm, initial entities, raw/semantic operations, teaching mapping, renderer capability, examples, randomized correctness oracle, and E2E custom-input test. For a new renderer, declare state, focus, text cue, and accessibility contracts; register reviewed local code. For a new execution language, design and independently review its container/runtime boundary before any public route. Do not infer production readiness from a passing unit suite: readiness, abuse handling, backups, proxy trust, screen-reader validation, and real browser scale are distinct release gates.
