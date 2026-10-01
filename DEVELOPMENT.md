# Development

Use Node.js 22+ and pnpm 11. Install with `pnpm install`, then run `pnpm dev`. The app runs on port 3000. `pnpm build` produces a Next.js production build; `pnpm --filter @sim/web start` serves it.

Core packages expose TypeScript source through workspace exports. The Next app transpiles these packages. Keep algorithms in `packages/problems` and React-only code in `apps/web`. Add tests alongside each new protocol or algorithm capability. See [PROBLEM-SDK.md](PROBLEM-SDK.md) for adding problems.

The current milestone is client-side and needs no `.env` file. Model keys entered in the UI live only in the tab's React state. A local model can use a loopback OpenAI-compatible endpoint, commonly `http://localhost:11434/v1/chat/completions`; the model host must permit browser requests. External model calls use HTTPS. The app does not proxy or persist keys.
