# ADR-013: Local Python execution in a bounded container

Status: Accepted for the local developer workflow on 2026-10-01. Supersedes the immediate Rust orchestration decision in ADR-006; it does not authorize a public execution API.

## Decision

Start with one vertical Python path: Python AST syntax validation, a fixed Docker image, a host launcher with a fixed argument array, a JSON request/response protocol, and source-line raw traces. The launcher is callable from a trusted local CLI only. The web server has no path to Docker and the Docker socket is never mounted in the guest.

Container controls: no network, read-only root, non-root UID, all Linux capabilities dropped, `no-new-privileges`, default Docker seccomp, 128 MiB memory and swap, half a CPU, 32 PIDs, limited file descriptors, an 8 MiB temporary filesystem, no host mounts or published ports, and automatic removal. The host bounds request size, response size, concurrency, and wall time; on a forced stop it removes the generated container name.

The Python built-in and import allowlists improve usability and reduce accidental misuse, but are **not** a security boundary. The container and Docker host are the boundary under evaluation. Docker warns that daemon access is powerful and must be limited to trusted users; it also documents the container resource and network controls used here. See [Docker Engine security](https://docs.docker.com/engine/security/), [resource constraints](https://docs.docker.com/engine/containers/resource_constraints), and [none network](https://docs.docker.com/engine/network/drivers/none/).

## Alternatives and future work

- **Direct host subprocess:** rejected for untrusted submissions because it lacks this isolation layer.
- **Rust orchestrator:** useful if the platform later needs a smaller service boundary; changing the host language alone would not isolate guest Python.
- **Wasmtime/WASI:** promising for a C++/WASI path because host capabilities can be scoped and runtime limits can be applied. Current Python and future Java support need separate packaging/runtime research. See [Wasmtime security](https://docs.wasmtime.dev/security.html) and [WASI context configuration](https://docs.wasmtime.dev/api/wasmtime_wasi/struct.WasiCtxBuilder.html).
- **Tree-sitter:** Python's built-in AST already provides the source-line references needed for this first path. Revisit Tree-sitter for cross-language source mapping when C++ or Java is implemented. This narrows ADR-007's timing without dropping its cross-language intent.

## Before public deployment

The runner needs an isolated worker service without direct web-server Docker authority, authenticated quotas and rate limits per user/IP, a queue with capacity limits, cancellation and retention policies, abuse monitoring, image pinning and dependency review, escape/threat testing, and independent security review. The local CLI is intentionally not a public endpoint.
