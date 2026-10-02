# Public runner and production operations audit

Date: 2026-10-02. Scope: **controlled deployment candidate**. Public Python execution is **disabled by default**. Implemented controls and test evidence are distinguished from target-host validation and independent review.

## Preserved history and release identity

| Ref                               | Identity                                                |
| --------------------------------- | ------------------------------------------------------- |
| Pre-split archive branch          | archive/pre-public-runner-prod-ops                      |
| Pre-split annotated tag           | pre-public-runner-prod-ops                              |
| Pre-split commit                  | 113ddfc09275fc21f44f8f2e74c82dd76e64da7e                |
| Pre-split tag object              | 546bb2ed8d14789cdc0a197897c22599ebb72e58                |
| Feature branch                    | feature/public-runner-prod-ops                          |
| Tested application/capture commit | 968f005086c66838ab638f0d796eb43d79acce9f                |
| Final release identity            | refs/tags/public-runner-prod-ops-v1, peeled commit      |
| Main identity                     | Same peeled release commit after non-force fast-forward |

Archive branch and annotated tag were pushed and their remote SHAs checked before implementation. Older audits/tags remain historical. The final audit commit cannot contain its own SHA: resolve the release tag with git rev-parse public-runner-prod-ops-v1^{}; the completion report records final feature/main SHAs and the actual release-candidate CI run. Changes after the tested application commit are audit documentation and a Windows verification-process launch fix, without changing application/runtime behavior or captured UI.

## Answers

- Guest and verified-account Python execution are implemented. The Web API admits durable PostgreSQL jobs; a private authenticated orchestrator claims and executes them. Jobs use scoped capabilities, idempotency and bounded retention.
- Default admission: guests 6/minute, 60/hour, 200/day; verified accounts 12/120/600. IP and global ceilings also apply. Queue eight, execution concurrency two; full policy in [abuse controls](ABUSE_CONTROLS_REPORT.md).
- The Web image runs as uid 1000 with no Docker executable, socket or mounts. The browser uses Web routes; the orchestrator listens on authenticated loopback. Docker containers use network-none/read-only/no host mounts/nonroot/cap-drop/no-new-privileges/seccomp and bounded resources. These tested controls do not eliminate shared-kernel risk.
- Generic TLS SMTP and an encrypted durable PostgreSQL outbox exist. Transactional claims, leases, retries, restart recovery, exhausted-message retirement and account deletion were exercised through Mailpit. At-least-once SMTP crash semantics are explicit.
- Native backup/restore succeeded into a fresh empty database. Retention removes expired ephemeral rows in bounded batches, preserving saved work and recovery IDs.
- Anonymous and verified A–Z browser journeys pass, including real source editing, visualization, account verification, save/restore, reset/revocation and deletion.
- Fresh GitHub clone and actual GitHub CI pass for the tested source; final release gates run again on the final candidate before merge. See [verification](TEST_REPORT.md).
- The real-UI review package contains 150 original screenshots, 78 contact sheets, route inventory, manifest, human index and offline HTML gallery. See [visual capture](VISUAL_CAPTURE_REPORT.md).

## Evidence

- [Feature matrix](FEATURE_MATRIX.md)
- [Runner security](RUNNER_SECURITY_REPORT.md)
- [Abuse controls](ABUSE_CONTROLS_REPORT.md)
- [Email and outbox](EMAIL_OUTBOX_REPORT.md)
- [Backup and restore](BACKUP_RESTORE_REPORT.md)
- [Operations](OPERATIONS_REPORT.md)
- [Verification](TEST_REPORT.md)
- [Visual capture](VISUAL_CAPTURE_REPORT.md)
- [Open production/review gates](OPEN_GATES.md)
- [Machine-readable status](status.json)

## Remaining exposure gates

Independent hostile-code security review; actual dedicated Linux/rootless Docker/cgroups-v2 production preflight; deployed trusted HTTPS ingress and secret management; real SMTP/domain delivery; encrypted backup storage, recovery schedules and alerts; external visual/pedagogical review. These are explicit conditions, not claims that local verification completes production deployment.

## Cleanup

Disposable test databases/mail/services, failed capture attempts, intermediate screenshots/reports and temporary backup data were removed. Six superseded project images were retired after checking no container used them. Current runner/Web images, final visual package, useful dependencies, active local PostgreSQL volume and Mailpit are intentionally retained. Fresh-clone checkout and remaining test receipts are removed after final release verification. Unrelated Docker resources and unattributed volumes are preserved.
