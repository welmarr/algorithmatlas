# LOT 08 — AI-agnostic connector protocol

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `1c046ce`

## Implemented

- Added versioned canonical responses for explanation, hint, alternative algorithm, concept explanation, code review, debug explanation, and semantic classification. A parser bounds text and nested findings, validates family fields, normalizes known semantic event aliases, strips unknown fields, and rejects unnegotiated concepts, algorithms, and event types.
- Added capability negotiation for supported concepts, visuals, semantic events, available algorithms, problem context, and the current teaching step. The request pipeline returns canonical platform objects; provider-specific Chat Completions shapes remain inside their adapter. No AI response enters the deterministic reducer.
- Added a provider-neutral adapter interface, compatible HTTPS and loopback-local endpoint transports, and a keyless built-in provider. Existing explanation adapters remain for compatibility. The problem page now displays a first-level hint through the canonical response path.
- Added an opt-in live integration test for a configured compatible endpoint. Default CI and local tests require no provider key.

## Tests

- Unit and integration: **113 passed, 0 failed, 1 skipped**. The skipped test is the opt-in live-provider check. New fixtures cover all seven response families, vocabulary normalization, capability rejection, bounded code-review findings, compatible transport parsing, built-in fallback, and malformed responses.
- E2E: **15 passed, 0 failed, 0 skipped**. The existing problem page workflow now checks the built-in canonical hint on a real event, and the full browser suite passed.
- Typecheck, lint, format, and production build: passed. All curated and lab routes were generated.
- Docker image build: passed. Updated local container on port 3000 returned HTTP 200 for `/problems/increasing-array` and a healthy `/api/health` response.

## Known limitations

- The UI currently consumes canonical hints while keeping the older explanation path for compatibility. The other response families are SDK APIs without dedicated UI workflows yet.
- A real model requires a user-configured endpoint and browser CORS support. The live integration test was skipped because no endpoint/model was configured; this lot does not claim a live-provider pass.
- The built-in hint is intentionally generic and does not reveal the answer. AI classification is advisory data only and cannot mutate a simulation.

## Cleanup

- Removed generated Playwright results after verification. No Docker volume is labeled for the Simulator Compose project; other project volumes were left intact.
- Historic audit files remain unchanged; no remote push was made.

## Next lot

Lot 09 — Isolated user-code execution foundation.
