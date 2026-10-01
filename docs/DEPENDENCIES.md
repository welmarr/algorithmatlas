# Dependency map

```text
apps/web ────────┬── packages/problems ── packages/problem-sdk ─┐
                 ├── packages/simulation-core ───────────────────┤
                 ├── packages/ai-sdk ─────────────────────────────┤
                 └── packages/domain + semantic-events <─────────┘

semantic-events → domain
simulation-core → semantic-events + domain
problem-sdk → simulation-core + semantic-events + domain
code-runtime → Acorn + semantic-events + domain
problems → code-runtime + problem-sdk + semantic-events + domain
ai-sdk → semantic-events
```

Only the web app depends on React/Next.js. There is no AI or React dependency in the simulation core. The code runtime interprets a bounded JavaScript subset in the browser. No cache, database, storage, message broker, or server-side code runner has been introduced yet.
