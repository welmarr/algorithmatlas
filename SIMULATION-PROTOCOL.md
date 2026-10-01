# Simulation protocol v0.1

Each event has `schemaVersion`, deterministic `eventId`, one-based `step`, controlled `type`, stable `entities`, finite primitive `payload`, `explanation`, and optional `sourceRef`. `createEvents` assigns contiguous steps and IDs. `validateEvent` rejects malformed events. Public errors are `UNKNOWN_EVENT_TYPE`, `INVALID_EVENT`, and `INVALID_ENTITY`.

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

The vocabulary is declared in `packages/semantic-events/src/index.ts` and covers generic, array, graph, queue, stack, heap, grid, DP, binary search, tree, and recursion events. The reducer currently gives state-changing semantics to entity creation/removal, value updates, marks, discovery/visits, distance/parent/depth, collections, swaps, and edge relaxation. Other events annotate and highlight their referenced entities. Add a reducer case only when the event changes canonical state.

ID grammar: `array:0`, `grid:4:7`, `graph:node:A`, `graph:edge:0`, `tree:node:17`, `dp:3`, `queue:item:5`, `stack:item:5`, `heap:item:12`. An entity ID must exist in initial state or be created before use. IDs stay stable for the whole run.

`SimulationTimeline` accepts initial state and events and supports `next`, `previous`, `seek`, `rewind`, `play`, `pause`, speed, subscriptions, event filters, code-line lookup, and snapshots. Positions range from 0 to event count. Snapshots default to every 100 events and are configurable. Replaying at position P begins at the nearest preceding snapshot. Stored snapshots improve seek latency at a memory cost; use a larger interval for large traces.

Protocol versions are independent of package versions. A future incompatible event shape requires a new schema version and migration or explicit rejection; do not silently reinterpret v0.1 traces.
