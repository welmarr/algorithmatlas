# Local Python runner

Build the image with `pnpm runner:build`, then run the sample with `pnpm runner:local examples/python-runner/request.json`. A request is JSON with `source` defining `solve(data)` and an `input` JSON value. The result contains `status`, JSON `output`, bounded `stdout`, and source-referenced `rawTrace` events. This is a developer CLI; there is no web route or public API.

Run the Docker integration checks with `$env:RUNNER_DOCKER_TEST='1'; pnpm exec vitest run tests/isolated-runner-docker.test.ts`. They exercise normal execution, denied imports, trace exhaustion, huge output, filesystem and subprocess attempts, malformed source, and forced cleanup after code catches a trace exception.

Limits are fixed in `packages/isolated-runner/src/index.mjs` and `runner/python/trace.py`. Host limits: two concurrent runs, 5-second wall time, 24 KiB request, 256 KiB response. Guest limits: 4,096 source characters, 16 KiB input, 800 trace events, 8 KiB program output. The Docker invocation has no mounts, published ports, or persistent volumes. Consult [ADR-013](adr/ADR-013-local-python-container-runner.md) for the threat model and public-deployment gates.
