# LOT 10 — semantic interpreter

Status: **COMPLETE** for the first local Python mappings.

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `5e51ed5`

## Implemented

- Added `@sim/semantic-interpreter`: validated Python raw trace to canonical algorithm events, inference provenance/confidence, source references, learning steps, and deterministic timeline.
- Direct array mutations become `WRITE_INDEX`; graph distance mutations become `SET_DISTANCE`. A graph change becomes `RELAX_EDGE` only with matching source assignment, endpoints, edge weight, and arithmetic. Inconsistent evidence is shown at lower detail and never assigned an invented algorithm meaning.
- Raw technical events remain available. Routine no-change lines are not promoted into educational steps. Corrected the Python raw trace operation names to canonical lowercase syntax for protocol validation.

## Verification

- Unit and integration: **118 passed, 0 failed, 6 skipped**. Five skips are Docker opt-in checks and one is the AI live check.
- Explicit Docker integration: **5 passed**, including edited Increasing Array Python on `[8,2,5,1,7]`, four observed writes, and six learning steps.
- Typecheck, lint, format, and production build: passed. Browser code and routes were unchanged; the prior 15 browser tests remained passing from Lot 09.

## Limitations

- Source context is a deliberately narrow line pattern after Python AST validation. No general AST semantic inference, Tree-sitter grammar, or AI classification is implemented for user code.
- The interpreter maps an integer array and a restricted weighted graph shape. Unknown operations retain raw trace and conservative annotations.
- Python is local only. No public runner API or browser connection to the Docker daemon is provided.

## Cleanup

- No generated browser result directory remained. Docker reported no residual runner containers and no volumes labeled for the Simulator Compose project. Other project resources were left intact.
