# LOT 01 — Baseline, core hardening, and pedagogical steps

Status: **COMPLETE**

- Baseline branch: `baseline/audited-prototype-2026-10-01`
- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Baseline tag: `prototype-audit-2026-10-01`
- Construction branch: `build/full-platform`
- Construction starting SHA: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `3127971f2497dfee9dae215d2576b5eba0a80fd1`

## Implemented

- Preserved the audited five-problem prototype as a local root commit and annotated tag. No remote is configured and nothing was pushed.
- Added a versioned `TeachingStep` model with inclusive event ranges, stable IDs, visual cues, source references, and deterministic seek. The initial step is position zero; later steps cover every technical event exactly once.
- Defaulted the player to learning-step navigation, autoplay, and a learning-step list. Kept precise semantic-event navigation and the event log in a labeled technical mode.
- For Increasing Array `[8,2,5,1,7]`, grouped 29 technical events into initial state, four increases, and final result. Edited input and code generate a fresh grouping from the executed trace.
- Added renderer-specific legends. Array mode no longer shows a path legend.
- Constrained the tree and DP visual panels so the page does not overflow at 390px; wide DP data scrolls within its own panel.
- Implemented lexical `let`/`const` block and loop scope for the supported interpreter subset, including shadowing and uninitialized binding errors. Pointer events now depend on array-index use, not the variable name `i`.
- Exposed raw trace records separately from semantic events, teaching steps, and canonical simulation state in the problem run contract.

## Changed architecture

- `packages/domain` owns distinct raw trace, semantic event, teaching step, and simulation state types.
- `packages/simulation-core` projects teaching steps over the existing immutable event timeline; exact event seek remains in the timeline.
- `packages/problem-sdk` returns all four layers without collapsing the raw and teaching views.
- The web player chooses a presentation mode; teaching cues do not write to canonical state.

## Tests

- Unit and integration: **29 passed, 0 failed, 0 skipped** (`pnpm test`). Includes grouping, deterministic teaching seek, raw event seek, scope and pointer semantics, and existing correctness oracles.
- E2E: **8 passed, 0 failed, 0 skipped** (`E2E_PORT=3001 pnpm test:e2e`). Includes learning autoplay, the exact Increasing Array case, technical mode, and both 390px width regressions.
- Security: the five code-runtime tests include host-call and unsupported-syntax rejection; no dedicated sandbox security suite exists yet.
- Format, lint, typecheck: passed.
- Production build: passed (`pnpm build`).
- Docker: `docker compose build web` passed; a temporary container on port 3002 returned HTTP 200 from `/api/health` and was stopped.

One lint attempt raced Playwright's temporary `test-results` cleanup and failed with `ENOENT`. A serial lint run after E2E completed passed. The first E2E attempt exposed a test hydration race; those tests now wait for the page to settle, and the final full suite passed.

## Known limitations

- Teaching steps for the other four curated problems are generated from salient event boundaries; their wording remains more technical than the Increasing Array lesson.
- Editable code execution still exists only for Increasing Array and only within the documented browser interpreter subset.
- The dependency advisories recorded in the historic audit remain open; Lot 01 did not update dependencies.

## Documentation updated

- `README.md`, `ARCHITECTURE.md`, `SIMULATION-PROTOCOL.md`, `PROBLEM-SDK.md`, `SECURITY.md`, and `TESTING.md`.
- Historic files under `docs/audit` remain unchanged.

## New technical debt

- Teaching-step construction replays the timeline to inspect group boundaries. Large future traces will need a bounded projection strategy and performance benchmarks.

## Deferred items

- Event-specific payload schemas, vocabulary governance, and a complete raw-to-semantic mapper for every problem.
- Expanded renderers, problem catalog, lab execution, comparison, community packs, persistence, and production hardening.

## Next lot

Lot 02 — Event protocol governance and semantic pipeline.
