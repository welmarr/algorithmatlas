# LOT 02 — Event protocol governance and semantic pipeline

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `dde03c4566703aaba820db4dcdb1214d8e7f7771`

## Implemented

- Added event-specific runtime schemas for the 22 active and four experimental event types. Validation now enforces required and allowed payload fields, entity counts and kinds, legal statuses, and numeric constraints.
- Classified all 45 event names as active, experimental, or reserved. Reserved names are rejected by `validateEvent`; no type is currently deprecated or marked for removal.
- Made raw trace records versioned and validated their operation names, primitive data, source references, and reserved keys.
- Added a reusable `SemanticMapper` interface and ordered `mapRawTrace` function. One raw operation may map to multiple semantic drafts.
- Routed editable Increasing Array execution through the mapper. Converted Grid BFS and Graph BFS to domain-aware raw instrumentation with one shared deterministic mapper. Tree Diameter and Dice Combinations retain direct semantic instrumentation, with its rationale documented.

## Changed architecture

- The raw trace is an explicit validated layer before semantic events for array, grid BFS, and graph BFS.
- The problem SDK exposes raw records and semantic events separately; semantic validation applies to mapped and directly instrumented traces.
- Event vocabulary maturity is now machine-readable in `EVENT_GOVERNANCE` and explained in `docs/protocol/EVENT_GOVERNANCE.md`.

## Tests

- Unit and integration: **33 passed, 0 failed, 0 skipped**. New tests cover discriminated validation, invalid cell status, reserved events, raw version rejection, one-to-many mapping, and deterministic array/grid/graph pipelines.
- E2E: **8 passed, 0 failed, 0 skipped** on port 3001.
- Security: malformed payload and raw-record rejection tests passed; a dedicated untrusted-code sandbox suite remains for Lot 09.
- Format, lint, typecheck: passed.
- Production build: passed.
- Docker: image build passed; a temporary container returned HTTP 200 from `/api/health` and was stopped.

A legacy test created a `READ_INDEX` event without its now-required value and failed on the first test run. The fixture was corrected to a valid event; the final full suite passed.

## Known limitations

- Experimental events have schemas and reducer behavior but no curated producer. They are not advertised as supported examples.
- Only three problem families currently expose a raw-to-semantic pipeline; direct semantic instrumentation remains appropriate for the two other curated problems.
- The TypeScript `AlgorithmEvent.payload` shape remains generic for authoring convenience; runtime validation provides the event-specific contract. A generated discriminated type could strengthen compile-time checking later.

## Documentation updated

- `docs/protocol/EVENT_GOVERNANCE.md`, `SIMULATION-PROTOCOL.md`, `ARCHITECTURE.md`, `PROBLEM-SDK.md`, and `README.md`.
- Historic audit files remain unchanged.

## New technical debt

- Event schemas and the documented vocabulary classification are maintained in adjacent structures. A schema registry generator could prevent drift as the catalog expands.

## Deferred items

- Renderer foundation, expanded problem catalog, arbitrary-code parsing and sandboxing, and later platform lots.

## Next lot

Lot 03 — Renderer foundation.
