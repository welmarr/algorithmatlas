# Retention and account data

Run `pnpm db:prune` at least once per minute using a dedicated operator timer. Each transaction handles at most 500 rows per category (API accepts 1–1000); repeat batches during backlog recovery. Rows are locked with SKIP LOCKED so overlapping invocations do not block normal operations.

| Data                                                    | Policy                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sessions                                                | Delete after expiration (normally 30 days); password reset/account deletion revoke immediately |
| Verification/reset token hashes                         | Delete when expired; consumed hashes after one day                                             |
| Rate-limit hashes                                       | Delete one day after window ends                                                               |
| Queued source/input                                     | Clear on queue deadline, cancellation or terminal result                                       |
| Running source/input                                    | Clear when finished; retention also redacts expired orphan payload and requests cancellation   |
| Execution result/capability/idempotency metadata        | Default five minutes after terminal finish; configurable up to fifteen minutes                 |
| Orphan running/cancelling job ID                        | Preserve until trusted worker confirms container cleanup; never erase the only recovery handle |
| Email encrypted link                                    | Clear on sent, cancelled or terminal failure; expired/consumed links cancelled by retention    |
| Terminal email metadata/recipient                       | Seven days; EMAIL_RETENTION_DAYS accepts 1–30                                                  |
| Aggregate daily metrics                                 | Thirty days                                                                                    |
| Explicitly saved inputs/runs/Python workspaces/progress | Preserve until user deletes the item or account                                                |

The active runner also expires queued jobs and removes expired terminal results continuously. Periodic pruning is still required if the runner is stopped and for account/email records.

`/account/settings` shows account identity and stored-record counts. Account deletion requires the current password and an explicit DELETE confirmation, same-origin validation and per-account/IP/global limits. A transaction rechecks the password hash against concurrent password resets, cancels/redacts running executions, and cascades account-owned data. Detached orphan IDs remain only for cleanup; no saved source/input/result or owner ID is retained. Backups expire on the separately configured operator schedule; deletion does not rewrite offline backups.

IP/client quota keys use HMAC with ABUSE_HASH_KEY. No invasive fingerprint is used. Rotate the key during an incident only with stricter edge/global controls because rotation resets client/IP windows and guest identities. Logging platforms need their own bounded retention and restricted access.
