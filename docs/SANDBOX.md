# Python execution threat model

Review before browser integration (2026-10-02).

Submitted source, input, output and trace are hostile. An authenticated internal orchestrator is a trusted host process with Docker access. The web process has no Docker socket or executable path control. A fixed image and fixed argument vector launch each separate untrusted container. The code container never receives service secrets, host mounts, a socket or network access.

The supported release is **local development only**, disabled by default. Browser API admission requires PYTHON_EXECUTION_ENABLED=local and a localhost/loopback request host. The orchestrator binds 127.0.0.1 and requires a random server-only bearer key. Do not publish this API or forward its port.

Required defense layers: bounded JSON/source/input, global admission rate, concurrency/queue/queue-wait limits, unpredictable per-job capability, timeout/cancel, read-only root, nonroot UID, no network, no host mounts, dropped capabilities, no-new-privileges, CPU/memory/PID/tmp/output/trace limits and container cleanup. Language policy restricts imports, dangerous builtins and private-attribute introspection. This policy is an additional guard, not the security boundary.

Docker shares a kernel. A public arbitrary-code service would require a dedicated disposable execution host/VM, stronger isolation, independent penetration testing, distributed quotas and queue, durable operation monitoring, image patch policy and explicit production review. This milestone does not authorize that deployment. If Docker cleanup fails, surface an internal error and inspect project runner labels before accepting a release.

Job source and input live in bounded process memory until completion, then are dropped. Results expire. Job IDs alone do not grant access: poll/cancel requires the unique capability. No raw source/input/capability is logged. Server-side workspace saves require verified ownership and store only explicit source/input.
