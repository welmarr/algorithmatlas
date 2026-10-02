# Problem case studies

The cases below use the same architecture from `docs/book/README.md`: parse bounded custom input; execute a reference algorithm; capture raw operations where implemented; validate semantic events; derive complete teaching ranges; reduce events; render canonical state; and compare the final answer against an independent test oracle. The case text names an empty raw layer explicitly where direct curated instrumentation is used. Source files in `packages/problems/src` and `tests` are the executable specification.

| Family              | Case                                              | Source               |
| ------------------- | ------------------------------------------------- | -------------------- |
| Greedy array        | [Increasing Array](increasing-array.md)           | `index.ts`           |
| Grid BFS            | [Labyrinth](labyrinth.md)                         | `index.ts`           |
| Graph shortest path | [Shortest Routes I](shortest-routes-i.md)         | `extended-graphs.ts` |
| Tree search         | [Tree Diameter](tree-diameter.md)                 | `index.ts`           |
| Dynamic programming | [Edit Distance](edit-distance.md)                 | `extended-mixed.ts`  |
| Sliding window      | [Sliding Window Sum](sliding-window-sum.md)       | `extended-arrays.ts` |
| String matching     | [String Matching](string-matching.md)             | `extended-mixed.ts`  |
| Backtracking        | [Chessboard and Queens](chessboard-and-queens.md) | `extended-mixed.ts`  |
| Number theory       | [Exponentiation](exponentiation.md)               | `extended-mixed.ts`  |
| Geometry            | [Polygon Area](polygon-area.md)                   | `extended-mixed.ts`  |
| Range structures    | [Dynamic Range Sum](dynamic-range-sum.md)         | `extended-arrays.ts` |

The ten visual families are independently covered in `tests/renderer-state.test.ts`, `apps/web/src/components/renderer-components.test.ts`, and the renderer gallery browser test.
