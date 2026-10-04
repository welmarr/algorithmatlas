# Case study: dynamic programming and scans at CSES 50

The 30 → 50 wave adds 20 tasks without changing the simulation core. Each problem validates bounded JSON, computes a deterministic answer, emits semantic events, and lets the shared reducer replay the same state. The `array`, `dp`, and `grid` renderers only draw state; they do not solve a task.

## A loop order that changes the question

Coin Combinations I (1635) counts ordered sequences. For each sum `s`, it considers every possible last coin `c` and adds `dp[s-c]` to `dp[s]`. At sum 9 with coins 2, 3, and 5, this produces eight sequences. The emitted DP update names the chosen last coin and shows the predecessor count.

Coin Combinations II (1636) counts multisets. Its outer loop is the coin type, and its inner loop visits sums upward. This gives each multiset one construction order while still allowing repeated use of the current coin. The same input produces three combinations. The two algorithms share a state shape and renderer, yet their different loop order is the core teaching point. Independent tests enumerate ordered sequences and coin-count vectors separately; the tests do not reuse the DP recurrence.

## One use or unlimited reuse

Book Shop (1158) buys each book at most once. It scans budgets **downward** for each book, so a state read during that book's iteration still represents earlier books only. Money Sums (1745) follows the same descending pattern for subset reachability. Coin Combinations II scans sums **upward** because unlimited reuse of a coin type is allowed. These directions are algorithmic invariants, not animation choices.

## A 2D state is a proof outline

Array Description (1746) uses `dp[position][value]`: the number of valid prefixes ending with a chosen value. Only predecessor values `value-1`, `value`, and `value+1` can transition into it. The two-dimensional table makes the recurrence visible; its events carry the calculated count, while choreography briefly highlights a changed cell. Rectangle Cutting (1744) stores a minimum for every side-length pair and compares each possible first horizontal or vertical cut. Grid Paths I (1638) instead uses the grid renderer: an open cell receives paths from its top and left neighbors, and blocked cells stay visibly blocked.

## What the tests prove

Small independent oracles use breadth-first search for minimum-coin and digit-removal counts, exhaustive subsets for Book Shop and Money Sums, brute path enumeration for Grid Paths I, recursive first cuts for Rectangle Cutting, and full filling of unknown entries for Array Description. Scans use direct subarray enumeration, direct permutation passes, and reverse nearest-smaller checks. The curated reference source is executed separately on default and example inputs and compared with traced output. Certification checks deterministic events, Teaching Steps, choreography, and final replay state; browser smoke opens every route and reruns its example as custom input.

The interactive bounds keep traces legible. They do not replace the published CSES contest constraints. At 50 entries the eager client workbench registry raises first-load JS to 201 kB, so later waves should load a selected problem's implementation on demand while keeping the Home and Library metadata path light.
