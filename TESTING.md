# Testing strategy

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before changes land. CI runs these on each push and pull request.

Current unit and integration tests verify protocol rejection and IDs; snapshot seek, rewind, replay, and state isolation; deterministic traces for all five problems; malformed inputs; a 600-case increasing-array oracle; seeded graph/tree/grid oracles; recursive DP checks; and teacher adapter normalization and rejection. Playwright E2E tests cover browsing, learning, playback, custom input, teacher fallback, all five renderer routes, and validation errors. Future lots need accessibility audits, parser fuzzing, sandbox security tests, and 1K–1M event benchmarks. No unrun suite is reported as passing.

The player E2E suite also checks that reads and writes have distinct text and color classes, and that reduced-motion mode keeps those cues while disabling animation.

Lot 01 adds tests for teaching-step grouping and deterministic seeking, exact event seeking after changing playback modes, lexical block and loop scope, pointer inference from array access, and 390px Tree Diameter / Dice Combinations page widths. To run browser tests without replacing an app on port 3000, set `E2E_PORT=3001` in the environment before `pnpm test:e2e`.

Simulation correctness invariant: replaying all events must produce the same final state after any sequence of seeks. Algorithm correctness is independently checked against examples and oracles; trace equality alone does not prove the answer is correct.
