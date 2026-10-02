# Event vocabulary governance (v0.1)

`EVENT_TYPES` lists names under consideration, while `EVENT_GOVERNANCE` controls what can enter a trace. **ACTIVE** events have a current producer, reducer or presentation behavior, and regression coverage. **EXPERIMENTAL** events have a payload schema and reducer or presentation semantics but no curated producer yet. **RESERVED** names are rejected by validation until a producer, state meaning, renderer cue, and tests are added. No event is currently deprecated or scheduled for removal.

| Event               | Maturity     | Current source or reason                   |
| ------------------- | ------------ | ------------------------------------------ |
| `SELECT`            | RESERVED     | No producer or distinct state meaning      |
| `COMPARE`           | ACTIVE       | Editable array interpreter                 |
| `UPDATE_VALUE`      | ACTIVE       | Editable array interpreter                 |
| `CREATE_ENTITY`     | ACTIVE       | Road Construction adds roads during replay |
| `REMOVE_ENTITY`     | RESERVED     | No producer or renderer lifecycle test     |
| `MARK`              | ACTIVE       | BFS path and tree diameter                 |
| `UNMARK`            | ACTIVE       | Two pointers and queen backtracking        |
| `ANNOTATE`          | ACTIVE       | Tree passes                                |
| `READ_INDEX`        | ACTIVE       | Editable array interpreter                 |
| `WRITE_INDEX`       | ACTIVE       | Editable array interpreter                 |
| `SWAP`              | EXPERIMENTAL | Array reducer supports it; no producer     |
| `MOVE_POINTER`      | ACTIVE       | Array-index variable instrumentation       |
| `VISIT_NODE`        | ACTIVE       | Graph BFS mapper                           |
| `DISCOVER_NODE`     | ACTIVE       | Graph BFS mapper                           |
| `VISIT_EDGE`        | RESERVED     | No producer or reducer behavior            |
| `RELAX_EDGE`        | ACTIVE       | Shortest Routes I                          |
| `SET_DISTANCE`      | ACTIVE       | Graph BFS mapper                           |
| `SET_PARENT`        | ACTIVE       | Graph BFS mapper                           |
| `QUEUE_PUSH`        | ACTIVE       | Grid and graph BFS mappers                 |
| `QUEUE_POP`         | ACTIVE       | Grid and graph BFS mappers                 |
| `QUEUE_PEEK`        | EXPERIMENTAL | Queue inspection cue; no curated producer  |
| `STACK_PUSH`        | EXPERIMENTAL | Stack reducer and renderer; no producer    |
| `STACK_POP`         | EXPERIMENTAL | Stack reducer and renderer; no producer    |
| `STACK_PEEK`        | EXPERIMENTAL | Stack inspection cue; no producer          |
| `HEAP_INSERT`       | EXPERIMENTAL | Priority queue reducer/view; no producer   |
| `HEAP_EXTRACT`      | EXPERIMENTAL | Minimum extraction; no producer            |
| `HEAP_UPDATE`       | EXPERIMENTAL | Priority update; no producer               |
| `VISIT_CELL`        | ACTIVE       | Grid BFS mapper                            |
| `DISCOVER_CELL`     | ACTIVE       | Grid BFS mapper                            |
| `SET_CELL_STATE`    | EXPERIMENTAL | Grid reducer supports it; no producer      |
| `SET_CELL_DISTANCE` | ACTIVE       | Grid BFS mapper                            |
| `DP_READ`           | ACTIVE       | Dice combinations                          |
| `DP_UPDATE`         | ACTIVE       | Dice combinations                          |
| `DP_TRANSITION`     | EXPERIMENTAL | Dependency cue without state mutation      |
| `DP_BASE_CASE`      | ACTIVE       | Dice combinations                          |
| `SET_SEARCH_RANGE`  | RESERVED     | No binary-search producer or renderer      |
| `SET_MIDPOINT`      | RESERVED     | No binary-search producer or renderer      |
| `DISCARD_RANGE`     | RESERVED     | No binary-search producer or renderer      |
| `VISIT_TREE_NODE`   | ACTIVE       | Tree diameter                              |
| `ENTER_SUBTREE`     | RESERVED     | No producer or subtree state meaning       |
| `EXIT_SUBTREE`      | RESERVED     | No producer or subtree state meaning       |
| `SET_DEPTH`         | ACTIVE       | Tree diameter                              |
| `SET_SUBTREE_SIZE`  | ACTIVE       | Subordinates postorder traversal           |
| `FUNCTION_CALL`     | RESERVED     | No call-stack producer or renderer         |
| `FUNCTION_RETURN`   | ACTIVE       | Editable array interpreter                 |
| `BACKTRACK`         | RESERVED     | No producer or reducer behavior            |

`validateEvent` checks type-specific required payload fields, allowed payload keys, entity count and kind, finite values, legal statuses, and nonnegative distances, depths, and subtree counts. A reserved name is not a supported event merely because it appears in `EVENT_TYPES`.

## Raw operations and deterministic mapping

`RawTraceEvent` has schema version `0.1`, an operation name, primitive data, and an optional source reference. `validateRawTraceEvent` rejects malformed versions and data. A `SemanticMapper` can emit one or several semantic drafts from a raw operation. `mapRawTrace` preserves raw order and has no AI dependency.

The array interpreter maps `read`, `write`, `variable`, `branch`, and `return` records. Grid and graph BFS emit `discover`, `visit`, queue, distance, parent, and path operations; a shared deterministic mapper assigns grid or graph semantic event types. Their raw records are domain-aware instrumentation, not CPU instruction logs.

Direct semantic instrumentation remains appropriate when a curated algorithm already knows the educational action and an artificial raw layer would only duplicate it. Tree Diameter and Dice Combinations use that route for now. The event validator and problem SDK apply the same semantic contract to both routes. If those problems later run editable source, they should gain a meaningful raw mapper rather than wrapping event drafts in a fake identity mapping.
