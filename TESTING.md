# Testing strategy

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before changes land. CI runs these on each push and pull request.

Current unit and integration tests verify protocol rejection and IDs; snapshot seek, rewind, replay, and state isolation; deterministic traces and malformed input checks for all twenty problems; a 600-case Increasing Array oracle; independent oracles for arrays, queries, DP, graphs, grids, trees, strings, backtracking, math, and geometry; executable reference code for all fifteen new additions; all eight independent lab algorithms, their replay and input validation; paired comparison inputs, independent timelines, route correctness, event metrics, and varied graph cases; and teacher adapter normalization and rejection. Playwright E2E tests cover browsing, learning, playback, custom input, teacher fallback, new problem routes, all ten renderer families, four lab editors, comparison playback and seeking, 390px layout, and validation errors. Future lots need accessibility audits, parser fuzzing, sandbox security tests, and 1K–1M event benchmarks. No unrun suite is reported as passing.

The player E2E suite also checks that reads and writes have distinct text and color classes, and that reduced-motion mode keeps those cues while disabling animation.

Lot 01 adds tests for teaching-step grouping and deterministic seeking, exact event seeking after changing playback modes, lexical block and loop scope, pointer inference from array access, and 390px Tree Diameter / Dice Combinations page widths. To run browser tests without replacing an app on port 3000, set `E2E_PORT=3001` in the environment before `pnpm test:e2e`.

Lot 03 adds isolated server-rendered component checks, deterministic tree and DP layout tests, queue/stack/heap semantic-state tests, and 390px browser coverage for all ten renderer families via `/lab/renderers`.

Simulation correctness invariant: replaying all events must produce the same final state after any sequence of seeks. Algorithm correctness is independently checked against examples and oracles; trace equality alone does not prove the answer is correct.

Lot 07 adds an executable sample community pack and custom renderer test. It validates the problem schema/trace/teaching contract, replays edited input, checks manifest traversal and duplicate rejection, verifies explicit trusted registration and collision guards, and renders the custom component with text cues. The contributor CLI smoke check creates and validates a temporary pack, then removes that verified temporary directory.
