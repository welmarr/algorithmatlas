# Testing strategy

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before changes land. CI runs these on each push and pull request.

Current unit and integration tests verify protocol rejection and IDs; snapshot seek, rewind, replay, and state isolation; deterministic traces for all five problems; malformed inputs; a 600-case increasing-array oracle; seeded graph/tree/grid oracles; recursive DP checks; and teacher adapter normalization and rejection. Playwright E2E tests cover browsing, learning, playback, custom input, teacher fallback, all five renderer routes, and validation errors. Future lots need accessibility audits, parser fuzzing, sandbox security tests, and 1K–1M event benchmarks. No unrun suite is reported as passing.

The player E2E suite also checks that reads and writes have distinct text and color classes, and that reduced-motion mode keeps those cues while disabling animation.

Simulation correctness invariant: replaying all events must produce the same final state after any sequence of seeks. Algorithm correctness is independently checked against examples and oracles; trace equality alone does not prove the answer is correct.
