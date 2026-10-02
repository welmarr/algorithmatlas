# Operational readiness

Implemented: dependency-independent Web liveness, dependency-aware readiness, authenticated private runner health/metrics, email heartbeat, aggregate queue/outbox/termination counters, execution/queue/cleanup duration sums and result sizes. Logs use bounded codes and safe job/row IDs; submitted source/input, capabilities, cookies and account links are not logged by the runner/worker.

Readiness differentiates intentional disablement from an unavailable required dependency. The email heartbeat must be fresh within thirty seconds. SMTP delivery outcomes provide transport evidence; readiness does not send probe emails or certify recipient delivery. Metrics provide counts/sums, not latency percentiles.

Operational CLI: ops:status, ops:control, db:prune, db:backup/db:restore and explicit revoke-sessions CONFIRM. Durable controls cover all/guest/verified Python, worker pause, signup and outgoing email. Pausing the worker does not close bounded admission; use python_disabled for that.

The deployment runbook documents separate services/users, canonical HTTPS origin, trusted ingress, stable independent secrets, migrations, image pin/update, database roles, supervision, backup/restore, retention timers, incident handling and rollback. Public runtime preflight checks configuration and actual container controls, and fails closed for an unsuitable production host.

Account settings show identity and owned-record counts. Password-confirmed deletion rechecks the password hash transactionally, cascades saved data, revokes sessions/links, redacts/cancels execution and retains only detached recovery IDs until cleanup.

Production responsibilities remain: dedicated rootless Linux host, actual TLS/proxy/tunnel/firewall, least-privilege role provisioning, service manager definitions, SMTP/domain configuration, encrypted backup destination, schedules, centralized logs/alerts and independent security review. Local Docker services do not constitute a complete production deployment.

Local secret scan checked 324 tracked files against the four generated development control/encryption keys: no matches. The local user database was backed up before migrations 005–006; the active development volume is preserved. Only independently labeled temporary test services and recorded unused project images are eligible for cleanup.
