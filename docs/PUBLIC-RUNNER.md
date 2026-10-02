# Public Python runner candidate

The public entry point remains **off by default**. When explicitly enabled, anonymous and verified users can execute bounded Python through a private authenticated service. Next never invokes Docker or submitted Python. The runner must have a separate operating-system/runtime boundary in a public deployment; the local host launcher is development convenience.

## Flow and durable queue

Browser → same-origin validated Web API → authenticated loopback service → PostgreSQL execution_jobs → single trusted worker leader → ephemeral Python container → bounded result → the existing semantic/player pipeline.

Migration 005 adds the queue, operational controls, runtime identity and aggregate metrics. Admission is serialized transactionally for shared capacity and quotas. Claiming uses FOR UPDATE SKIP LOCKED. A dedicated PostgreSQL session advisory lock allows one worker leader per queue database; its configured concurrency is 1–2. Queued requests survive service restart. A previously started job is never retried automatically: restart removes its recorded container, marks it interrupted and clears its source/input before accepting new work. A changed Docker runtime identity refuses startup until the operator has drained/cleaned the old runtime.

References: [PostgreSQL queue locking](https://www.postgresql.org/docs/16/sql-select.html#SQL-FOR-UPDATE-SHARE), [advisory lock semantics](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS).

## Capabilities and retries

IDs are server-generated UUIDs. Browser access additionally requires a 256-bit pseudorandom HMAC capability derived from the random ID using the independent EXECUTION_CAPABILITY_KEY. Only its hash is stored. Capability, client context and account owner all have to match. The server does not return orchestration credentials.

Idempotency-Key is 16–128 URL-safe characters, scoped to the signed guest identity or authenticated user and expired with the job. Identical retries return the same handle; changed content under the same key returns a conflict. Clients must retain the guest cookie to retain their context. Rotate the capability key after draining retained jobs; an unexpected rotation invalidates retry handle recovery.

Source/input are cleared at completion, failure, cancellation and queue expiry. Results/capabilities default to five minutes after completion. The queue caps retained records as well as active capacity. Saved account workspaces have an independent lifecycle.

## Isolation and preflight

Build inputs are runner/python/Dockerfile and trace.py. The Python 3.12 Alpine base is pinned by digest. Production uses the resulting immutable sha256 image ID through PYTHON_RUNNER_IMAGE. No package installation occurs inside submitted runs; only the allowed standard-library subset is available.

The trusted service uses fixed argv, UID/GID 65534, network none, read-only root, capability drop ALL, no-new-privileges, Docker default seccomp, PID 32, 128 MiB memory/no swap, 0.5 CPU, CPU ulimit 2 seconds, wall deadline 5 seconds, noexec/nosuid/nodev 8 MiB tmpfs, nofile 64, bounded source/input/output/trace and verified removal before slot reuse. A cleanup failure pauses worker claims and requires recovery; the bounded queue may still accept submissions until the operator disables Python admission. Guest containers receive no host mounts, socket, control keys or Web environment.

pnpm runner:preflight fails closed on missing/weak keys, unpinned images, wrong bind, database/schema/runtime failure and failed kernel/container probes. The production profile additionally requires a nonroot Linux service user, rootless Docker and cgroups v2. The test-production profile is restricted to a loopback application URL and proves controls available on the test daemon; it is not production approval.

This Windows Docker Desktop host reports seccomp, cgroups v1 and no rootless daemon. Production preflight intentionally rejects it. Linux CI and a dedicated deployment host must be distinguished from this local evidence. [Docker rootless requirements](https://docs.docker.com/engine/security/rootless/) and [default seccomp](https://docs.docker.com/engine/security/seccomp/) inform the deployment profile.

## Configuration and health

Set PUBLIC_PYTHON_EXECUTION_ENABLED=true only after deployment gates; independently enable PYTHON_GUEST_EXECUTION_ENABLED and PYTHON_VERIFIED_EXECUTION_ENABLED. Keep PYTHON_ORCHESTRATOR_KEY, EXECUTION_CAPABILITY_KEY and ABUSE_HASH_KEY as separate random 32-byte hex secrets. Set RUNNER_EXECUTION_ENABLED=false to stop runner-side admission. Database controls support global, guest, verified and worker pause switches without source changes.

The service binds 127.0.0.1. A separate Web host reaches it through a restricted encrypted tunnel to that loopback port and authenticates every request. Do not publish the service or Docker socket. /health is authenticated liveness; /ready checks worker/queue/preflight; /metrics returns aggregate counts and duration totals without source, identity hashes, capabilities or email tokens. Public /api/ready reports bounded dependency status. Deliberately disabled execution does not make learning unhealthy.

pnpm verify:public-runner provisions disposable services and runs preflight, queue/abuse/auth/recovery/load tests and actual Docker attack probes. Passing this gate establishes automated evidence for the bounded candidate. Independent security review, firewall/tunnel configuration, rootless host validation, patching and operational review remain required before public exposure.
