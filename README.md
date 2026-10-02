# Algorithm Atlas

Interactive algorithm simulations powered by a deterministic event engine. The current construction branch includes twenty curated problems spanning arrays, search, DP, graphs, trees, strings, backtracking, mathematics, geometry, and range structures. Each accepts custom JSON input and produces versioned learning steps, exact technical event replay, and optional step explanations across ten renderer families. Increasing Array also runs an editable, bounded JavaScript subset; its source highlights follow the code that actually executed. The other problem pages show reference code alongside input-dependent traces.

## Run locally

Requires Node.js 22+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No database, account, API key, or AI service is required for the current simulations. `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` validate the local milestone.

## What is implemented

| Layer                     | Location                                      | Status                                                         |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Domain contracts          | `packages/domain`                             | v0.1 types                                                     |
| Semantic event protocol   | `packages/semantic-events`                    | v0.1 event-specific validator, mapper API, governed vocabulary |
| Replay engine             | `packages/simulation-core`                    | reducer, snapshots, seek, playback                             |
| Teaching steps            | `packages/domain`, `packages/simulation-core` | grouped learning navigation over technical events              |
| Problem SDK and pack      | `packages/problem-sdk`, `packages/problems`   | twenty curated problems with validation and source links       |
| Code runtime              | `packages/code-runtime`                       | bounded editable JavaScript subset for Increasing Array        |
| Web player                | `apps/web`                                    | Next.js, ten renderer families and structure gallery           |
| Optional teacher adapters | `packages/ai-sdk`                             | built-in, local OpenAI-compatible, external OpenAI-compatible  |

Full JavaScript/Python/C++ execution, an isolated multi-language sandbox, persistent data, comparison mode, and catalog expansion beyond the representative suite remain future work. The browser interpreter supports only the subset listed in [SECURITY.md](SECURITY.md). Current build status and lot reports are in `docs/progress`; the original independent audit remains in `docs/audit`.

## Project documents

Read [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT.md](DEVELOPMENT.md), [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md), and [docs/ROADMAP.md](docs/ROADMAP.md). Public APIs and extension guidance are in [SIMULATION-PROTOCOL.md](SIMULATION-PROTOCOL.md), [PROBLEM-SDK.md](PROBLEM-SDK.md), [RENDERER-SDK.md](RENDERER-SDK.md), and [AI-CONNECTORS.md](AI-CONNECTORS.md).
