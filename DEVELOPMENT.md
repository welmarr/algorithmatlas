# Development

Use Node.js 22+ and pnpm 11. Install with `pnpm install`, then run `pnpm dev`. The app runs on port 3000. `pnpm build` produces a Next.js production build; `pnpm --filter @sim/web start` serves it.

Core packages expose TypeScript source through workspace exports. The Next app transpiles these packages. Keep algorithms in `packages/problems` and React-only code in `apps/web`. Add tests alongside each new protocol or algorithm capability. See [PROBLEM-SDK.md](PROBLEM-SDK.md) for adding problems.

Simulations need no `.env` file. Optional account storage requires `DATABASE_URL` and `pnpm db:migrate`; use `.env.example` and [docs/PERSISTENCE.md](docs/PERSISTENCE.md). Model keys entered in the UI live only in the tab's React state. A local model can use a loopback OpenAI-compatible endpoint, commonly `http://localhost:11434/v1/chat/completions`; the model host must permit browser requests. External model calls use HTTPS. The app does not proxy or persist keys.

Use `pnpm verify` during development. `pnpm verify:full` runs the Docker/PostgreSQL/browser gate with `DATABASE_URL` set to a disposable test database. `pnpm runner:build` and `pnpm runner:local examples/python-runner/request.json` exercise local Python traces. Do not point test migrations or account E2E at a database containing user data. Generated Playwright results and temporary test containers can be removed after verification; persistent Compose database volumes contain user data and must be retained until explicitly retired.
