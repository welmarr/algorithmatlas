# Production operations candidate

This release supplies a controlled deployment candidate. Public execution is off by default. Independent security review, actual production Linux validation, edge policy, TLS/DNS/SMTP credentials and backup storage remain operator gates. Windows Docker Desktop test evidence does not satisfy the production Linux profile.

## Service separation

Deploy Web, email worker, PostgreSQL and a dedicated runner as separate services with separate Unix identities. The Web container runs as node, has no Docker executable/socket/mount and cannot select container commands. The runner is a nonroot user on a dedicated Linux host with rootless Docker, cgroups v2 and seccomp enabled. Bind orchestrator only to 127.0.0.1; use a restricted encrypted SSH tunnel from the Web host to that loopback port. Keep its strong bearer key server-only. Firewall public access to the runner, PostgreSQL, Mailpit and metrics. The local preview uses a developer OS user and does not prove OS-level separation.

Pin PYTHON_RUNNER_IMAGE to the tested sha256 image ID and run `pnpm runner:preflight` with RUNNER_PREFLIGHT_PROFILE=production before enabling public admission. Apply AppArmor/SELinux according to the host distribution and review rootless/cgroup delegation. Docker shares the host kernel; a dedicated disposable VM limits host exposure but is not a proof against escapes. gVisor, Kata and Firecracker can add boundaries, with compatibility/operations costs; none was installed or tested in this release. An independent reviewer must approve the chosen production runtime.

## Reverse proxy and secrets

APP_URL is the canonical HTTPS origin. Explicit TRUST_PROXY=true requires a random 32-byte hexadecimal TRUST_PROXY_KEY. The trusted edge must strip incoming forwarded/proxy headers, set x-atlas-proxy-key, x-real-ip to one validated client address, x-forwarded-proto=https and x-forwarded-host to the canonical host, and preserve Host. Only this edge may reach the Web listener. Application validation rejects spoofed/missing values, mismatched origins/hosts and IP lists. Loopback test profiles do not assert real TLS termination.

Set stable independent 32-byte hex PYTHON_ORCHESTRATOR_KEY, EXECUTION_CAPABILITY_KEY, ABUSE_HASH_KEY and EMAIL_OUTBOX_KEY. Use a secret manager; no browser access, logging or Git. NODE_ENV=production sets Secure/HttpOnly/SameSite=Lax session and guest cookies. Tokens remain in URL fragments until submitted; referrer policy restricts leakage. Apply edge request/body/connection limits and HTTPS/HSTS at the ingress. The current CSP allows Next inline scripts/styles; a strict nonce policy remains separate work.

Rotate orchestration secrets by closing admission and updating both ends atomically. Drain/expire jobs before rotating capability keys. Pause email and drain or cancel encrypted rows before rotating the outbox key; retain the prior key only for controlled backup recovery. Rotate database/SMTP credentials through the service manager. Revoke all sessions with `node scripts/operations.mjs revoke-sessions CONFIRM`.

## Run and supervise

Run migrations once with a migration role, then use least-privilege runtime roles. Start the private runner (`pnpm execution:serve`), email worker (`pnpm email:worker`) and Web (`pnpm --filter @sim/web start`) under systemd or equivalent restart supervision. Never launch submitted code in Web. Schedule `pnpm db:prune` every minute and backup daily. Production service definitions must specify working directory, secret environment file, user, restart policy, resource budgets and logging retention for that host.

Email worker and backup jobs may use their own scoped database roles; the supplied local migration setup uses one role for test reproducibility. Restrict production grants to needed tables; role provisioning is an operator responsibility.

## Health and observability

- GET /api/health: Web liveness, independent of optional dependencies.
- GET /api/ready: bounded database, execution and email dependency states; no secrets. Intentional feature disable/pause is reported as such. A stopped required worker produces 503.
- Private runner /health, /ready and /metrics: bearer authentication required on every request, loopback only.
- `pnpm ops:status`: aggregate queue/outbox states, heartbeat age, seven-day metric sums and incident controls.
- Runner logs: job ID, bounded termination category, execution and cleanup duration. No submitted source, input, capability, cookies or auth tokens.

Monitor queue saturation/age, repeated 429s, timeout/memory/output/trace/policy counts, cleanup failures, dead letters, stale email heartbeat, database growth, disk space and backup failures. Aggregate duration sums require completion counts to compute averages; no latency-percentile claim is made. Central metrics export/alerts require deployment wiring.

## Incident controls

```sh
pnpm ops:control python_disabled on
pnpm ops:control python_guest_disabled on
pnpm ops:control python_verified_disabled on
pnpm ops:control runner_paused on
pnpm ops:control email_paused on
pnpm ops:control signup_disabled on
pnpm ops:status
```

Use off to resume after investigation. Environment switches PUBLIC_PYTHON_EXECUTION_ENABLED=false, PYTHON_GUEST_EXECUTION_ENABLED=false, PYTHON_VERIFIED_EXECUTION_ENABLED=false and OUTGOING_EMAIL_ENABLED=false also gate services at startup. DB switches persist across restarts. Global/role Python controls stop matching admissions and claims and request cancellation of active work. runner_paused stops worker claims and cancels active work while the bounded queue may still accept submissions; use python_disabled to close admission too. Public learning stays available; saved work stays accessible.

For suspected runner escape: close admission, isolate the runner host at the firewall, preserve bounded evidence, revoke service credentials, investigate offline and rebuild the host/image from reviewed inputs. Never clear a cleanup pause without confirming named containers are gone. Never globally prune a shared Docker host. Inspect only project labels and recorded IDs. Restore data using BACKUP-RESTORE.md and revalidate before exposure.

## Release gates

`pnpm verify` is dependency-light. `pnpm verify:isolated` runs the full gate with fresh disposable PostgreSQL/Mailpit. `pnpm verify:public-runner` and `pnpm verify:prod-ops` each provision their own services. Full CI includes actual Docker/SMTP/DB/browser checks. Final reports distinguish local automated evidence, fresh-clone/remote CI evidence and untested production operator responsibilities.
