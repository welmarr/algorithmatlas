# Deployment

The current app is a stateless Next.js service. Build with `pnpm install --frozen-lockfile && pnpm build`, then start with `pnpm --filter @sim/web start`. Terminate TLS at a reverse proxy. No database migrations or seed command exist in this milestone because problem seed data is bundled in `packages/problems`. Future user accounts, submissions, and trace persistence will require PostgreSQL migrations and S3-compatible storage; deployment instructions will expand with those services.

Use the included Dockerfile and `docker compose up --build` to serve the web app locally. The container exposes port 3000. Do not treat this container as a sandbox for hostile user code.

`GET /api/health` returns the web process readiness response. The container health check calls that route.
