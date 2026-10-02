# Architecture map

The immutable prototype baseline is `0107c9138cdfb28d5b97345866fae38e780c462e`. The current construction branch is a pnpm modular monolith. Read [the reconstruction book](../book/README.md) for the build order, [ARCHITECTURE.md](../../ARCHITECTURE.md) for dependency direction, and [the ADR index](../adr) for decisions and alternatives.

```text
apps/web (Next.js + React)
  ├─ packages/problems ── packages/problem-sdk
  ├─ packages/renderer-sdk
  ├─ packages/ai-sdk (optional advisory responses)
  └─ packages/persistence (optional PostgreSQL)
          ↓
packages/code-runtime (bounded browser subset)
packages/semantic-interpreter (local Python inference)
          ↓
packages/semantic-events → packages/simulation-core → packages/domain

packages/isolated-runner → Docker Python image (developer CLI only)
```

The canonical replay path is `validated input → problem trace → validated semantic events → immutable reduction/snapshots → teaching projection → renderer`. `RawTraceEvent` sits before semantic mapping when an algorithm or runtime produces observed operations. Teaching cues guide presentation but do not alter canonical state. Optional AI responses are independently parsed and cannot become reducer input. PostgreSQL stores account/progress records but never supplies a curated algorithm answer; the server recomputes curated runs.

Extension boundaries: a problem may depend on domain/events/core but never UI; a renderer consumes canonical state and declared focus but never a problem ID; an AI adapter sees negotiated capabilities but cannot execute code; the Docker runner cannot reach the web process or host network through its fixed invocation. The local Docker CLI's host daemon remains a trusted dependency. A public execution path requires a separate reviewed service boundary and operations controls.

The main versioned contracts are in [SIMULATION-PROTOCOL.md](../../SIMULATION-PROTOCOL.md), [RAW-TRACE-PROTOCOL.md](../../RAW-TRACE-PROTOCOL.md), [TEACHING-STEPS.md](../../TEACHING-STEPS.md), [AI-PROTOCOL.md](../../AI-PROTOCOL.md), [PROBLEM-SDK.md](../../PROBLEM-SDK.md), and [RENDERER-SDK.md](../../RENDERER-SDK.md). Run `pnpm verify:full` with disposable PostgreSQL and Docker to reproduce the local gate.
