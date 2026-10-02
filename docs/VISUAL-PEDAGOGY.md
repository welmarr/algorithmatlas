# Visual pedagogy

The stage answers what is considered, which rule applies, why the decision is
made and what changes. Numbers and labels come from the current run; AI is not
required. The original technical trace remains independently navigable.

| Family         | Representation and reasoning                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Array scan     | Current and predecessor labels, numeric comparison, before/after value and running total                               |
| Sorting        | Cards move between slots with permanent item identity and original position; duplicate order is stable                 |
| Two pointers   | Sorted cards, L/R variables, sum/target equation and the reason for discarding an endpoint                             |
| Sliding window | Window interval, outgoing/incoming labels and subtraction/addition equation                                            |
| Binary search  | Candidate time interval, midpoint, production predicate and discarded half                                             |
| BFS            | Frontier queue, explored cells/nodes, grid distance labels and reconstructed path                                      |
| DFS            | Stack order in the lab, visit sequence and branch descriptions; flood-fill cells remain visible                        |
| Shortest path  | Minimum-priority extraction, directed weights, accepted/rejected relaxation equation, distance and predecessor updates |
| Tree           | Parent/child hierarchy, depths, two diameter passes and connected final path                                           |
| DP             | Current target, dependency cells and connecting lines; explicit recurrence text; character headers for edit distance   |
| Range queries  | Queried interval and prefix subtraction                                                                                |
| Fenwick        | Separate tree cells labeled by covered range; lowbit propagation and query contributions                               |
| Strings        | Text/pattern alignment, matched prefix and fallback with a separate prefix table                                       |
| Backtracking   | Queen glyphs, choose/undo labels and reasons for releasing columns/diagonals                                           |
| Number theory  | Modular multiplication and squaring equations                                                                          |
| Geometry       | Actual polygon coordinates, current directed edge, signed cross product and doubled-area accumulation                  |

## Semantic color policy

Colors use shared theme tokens. Blue identifies consideration/comparison;
orange identifies change; green identifies acceptance/path. Neutral styling
is the default. Rejection uses a muted dashed treatment. Text labels, glyphs,
solid/dashed/double borders, equations and positions carry the same meaning.
No algorithm emits colors, and no random palette or rainbow DP table is used.

For `[8,2,5,1,7]`, Increasing Array compares each value with 8, makes changes
`2→8`, `5→8`, `1→8`, `7→8`, and accumulates `6,9,16,17`. The five cards retain
their order. The default two-pointer example `[8,1,6,3,10,4]`, target 12,
requires both a too-small and a too-large decision before returning original
positions `1 6`.

## Scope

The current curated input limits remain in force. Visual explanations are
specific to supported execution facts; a generic program receives observed
value changes rather than invented algorithm intent. This milestone does not
add segment-tree algorithms, C++/Java execution or a universal code-to-animation
inference engine. The existing 20 problems and lab are the visual acceptance
scope. Other families can extend the same validated facts and action model.
