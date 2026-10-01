# Implementation roadmap

| Lot | Scope                                                   | Exit evidence                       | Status                                 |
| --- | ------------------------------------------------------- | ----------------------------------- | -------------------------------------- |
| 0   | Inventory, architecture, ADRs, CI, development setup    | Docs and CI                         | Complete for empty baseline            |
| 1   | Domain, event protocol, IDs, validators                 | Protocol tests                      | Complete for v0.1                      |
| 2   | Reducer, snapshots, seek, playback                      | Replay tests                        | Complete for bounded traces            |
| 3   | Array, grid, graph, tree, DP renderers and player       | Production build                    | Complete for first five families       |
| 4   | 15–20 diverse curated problems and correctness tests    | Family oracle/property suites       | In progress: five problems             |
| 5   | Structured input editors, lab, comparison               | Browser E2E workflows               | In progress: JSON input lab            |
| 6   | External pack/plugin validation and renderer SDK        | Third-party sample pack             | Planned                                |
| 7   | Model adapters, privacy controls, model evaluation      | Local/external integration tests    | In progress: adapters and schema tests |
| 8   | Isolated multi-language runtime and Tree-sitter         | Security review and isolation tests | Planned; no arbitrary-code endpoint    |
| 9   | Raw trace and semantic mapping for one language         | End-to-end code trace               | Partial: bounded JS array interpreter  |
| 10  | PostgreSQL, object storage, API/worker, migrations      | Persistence integration tests       | Planned when shared data is needed     |
| 11  | Hardening, accessibility, performance, deployment, book | Full verification matrix            | Planned                                |

Prioritize correctness and architecture across problem families before adding large catalogs. Add system services only when an actual workflow needs them.
