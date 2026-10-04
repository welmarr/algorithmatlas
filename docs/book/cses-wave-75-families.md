# CSES wave 75: four reusable reasoning families

The problems added after the 50-task checkpoint use existing tree, array, grid, graph, and DP renderers. The new `topological-sort` choreography profile applies to Course Schedule, Game Routes, and Longest Flight Route without branching on a problem ID. The correctness tests are deliberately independent of the displayed reference snippets: they enumerate bounded alternatives or use a different algorithmic method.

## Tree passes and ancestor jumps

Tree Distances I searches from an arbitrary node to find one diameter endpoint, then from both endpoints. Every node's farthest distance is the maximum of those two endpoint distances. Tree Distances II computes the root's distance sum and subtree sizes, then reroots across each edge. Moving from parent to child shortens the `size[child]` paths into that subtree and lengthens the other `n − size[child]` paths, giving `sum[child] = sum[parent] + n − 2·size[child]`.

Tree Matching uses a postorder dynamic program. At a node, the best result either uses no child edge or matches the node to exactly one child. The two states distinguish whether the node is available to its parent. Company Queries I composes powers-of-two boss jumps, then follows the bits of each requested distance. Bounded independent tests compare both distance tasks with all-source breadth-first search, matching with every legal edge subset, and ancestor queries with direct one-level climbing.

## Interval and grid aggregation

Static Range Minimum Queries builds a sparse table. Since minimum is idempotent, two overlapping power-of-two blocks can cover a query. Dynamic Range Minimum Queries uses a segment tree: a point update refreshes its ancestors, and a range query combines disjoint interval nodes. Range Xor Queries uses two prefixes because equal prefix elements cancel under XOR. Range Update Queries uses a Fenwick tree over adjacent differences: a range add changes only its start and the position after its end, while a prefix query reconstructs one value. Forest Queries extends the prefix idea to a two-dimensional inclusion-exclusion equation.

These five tasks share bounded range validation and explicit query/update trace narration. Segment tree and Fenwick algorithms remain in the problem layer; the array renderer shows the current values and accessed positions without computing an answer. The forest uses the grid renderer to show each examined cell. Oracles use plain array scans, direct updates, and direct rectangle enumeration.

## Prefix reuse in strings

Finding Borders follows links in the final KMP prefix-function value to list every proper border. Finding Periods uses the Z-function: period `p` is valid when the suffix starting at `p` agrees with the prefix for at least `n − p` characters. String Functions displays both arrays. Word Combinations inserts dictionary words into a trie and advances prefix-count DP along matching paths. The test suite compares borders, periods, Z values, prefix values, and word segmentations with direct substring checks or recursive enumeration on small strings.

## State compression and scheduling

Counting Towers keeps two boundary types at each height and applies their local transition counts. An exact rectangle-tiling enumerator checks small heights independently. Projects sorts by end day, binary-searches the last compatible project, and chooses take or skip at each DP position; tests enumerate all compatible subsets. Elevator Rides uses a bitmask state `(rides, final load)` and compares it lexicographically. Exhaustive capacity-limited bin assignment checks the result on bounded inputs.

The interactive bounds are smaller than contest bounds so traces remain legible and replay remains responsive. Each task retains the general algorithm and complexity in its reference material. Source summaries and teaching copy are original, with official CSES task links in metadata.
