# Architecture

## Repository inventory and baseline

The repository was empty at the start of Lot 0 (2026-10-01). There was no Git history, dependency graph, code, test suite, or existing behavior to preserve. The current monorepo was created from that baseline.

## Target layers

```text
Curated problem or bounded browser interpreter
                 ↓
        versioned raw operations
                 ↓
      deterministic semantic mapper
                 ↓
        versioned semantic events
                 ↓
     framework-independent reducer
                 ↓
          snapshot timeline
                 ↓
       canonical simulation state
                 ↓
    versioned teaching-step projection
                 ↓
     React renderers and controls

Optional teacher connector → validated explanation only
```

`packages/problems` depends on the problem SDK, code runtime, and event contracts. `packages/code-runtime` parses a small JavaScript subset into raw execution records, then semantic events for Increasing Array. `packages/simulation-core` depends on domain and event contracts. `apps/web` is the composition root; no lower package imports React or Next.js. `packages/ai-sdk` receives events and returns explanation text but cannot write simulation state. See `docs/DEPENDENCIES.md` for the full dependency map.

The raw-to-semantic path is implemented for Increasing Array, Labyrinth, and Message Route. Tree Diameter and Dice Combinations continue to emit semantic drafts directly because their curated generators already know the meaningful action. The same event validator gates both paths. `EVENT_GOVERNANCE` rejects reserved vocabulary and documents experimental types; see [docs/protocol/EVENT_GOVERNANCE.md](docs/protocol/EVENT_GOVERNANCE.md).

The renderer boundary supports ten families through a generic state interface. Tree positions are computed hierarchically, graph edges read direction/weight/status metadata, DP cells can form 1D or 2D tables with explicit dependencies, and collection views read ordered IDs from canonical state. The gallery route exercises these views without problem-specific branches.

The audited prototype is preserved at local commit `0107c9138cdfb28d5b97345866fae38e780c462e` on `baseline/audited-prototype-2026-10-01` and tag `prototype-audit-2026-10-01`. Construction takes place on `build/full-platform`. Lot 01 adds a teaching-step projection over the immutable semantic trace. The player defaults to learning steps and exposes exact event seeking in technical mode. The restricted interpreter uses lexical block scopes; array pointer events depend on index use rather than a variable name.

## Current structure and deviations

The initial structure uses `apps/web`, framework-free packages, tests, and docs. A dedicated API, worker, Rust crates, PostgreSQL, S3, Python pipeline, and isolated multi-language executor have not been created. Their boundaries and order are recorded in the roadmap. The browser interpreter is bounded and supports a limited code subset; it is not the future arbitrary-code executor.

Curated traces are generated in the browser. Inputs have bounded sizes, preventing excessive replay and rendering. The timeline builds immutable snapshots at configurable intervals, and seek starts from the closest preceding snapshot. Visual entities have canonical IDs and a generic state model. Renderers read state; algorithm packs never import UI code.

## Invariants

- Events describe algorithmic meaning, never colors or animation commands.
- Event order, IDs, and output are deterministic for the same input and algorithm version.
- Renderers never calculate algorithm answers.
- AI responses are parsed into a narrow explanation type and never passed into the reducer.
- Edited Increasing Array code is interpreted only through the bounded syntax whitelist; no host JavaScript execution occurs.

## Gap analysis

Current coverage includes problem browsing and learning, five visual families, editable inputs, controls, code lines, state inspection, replay, no-AI operation, and a browser-interpreted Increasing Array code editor with source-linked events. The following remain open: 10–15 more diverse problems, accessible structure editors beyond JSON, full comparison mode, broad property and performance suites, persistent data and migrations, isolated multi-language execution, code visualization for the other problem families, Python tooling, full book, and deployment infrastructure for those services. Optional model adapters exist, but a real model requires a user-hosted endpoint or external credentials and compatible CORS policy.
