# Dependency map

```text
apps/web ────────┬── packages/problems ── packages/problem-sdk ─┐
                 ├── packages/simulation-core ───────────────────┤
                 ├── packages/ai-sdk ─────────────────────────────┤
                 ├── packages/renderer-sdk ───────────────────────┤
                 ├── packages/persistence ── PostgreSQL (optional)  │
                 └── packages/domain + semantic-events <─────────┘

semantic-events → domain
simulation-core → semantic-events + domain
problem-sdk → simulation-core + semantic-events + domain
renderer-sdk → semantic-events + domain
code-runtime → Acorn + semantic-events + domain
problems → code-runtime + problem-sdk + semantic-events + domain
ai-sdk → semantic-events
isolated-runner → Docker image + local CLI (no web import)
semantic-interpreter → raw trace + semantic events + teaching steps
persistence → PostgreSQL, no React/AI dependency
```

Only the web app depends on React/Next.js. There is no AI or React dependency in the simulation core. The code runtime interprets a bounded JavaScript subset in the browser. PostgreSQL is optional for accounts and learning progress; the local Python runner has no HTTP entry point. There is no cache, message broker, or public server-side code execution path.
