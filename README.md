# Algorithm Atlas

Interactive algorithm simulations powered by a deterministic event engine. The current construction branch includes twenty curated problems spanning arrays, search, DP, graphs, trees, strings, backtracking, mathematics, geometry, and range structures. Each accepts custom JSON input and produces versioned learning steps, exact technical event replay, and optional step explanations across ten renderer families. The independent [Algorithm Lab](ALGORITHM-LAB.md) offers direct array, grid, graph, and tree editors with eight built-in algorithms. [Algorithm Comparison](ALGORITHM-COMPARISON.md) replays two traversals side by side on one editable input. Increasing Array also runs an editable, bounded JavaScript subset; its source highlights follow the code that actually executed. The other problem pages show reference code alongside input-dependent traces.

## Run locally

Requires Node.js 22+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No database, account, API key, or AI service is required for simulations. Optional PostgreSQL accounts are described in [docs/PERSISTENCE.md](docs/PERSISTENCE.md). Run `pnpm verify` for fast checks or `pnpm verify:full` with PostgreSQL and Docker configured for the full local gate.

## What is implemented

| Layer                     | Location                                      | Status                                                                          |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| Domain contracts          | `packages/domain`                             | v0.1 types                                                                      |
| Semantic event protocol   | `packages/semantic-events`                    | v0.1 event-specific validator, mapper API, governed vocabulary                  |
| Replay engine             | `packages/simulation-core`                    | reducer, snapshots, seek, playback                                              |
| Teaching steps            | `packages/domain`, `packages/simulation-core` | grouped learning navigation over technical events                               |
| Problem SDK and packs     | `packages/problem-sdk`, `packages/problems`   | twenty curated problems, versioned manifests, reviewed local registration       |
| Renderer SDK              | `packages/renderer-sdk`, `apps/web`           | capability contracts and explicit custom renderer registration                  |
| Code runtime              | `packages/code-runtime`                       | bounded editable JavaScript subset for Increasing Array                         |
| Web player and lab        | `apps/web`                                    | Next.js, ten renderer families, four structure editors, side-by-side comparison |
| Optional teacher adapters | `packages/ai-sdk`                             | seven normalized response families; built-in and compatible endpoint adapters   |
| Optional account storage  | `packages/persistence`, `apps/web`            | PostgreSQL migrations, account sessions, saved inputs, submissions, progress    |
| Local Python runner       | `packages/isolated-runner`, `runner/python`   | bounded Docker CLI, raw trace, semantic mapping; developer-only                 |

The browser does not expose arbitrary Python, C++, or Java execution. Python execution and interpretation are available through a local developer CLI, with no public runner route. The browser interpreter supports only the subset listed in [SECURITY.md](SECURITY.md). Current build status and lot reports are in `docs/progress`; the original independent audit remains in `docs/audit`.

## Project documents

Read [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT.md](DEVELOPMENT.md), [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md), and [docs/ROADMAP.md](docs/ROADMAP.md). Public APIs and extension guidance are in [SIMULATION-PROTOCOL.md](SIMULATION-PROTOCOL.md), [PROBLEM-SDK.md](PROBLEM-SDK.md), [RENDERER-SDK.md](RENDERER-SDK.md), [PACKS.md](PACKS.md), and [AI-CONNECTORS.md](AI-CONNECTORS.md).
