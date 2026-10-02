# Runner security evidence

## Implemented boundary

The browser calls same-origin Web routes. The Web container runs as node and receives neither Docker executable nor socket. It forwards a versioned bounded job to an authenticated loopback orchestrator. Only that trusted service controls the fixed runner image and command. Public clients do not receive the orchestration key or direct runner URL.

The production topology requires a separate Unix identity and dedicated Linux runner host, with rootless Docker/cgroups v2 and a restricted encrypted Web-to-loopback tunnel. This Windows development launcher shares the developer host and does not prove that deployment separation.

PostgreSQL serializes admission; a database advisory lock permits one worker leader per queue. Claims use SKIP LOCKED. Each started job records its ID before container creation; restart cleans that named container and marks interruption without rerunning submitted code. Runtime identity changes fail closed. Cleanup completes before capacity is released; a cleanup failure faults/pauses the worker. Bounded submissions can still enter a paused queue until admission is explicitly disabled.

Browser handles use random UUIDs plus a 256-bit pseudorandom HMAC capability under an independent secret; only the capability hash is stored. Access also checks guest/client context and account ownership. Identical scoped retries reuse a job; changed content conflicts. Job IDs alone, wrong capabilities and other owners do not authorize polling or cancellation. Expiration removes access.

## Actual automated evidence

Kernel/runtime preflight probes nonroot UID/GID 65534, read-only root, no network, no host mounts, all capabilities dropped, no-new-privileges and seccomp. Resource settings are memory 128 MiB/no swap, PID 32, CPU 0.5, CPU ulimit 2 seconds, wall deadline 5 seconds, nofile 64 and 8 MiB noexec/nosuid/nodev tmpfs. Source, input, output, trace and result sizes are bounded.

Docker tests execute normal and edited code, malformed source, division by zero, infinite/CPU-heavy loops, memory pressure, large output/trace, filesystem paths, /proc, environment, metadata address, DNS/TCP imports and process/fork attempts. Most prohibited operations are rejected by the educational AST/import policy; independent runtime probes validate kernel controls. These tests do not establish resistance to every Python or kernel escape.

Recovery/auth tests exercise an actual orphan, unauthenticated private routes, duplicate submission, wrong capability/client, deliberate disablement and CPU timeout cleanup. An added real-container load test observes two simultaneous containers, fills the waiting queue, rejects one above capacity, cancels queued/running jobs, completes short jobs alongside a timeout, checks final metrics and verifies all recorded containers are absent. Deterministic worker tests additionally hold a cleanup barrier and inject cleanup failure to prove slots cannot be reused early.

Base image: python:3.12-alpine@sha256:0687a6bc9716edc2a6ee0fbfb0f87e7ee358b262b67c9215de91bc9b2d38ba71. Python 3.12.15, standard-library subset, no third-party Python packages. Build inputs are runner/python/Dockerfile and trace.py. No-cache verification rebuilds the runtime; deployment must pin its resulting immutable sha256 image ID. No SBOM generator or stronger sandbox runtime was added.

## Remaining assumptions

The production profile intentionally rejects this Windows/rootful/cgroups-v1 environment. Linux GitHub CI uses the loopback test-production profile too; it is not validation of a production rootless host. Independent review, actual target-host preflight, patching, tunnel/firewall rules and runtime/grant configuration remain mandatory. gVisor/Kata/Firecracker were documented as possible stronger boundaries, not installed or tested. Public execution remains off by default.
