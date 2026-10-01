# Simulation protocol v0.1

Each event has `schemaVersion`, deterministic `eventId`, one-based `step`, controlled `type`, stable `entities`, finite primitive `payload`, `explanation`, and optional `sourceRef`. `createEvents` assigns contiguous steps and IDs. `validateEvent` rejects malformed events. Public errors are `UNKNOWN_EVENT_TYPE`, `INVALID_EVENT`, `INVALID_ENTITY`, and `RESERVED_EVENT`.

Example:

```json
{
  "schemaVersion": "0.1",
  "eventId": "route:v0.1:4",
  "step": 4,
  "type": "VISIT_NODE",
  "entities": ["graph:node:A"],
  "payload": {},
  "explanation": "Visit A.",
  "sourceRef": { "file": "solution.ts", "line": 4 }
}
```

The vocabulary is declared in `packages/semantic-events/src/index.ts`. Its 45 names have individual maturity classifications in [docs/protocol/EVENT_GOVERNANCE.md](docs/protocol/EVENT_GOVERNANCE.md). Only active and experimental events may enter traces; reserved names are rejected. Active event payloads are validated by type, including required values, allowed keys, entity counts and kinds, legal statuses, and numeric ranges. A name in the vocabulary alone does not claim an implemented event family.

ID grammar: `array:0`, `grid:4:7`, `graph:node:A`, `graph:edge:0`, `tree:node:17`, `dp:3`, `queue:item:5`, `stack:item:5`, `heap:item:12`. An entity ID must exist in initial state or be created before use. IDs stay stable for the whole run.

`SimulationTimeline` accepts initial state and events and supports `next`, `previous`, `seek`, `rewind`, `play`, `pause`, speed, subscriptions, event filters, code-line lookup, and snapshots. Positions range from 0 to event count. Snapshots default to every 100 events and are configurable. Replaying at position P begins at the nearest preceding snapshot. Stored snapshots improve seek latency at a memory cost; use a larger interval for large traces.

`RawTraceEvent`, `AlgorithmEvent`, `TeachingStep`, and `SimulationState` are separate contracts. Raw records have their own schema version and validator. Increasing Array, Labyrinth, and Message Route expose raw operations in `ProblemRun.rawTrace`, then use deterministic semantic mappers. Tree Diameter and Dice Combinations directly instrument semantic actions and have an empty raw trace. All runs expose versioned teaching steps over inclusive semantic event ranges. Step 0 is the untouched initial state (`0..0`); subsequent steps cover every event exactly once. `seekTeachingStep` resolves a learning step to its final event position, while `SimulationTimeline.seek` keeps precise technical event navigation. Teaching cues are presentation metadata and never mutate canonical simulation state.

Protocol versions are independent of package versions. A future incompatible event shape requires a new schema version and migration or explicit rejection; do not silently reinterpret v0.1 traces.
