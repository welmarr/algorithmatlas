# LOT 09 — local user-code execution foundation

Status: **COMPLETE** for a local Python vertical slice. Public arbitrary-code execution remains out of scope pending the documented security gates.

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `903f391`

## Implemented

- Added a local CLI, fixed Docker image, request validation, host time/output/concurrency limits, and a Python AST parser with source-referenced raw trace output. `solve(data)` responds to supplied JSON input and can be inspected independently of curated solutions.
- The container has no network, ports, or persistent mounts. It uses a read-only root, non-root UID, dropped capabilities, process and resource bounds, and automatic removal. The host also forces cleanup after a wall-time or output violation.
- Recorded the threat model and Rust/Wasmtime/WASI tradeoffs in ADR-013. Earlier Rust and sandbox ADRs explicitly point to this local implementation. The web app has no arbitrary-code endpoint.

## Verification

- Explicit Docker integration: **4 passed**, including normal input-dependent traces, denied import, trace exhaustion, and forced termination after a caught trace exception. Two additional boundary unit tests passed.
- Full ordinary suite: **115 passed, 0 failed, 5 skipped**. Four skips are the opt-in Docker checks; one is the opt-in AI live check.
- Browser regression: **15 passed, 0 failed**. Lint, format, typecheck, production web build, and runner image build passed.
- After the timeout test, no container carried the runner label. The project-scoped Docker volume query returned none.

## Limitations and next work

- The runner is a local developer workflow and is not wired to the web editor. The browser interpreter is still a separate limited JavaScript educational path.
- Python AST and line tracing provide source references but do not yet infer algorithm semantics. Lot 10 will map trustworthy patterns and fall back to raw trace when ambiguous.
- C++ and Java are long-term language targets. Public exposure requires an isolated worker, auth and rate limits, abuse controls, image pinning, and independent security review as listed in ADR-013.

## Cleanup

- Removed generated Playwright results after verification. No Simulator-owned Docker volumes were found, so none were deleted; volumes for other projects were left untouched.
