# ADR 018 — Explicit Linux isolation profile and authenticated proxy path

Status: accepted as a conditional production profile.

Keep Web and Docker authority separate. The trusted worker runs as a dedicated nonroot user on a rootless Docker/cgroups-v2 Linux host. Its control service binds loopback and is reached through a restricted encrypted tunnel. Pin image IDs, retain default seccomp and enforce all resource/mount/network controls. Test preflight checks real kernel/container settings and cleanup; actual production preflight also checks Linux/rootless/cgroups-v2 assumptions.

Windows Docker Desktop tests cannot attest that host. The loopback-only test-production profile records the runtime it actually tested. It cannot accept a public application URL. Stronger runtimes such as gVisor/Kata/Firecracker are candidates for a later independently reviewed isolation boundary; none is installed or claimed tested here.

A fixed APP_URL governs host/origin and email links. Direct local mode ignores forwarded headers. Public proxy mode requires a private proxy authentication key and overwritten forwarded host/protocol/client-IP fields, plus an operator firewall preventing direct Web ingress. This provides a concrete trust path even when Next's Request does not expose the raw peer socket.
