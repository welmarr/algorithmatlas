# Feature matrix

Scope: controlled deployment candidate, with public execution disabled by default. Status describes implementation and evidence, not independent certification.

| Area                                                | Status                             | Evidence / boundary                                                                              |
| --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Curated learning, 20 problems, 10 renderer families | COMPLETE                           | Input-dependent traces, teaching/choreography and browser regressions                            |
| Edited JavaScript and Python                        | COMPLETE within documented subsets | Actual source execution; unsupported Python intent retains raw trace                             |
| Optional verified accounts and saved work           | COMPLETE                           | Anonymous learning/execution retained; owner-scoped persistence and deletion                     |
| publicRunnerArchitecture                            | COMPLETE                           | Private authenticated orchestrator, PostgreSQL durable jobs, idempotency and scoped capabilities |
| publicRunnerIsolation                               | PARTIAL                            | Actual Docker/kernel probes pass; target production Linux/rootless boundary awaits validation    |
| publicRunnerAbuseControls                           | COMPLETE                           | Guest/account/IP/global quotas, queue/concurrency bounds and incident switches                   |
| publicRunnerOperations                              | COMPLETE                           | Recovery, cleanup barrier, metrics, readiness and retention                                      |
| productionSMTPAdapter                               | COMPLETE                           | Generic TLS SMTP adapter; local SMTP acceptance through Mailpit                                  |
| emailOutbox                                         | COMPLETE                           | Encrypted durable outbox, transactional claims, leases, bounded retry/dead letter                |
| backupRestore                                       | COMPLETE                           | Native dump restored into an empty independent database; ownership/auth data checked             |
| retention                                           | COMPLETE                           | Bounded batches for ephemeral data; explicit saved work retained                                 |
| productionProxy                                     | PARTIAL                            | Policy and spoofing tests pass; deployed TLS/proxy/firewall configuration remains untested       |
| manualSecurityReview                                | NOT STARTED                        | Independent hostile-code hosting review required before public exposure                          |
| General Python intent inference                     | PARTIAL by design                  | Supported deterministic patterns only; no expanded AI inference claim                            |
| C++ / Java                                          | NOT STARTED                        | Explicitly outside this split                                                                    |
| External visual review                              | NOT STARTED                        | Actual screenshot package enables review; generation is not certification                        |
