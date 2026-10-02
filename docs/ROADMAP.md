# Implementation roadmap

The construction branch follows the numbered lots in the full build specification. Detailed verified status is in `docs/progress/status.json` and the individual lot reports.

| Lot | Scope                                                            | Status                                                          |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| 00  | Inventory, architecture, baseline, CI, development setup         | Complete for the empty baseline                                 |
| 01  | Domain contracts, semantic events, validators                    | Complete for v0.1                                               |
| 02  | Reducer, snapshots, deterministic seek and playback              | Complete for bounded traces                                     |
| 03  | Renderer families and player                                     | Complete for ten renderer families                              |
| 04  | Representative curated problems                                  | Complete: twenty problems                                       |
| 05  | Independent algorithm lab with direct editors                    | Complete: four structures and eight algorithms                  |
| 06  | Side-by-side algorithm comparison                                | Complete: three traversal pairs with dual playback              |
| 07  | Contributor problem SDK, renderer SDK, versioned community packs | Complete: reviewed local registration and sample pack           |
| 08  | AI-agnostic connector protocol and normalized response families  | Complete: seven validated families and compatible adapters      |
| 09  | Isolated user-code execution foundation                          | Partial bounded browser JS interpreter; isolated runner planned |
| 10  | Semantic interpreter over raw execution context                  | Partial known-algorithm mapping; broader inference planned      |
| 11  | PostgreSQL, users, saved inputs, learning progress               | Planned                                                         |
| 12  | Security, accessibility, performance, deployment hardening       | Planned                                                         |

Prioritize correctness and architecture across problem families before adding a large catalog. Add system services only when a workflow needs them. The browser interpreter is not the isolated execution boundary required before public arbitrary-code execution.
