# Final feature and problem matrix

| Capability                                                    | Current status                           | Evidence / limit                                                              |
| ------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Domain, event schemas, reducer, snapshots, deterministic seek | Complete for bounded v0.1 traces         | `packages/domain`, `semantic-events`, `simulation-core`; full tests           |
| Teaching steps and technical navigation                       | Complete for curated suite               | `ProblemWorkspace`, `teaching-steps.test.ts`, browser player tests            |
| Array, grid, graph, tree, DP renderers                        | Complete for bounded examples            | State-driven components, renderer tests, 390px browser checks                 |
| Queue, stack, heap, variables, code renderers                 | Complete for registered bounded views    | Renderer gallery and state tests; code source refs vary by producer           |
| Curated problems                                              | 20 working definitions                   | Problem matrix below; custom input, oracles, replay                           |
| Independent lab                                               | Four structure editors, eight algorithms | `AlgorithmLab`, browser tests                                                 |
| Algorithm comparison                                          | Three traversal pairs                    | `AlgorithmComparison`, browser tests                                          |
| Editable browser code                                         | Increasing Array only                    | Bounded JavaScript subset, true execution-derived events                      |
| Local Python runner                                           | Developer CLI only                       | Docker probes, raw trace, constrained semantic interpreter                    |
| C++ / Java                                                    | Not implemented                          | No image, compiler path, or API                                               |
| AI adapters                                                   | Seven validated response families        | Built-in keyless tests; compatible transport mocked; live endpoint unverified |
| PostgreSQL accounts/progress                                  | Optional local workflow                  | Migrations, ownership tests, E2E registration/save/login; preview DB disabled |
| Public arbitrary-code service                                 | Not implemented                          | Deliberate security gate; no web route                                        |
| Packs / renderer extension                                    | Reviewed local registration              | Manifests do not execute code; no automatic remote installation               |

## Curated problem matrix

| Family                                         | Problem IDs                                                 | Input-dependent status                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Greedy / basic arrays                          | `increasing-array`, `distinct-numbers`, `sum-of-two-values` | Curated reference runs; Increasing Array also has editable subset code |
| Sliding window / binary search                 | `sliding-window-sum`, `factory-machines`                    | Bounded custom inputs and replay                                       |
| Range queries                                  | `static-range-sum`, `dynamic-range-sum`                     | Bounded queries/updates and replay                                     |
| Grid / BFS                                     | `labyrinth`, `counting-rooms`                               | Bounded grids and replay                                               |
| Graph traversal / shortest path / connectivity | `message-route`, `shortest-routes-i`, `road-construction`   | Bounded graph input and replay                                         |
| Trees                                          | `tree-diameter`, `subordinates`                             | Bounded connected trees and replay                                     |
| Dynamic programming                            | `dice-combinations`, `edit-distance`                        | Bounded 1D/2D tables and replay                                        |
| Strings                                        | `string-matching`                                           | Bounded text/pattern and replay                                        |
| Backtracking                                   | `chessboard-and-queens`                                     | Bounded board and replay                                               |
| Number theory / geometry                       | `exponentiation`, `polygon-area`                            | Bounded numeric/point inputs and replay                                |

The generic renderers consume `SimulationState`, not problem IDs. Many newer curated problems emit semantic drafts directly because their own algorithm knows the action; only selected paths use an explicit raw-operation mapper. The reference source shown on most pages is illustrative rather than executable user code.

## Renderer matrix

| Renderer  | Producer / demo                                        | Verified behavior and boundary                                                 |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Array     | Increasing Array, array and string cases               | Values, indices, active change and text before→after cue; one-dimensional      |
| Grid      | Labyrinth, rooms, queens                               | Walls/visits/path or choices with row/column labels; bounded grid              |
| Graph     | Message Route, Shortest Routes I                       | Directed/weighted edges, distances, visits, path metadata; bounded nodes/edges |
| Tree      | Tree Diameter, Subordinates                            | Hierarchical node layout, visits/path, 390px layout check                      |
| DP table  | Dice Combinations, Edit Distance                       | 1D/2D cells, dependencies, active target, labeled cells                        |
| Queue     | Renderer gallery and BFS state                         | Ordered IDs and active item; not a general queue editor                        |
| Stack     | Renderer gallery/state test                            | Ordered push/pop view; not a curated stack problem                             |
| Heap      | Renderer gallery/state test                            | Numeric-priority order; not a curated heap problem                             |
| Variables | Exponentiation and state inspector                     | Named values and change cues                                                   |
| Code      | Executed Increasing Array source, references elsewhere | Active source line; most curated sources are illustrative                      |

All ten have registration/capability checks and responsive gallery coverage. This matrix does not imply that every renderer has a dedicated curated problem or a completed manual screen-reader audit.
