# Architecture

## Repository inventory and baseline

The audited repository began as a five-problem prototype without a commit. Its original files and audit were preserved at commit `0107c9138cdfb28d5b97345866fae38e780c462e`, baseline branch `baseline/audited-prototype-2026-10-01`, and tag `prototype-audit-2026-10-01`. The current work is on `build/full-platform`.

## Target layers

```text
Curated problem, bounded browser interpreter, or local Python CLI
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

Optional teacher connector → validated advisory response only

Optional PostgreSQL → accounts, sessions, saved inputs, progress
```

`packages/problems` depends on the problem SDK, code runtime, and event contracts. `packages/code-runtime` parses a small JavaScript subset into raw execution records, then semantic events for Increasing Array. `packages/simulation-core` depends on domain and event contracts. `apps/web` is the composition root; no lower package imports React or Next.js. `packages/ai-sdk` receives events and returns explanation text but cannot write simulation state. See `docs/DEPENDENCIES.md` for the full dependency map.

Contributor packs add a declarative manifest and a separately reviewed local-code registration step. `packages/problem-sdk` validates pack data without importing listed modules; `packages/renderer-sdk` validates renderer capabilities, state/focus expectations, legends, and accessibility contracts without depending on React. The web composition layer registers a reviewed component by namespaced ID. Unknown renderer IDs get a visible fallback.

The raw-to-semantic path is implemented for Increasing Array, Labyrinth, and Message Route. Tree Diameter and Dice Combinations continue to emit semantic drafts directly because their curated generators already know the meaningful action. The same event validator gates both paths. `EVENT_GOVERNANCE` rejects reserved vocabulary and documents experimental types; see [docs/protocol/EVENT_GOVERNANCE.md](docs/protocol/EVENT_GOVERNANCE.md).

The renderer boundary supports ten families through a generic state interface. Tree positions are computed hierarchically, graph edges read direction/weight/status metadata, DP cells can form 1D or 2D tables with explicit dependencies, and collection views read ordered IDs from canonical state. The gallery route exercises these views without problem-specific branches.

The audited prototype is preserved at local commit `0107c9138cdfb28d5b97345866fae38e780c462e` on `baseline/audited-prototype-2026-10-01` and tag `prototype-audit-2026-10-01`. Construction takes place on `build/full-platform`. Lot 01 adds a teaching-step projection over the immutable semantic trace. The player defaults to learning steps and exposes exact event seeking in technical mode. The restricted interpreter uses lexical block scopes; array pointer events depend on index use rather than a variable name.

## Current structure and deviations

The structure uses `apps/web`, framework-free packages, tests, and docs. PostgreSQL persistence is optional and isolated in `packages/persistence`. A local Python Docker runner and semantic interpreter exist as developer APIs; they are not exposed by Next.js. No Rust crate, C++/Java runner, public code service, S3 trace store, or broad worker pipeline is present. The browser interpreter is bounded and supports a limited code subset; it is not a full JavaScript runtime.

Curated traces are generated in the browser. Inputs have bounded sizes, preventing excessive replay and rendering. The timeline builds immutable snapshots at configurable intervals, and seek starts from the closest preceding snapshot. Visual entities have canonical IDs and a generic state model. Renderers read state; algorithm packs never import UI code. Comparison runs both built-in algorithms against the same validated input, then keeps separate timelines. An independent checker validates graph and grid routes, BFS shortest length, and tree coverage; semantic event counts are kept separate from wall-clock claims.

## Invariants

- Events describe algorithmic meaning, never colors or animation commands.
- Event order, IDs, and output are deterministic for the same input and algorithm version.
- Renderers never calculate algorithm answers.
- AI responses are parsed into a narrow explanation type and never passed into the reducer.
- The broader optional AI protocol validates seven versioned response families and negotiated vocabulary before a UI consumer sees them. Provider-specific transport shapes never enter simulation state.
- Edited Increasing Array code is interpreted only through the bounded syntax whitelist; no host JavaScript execution occurs.

## Gap analysis

Current coverage includes browsing and learning across twenty representative problems, ten visual families, editable JSON inputs, an independent algorithm lab with array/grid/graph/tree editors, a comparison workspace for three traversal pairs, controls, code lines, replay, no-AI operation, an editable Increasing Array JavaScript subset, optional PostgreSQL accounts, and a local Python trace CLI. The lab runner depends on shared contracts, not on the CSES registry. Open work includes a public reviewed sandbox path, C++/Java, editable code across more problems, independently verified live AI endpoints, browser scaling beyond bounded inputs, and production operations. Optional model adapters require a user-hosted endpoint or external credentials and compatible CORS policy.
