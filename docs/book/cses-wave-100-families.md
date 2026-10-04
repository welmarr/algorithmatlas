# Wave 100: math, geometry, range, tree, and graph algorithms

The final 25 tasks were chosen to fill algorithm-family gaps while preserving one deterministic simulation model. Each definition parses a small bounded learning instance, computes a correct CSES result, emits semantic events, and exposes independently tested reference code. The larger official constraints motivate the stated asymptotic algorithms; the interactive bounds keep timelines readable.

## Modular arithmetic and counting

`Exponentiation II` reduces the nested exponent modulo `p−1` before binary exponentiation modulo prime `p`. The exceptional zero base is handled using whether the _true_ exponent is zero, because Fermat reduction only applies directly to nonzero residues. The oracle constructs small nested powers exactly, including `0^0`, then reduces the result. `Fibonacci Numbers` uses fast-doubling pairs `(Fₙ,Fₙ₊₁)`; the oracle walks the ordinary recurrence. `Counting Divisors` uses a smallest-prime-factor sieve and multiplies `(exponent+1)` for each factor, checked by direct divisor enumeration. `Common Divisors` counts multiples from the largest candidate down, checked against all pairwise Euclidean GCDs.

The combinatorics tasks reuse prime-modulus factorial/inverse reasoning. `Binomial Coefficients` is checked against Pascal rows. `Creating Strings II` divides `n!` by every repeated-letter factorial and is checked against unique permutations. `Distributing Apples` maps stars-and-bars separators to a binomial coefficient and is checked against exhaustive weak compositions. Every explanation identifies the counted objects and why there is no overlap.

## Geometry with exact decisions

`Point Location Test` takes the sign of `(b−a)×(c−a)` and maps it to LEFT, RIGHT, or TOUCH. Its oracle uses the signed triangle-area expansion instead of the implementation expression. `Line Segment Intersection` handles proper straddles and all collinear or endpoint contacts. Its independent oracle solves parametric segment intervals and projects collinear segments onto a coordinate axis. The interactive coordinates are bounded so cross products remain exact JavaScript integers. The array representation labels each case and exposes the determinant; no arbitrary animation decides the answer.

## Dynamic range aggregates

`Hotel Queries` stores maximum remaining capacity in a segment tree and always descends into the left capable child, proving first-fit selection. `List Removals` stores one for every surviving position in a Fenwick tree and binary-lifts to the requested rank. `Prefix Sum Queries` uses the associative pair `(sum,bestPrefix)` with merge `best=max(left.best,left.sum+right.best)`; the empty prefix contributes zero. `Pizzeria Queries` turns `price+distance` into `price−index` on the left and `price+index` on the right, with a minimum tree for each transform. Randomized direct mutable-list or range scans test these structures after mixed updates.

## Tree intervals and ancestry

`Company Queries II` and `Distance Queries` share binary-lifting LCA reasoning: align depths, jump both nodes below the shared ancestor, then use the ancestor to answer the boss or path-length query. Parent-chain intersection and BFS distances independently check the answers. `Finding a Centroid` computes subtree sizes and compares each child part and the complementary parent part with half the tree; the oracle actually removes the candidate and measures every component. `Subtree Queries` maps each rooted subtree to one Euler interval and uses Fenwick point updates and prefix differences. `Distinct Colors` sweeps those intervals backward, keeping one active position per color in a Fenwick tree. Direct descendant scans and color sets form independent oracles.

## Graph structure, routes, and cycles

`Round Trip` uses active DFS ancestors to reconstruct an undirected simple cycle; its oracle checks cycle existence with a disjoint-set scan and validates every returned road. `Planets Queries I` composes `2ᵏ` functional-graph jumps and is checked against direct stepping and long-cycle reduction. `Planets and Kingdoms` uses Kosaraju finish order and reverse exploration; the oracle compares every label pair with mutual transitive reachability.

`Cycle Finding` uses a zero-initialized Bellman–Ford pass to find a negative cycle in any component and follows predecessor pointers into it. Floyd–Warshall negative diagonals check existence, while the returned directed cycle is validated edge by edge and by negative weight. `High Score` uses max-relaxation and reverse reachability to distinguish a profitable cycle on a start-to-finish route from one that cannot affect the answer. Its oracle enumerates small simple paths and reachable positive cycles. `Flight Discount` combines shortest paths before and after each potential coupon edge, checked against a separate two-layer relaxation model. `Investigation` counts paths, minimum flights, and maximum flights only along shortest-path edges; positive weights order these dependencies. Exhaustive simple-route enumeration checks the four outputs.

## Visual and certification boundary

The problem definitions own algorithm-specific state. They emit `VISIT_NODE`, `VISIT_TREE_NODE`, `WRITE_INDEX`, or `ANNOTATE` with stable IDs and plain-language reasons. The reducer and renderer never recompute an answer. The catalog certificate verifies deterministic traces, complete Teaching Steps, replay consistency, valid renderer and choreography, official IDs, parser rejection, executable examples, evidence files, and all-route browser behavior. The selected-family loader keeps the full executable catalog out of the initial client bundle while a completeness test requires a lazy mapping for every registered ID.
