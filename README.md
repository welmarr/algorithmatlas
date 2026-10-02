# Algorithm Atlas

Interactive algorithm simulations powered by a deterministic event engine. The platform includes twenty curated problems spanning arrays, search, DP, graphs, trees, strings, backtracking, mathematics, geometry, and range structures. Each accepts custom JSON input and produces versioned learning steps, exact technical event replay, and optional step explanations across ten renderer families. The independent [Algorithm Lab](ALGORITHM-LAB.md) offers direct array, grid, graph, and tree editors with eight built-in algorithms. [Algorithm Comparison](ALGORITHM-COMPARISON.md) replays two traversals side by side on one editable input. Increasing Array also runs an editable, bounded JavaScript subset; its source highlights follow the code that actually executed. The other problem pages show reference code alongside input-dependent traces.

## Run locally

Requires Node.js 22+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No database, account, API key, or AI service is required for simulations. Verified accounts are optional; see [authentication](docs/AUTHENTICATION.md) and [local email](docs/EMAIL.md). Run `pnpm verify` for fast checks or `pnpm verify:isolated` for the complete gate with disposable services.

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
| Optional account storage  | `packages/persistence`, `apps/web`            | verified accounts, email/reset, private inputs, runs and Python workspaces      |
| Local Python runner       | `packages/isolated-runner`, `runner/python`   | local browser + CLI execution, bounded queue, raw trace, semantic mapping       |

The [Python Own Code page](docs/PYTHON-WEB-EXECUTION.md) executes edited Python through an isolated local orchestrator when explicitly enabled. It works anonymously; verified accounts can save source/input. Public execution remains gated, and C++/Java are unsupported. The separate JavaScript interpreter supports only the subset listed in [SECURITY.md](SECURITY.md). Current build status and lot reports are in `docs/progress`; the original independent audit remains in `docs/audit`.

## Visual reasoning and local Python

Teaching steps now drive [declarative choreography](docs/VISUAL-CHOREOGRAPHY.md): meaningful focus, comparisons, equations, value changes and identity-preserving swaps, with restrained semantic color and reduced motion. Run `pnpm runner:build`, then `pnpm dev:python` to open the local Python path with locally generated stable internal keys in ignored .env. See [Python setup and limits](docs/PYTHON-WEB-EXECUTION.md).

## Project documents

Read [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT.md](DEVELOPMENT.md), [TESTING.md](TESTING.md), [SECURITY.md](SECURITY.md), and [docs/ROADMAP.md](docs/ROADMAP.md). Public APIs and extension guidance are in [SIMULATION-PROTOCOL.md](SIMULATION-PROTOCOL.md), [PROBLEM-SDK.md](PROBLEM-SDK.md), [RENDERER-SDK.md](RENDERER-SDK.md), [PACKS.md](PACKS.md), and [AI-CONNECTORS.md](AI-CONNECTORS.md).

## Verified VNext release

The visual/account/local Python milestone passes the full production browser gate and a fresh GitHub clone: 138 unit/integration/security tests and 27 browser tests, with separate optional performance runs. See [the current audit](docs/audit/vnext-visual-auth-python/README.md) for exact scope, revisions, skips and production gates. The preserved MVP archive remains available.

## Public runner and production operations candidate

Public Python remains off by default. The new [runner architecture](docs/PUBLIC-RUNNER.md) uses a durable PostgreSQL queue, capability/ownership checks, quotas, a private orchestrator and fail-closed runtime preflight. [Production operations](docs/PRODUCTION-OPERATIONS.md) covers proxy/TLS policy, incident switches and deployment responsibilities. Independent security review and actual production Linux validation remain exposure gates.

Accounts use a [durable encrypted email outbox](docs/EMAIL.md), and [account data retention/deletion](docs/RETENTION.md) is explicit. [Native backup/restore](docs/BACKUP-RESTORE.md) includes a fresh-database drill. Run pnpm verify:public-runner and pnpm verify:prod-ops for isolated release checks.

Run pnpm capture:visual to create the [real UI review package](docs/VISUAL-CAPTURE.md): route inventory, meaningful algorithm phases, responsive/auth/Python/error screenshots, contact sheets, offline gallery and ZIP. Final artifacts stay outside Git.
