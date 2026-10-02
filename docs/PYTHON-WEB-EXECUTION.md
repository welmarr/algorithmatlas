# Python Own Code from the browser

## Start locally

Install Node 22+, pnpm 11 and Docker Desktop (Linux containers). Run pnpm install --frozen-lockfile and pnpm runner:build. In a PowerShell terminal at the repository root:

```powershell
$env:PYTHON_EXECUTION_ENABLED='local'
$env:PYTHON_ORCHESTRATOR_KEY=node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
$env:PYTHON_ORCHESTRATOR_URL='http://127.0.0.1:3040'
$env:PYTHON_ORCHESTRATOR_PORT='3040'
pnpm execution:serve
```

Start pnpm dev in another terminal with the same environment values. Keep the key server-side; never put it in NEXT_PUBLIC variables. Open /own-code. Curated simulations need none of this configuration. Accounts are optional; see AUTHENTICATION.md and EMAIL.md to enable durable saves.

The server binds 127.0.0.1. The web API additionally accepts execution only on localhost/loopback hosts when PYTHON_EXECUTION_ENABLED=local. A disabled installation shows an explanatory draft editor. This is not a public arbitrary-code service.

## Actual pipeline

OwnCodeWorkspace submits source and JSON to /api/python/jobs. Next checks origin, local mode and body size, then authenticates to the separate internal orchestrator. PythonJobs admits the request to a bounded in-memory queue. Each run creates a fresh container from simulator-python-runner:0.1, starts it, supplies input through stdin, captures JSON, and removes the container before releasing its slot.

The browser consumes raw runtime records through interpretPythonTrace, validates semantic events, creates teaching steps and the snapshot timeline, then renders through ChoreographyStage. PythonPlayer supports teaching/technical navigation, play/pause, previous/next, seek, four speeds, reduced motion, raw trace and executed-source highlighting. Changing source requires a new execution.

The supplied Increasing Array example produces 17 for [8,2,5,1,7] and four real writes. Editing return moves to return moves + 10 produces 27. A second numeric graph example records constrained edge relaxation; a scalar example demonstrates accurate variable/raw fallback.

## Limits and lifecycle

| Boundary                 | Limit                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Source / input / request | 4,096 characters / 16 KiB JSON / 24 KiB                     |
| Active executions        | 2 by default; PYTHON_CONCURRENCY accepts 1–2                |
| Waiting queue            | 8 by default; PYTHON_QUEUE_SIZE accepts 1–16                |
| Waiting time             | 15 seconds                                                  |
| Admission rate           | 30 requests/minute across the local service                 |
| Retained jobs            | at most 100; terminal results expire after 5 minutes        |
| Guest execution          | 5-second wall time, 2-second CPU ulimit, 0.5 CPU quota      |
| Memory                   | 128 MiB container, no swap; Python address-space cap 96 MiB |
| Processes / descriptors  | 32 PIDs / 64 file descriptors                               |
| Filesystem               | read-only root, 8 MiB noexec/nosuid tmpfs, no host mounts   |
| Output / trace           | 8 KiB printed text, 256 KiB protocol response, 800 events   |

Each job returns a UUID and a random 256-bit capability. Poll/cancel needs both; guessing an ID does not grant access. Cancellation is idempotent, supports queued/running jobs, and becomes terminal only after the runner finishes cleanup. Queue/source state is discarded after completion. Restart loses in-memory jobs. Abrupt host/daemon failure may require operator cleanup of named runner containers; graceful shutdown and normal timeout/cancel are covered.

Structured errors include PYTHON_QUEUE_FULL, RATE_LIMITED, TIMEOUT, MEMORY_LIMIT, OUTPUT_LIMIT, TRACE_LIMIT, CANCELLED, POLICY_REJECTED, SYNTAX_ERROR, RUNTIME_ERROR, INTERNAL_ERROR and JOB_NOT_FOUND (all with the PYTHON_ prefix). Fixed public messages avoid exposing daemon diagnostics or host paths. Logs contain job ID/status/code/duration, not source, input, output or capability.

## Interpretation boundaries

The interpreter observes bounded JSON locals at Python line/return callbacks. A line callback occurs before that line executes, so changes map to the preceding executed source line. Large/non-JSON locals are summarized or omitted. Supported array inference uses a bounded integer values list matching input.values. Graph inference uses numeric node indices, edges and dist assignments with matching endpoints/arithmetic. Provenance and confidence are shown.

This is not a general Python debugger or universal algorithm classifier. Unsupported meaning remains lower-level source/variable facts; no AI is needed. Only Python is supported for Own Code. The separate curated Increasing Array JavaScript subset remains available.

## Persistence and verification

Verified accounts can explicitly save a named source/input workspace, restore it from their dashboard or Own Code, rerun, and delete it. Migration 004 adds owner-scoped Python workspaces, capped at 100 per account. Stored source is data, never executed by a save request. Anonymous drafts stay in sessionStorage in the current tab.

Run pnpm verify:isolated for fresh temporary PostgreSQL/Mailpit, migrations, Docker probes, production browser journeys and builds. The test script removes only its own disposable containers. See SANDBOX.md for the threat model and public release gates.
