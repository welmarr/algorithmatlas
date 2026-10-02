# Deployment

Build with `pnpm install --frozen-lockfile` and `pnpm build`, then start with `pnpm --filter @sim/web start`. Curated learning works without a database, account, email service or AI provider. For optional accounts, configure PostgreSQL and SMTP, set the exact `APP_URL`, and run `pnpm db:migrate`. Only verified accounts can persist private work.

The Dockerfile and `docker compose up --build` provide the database-free web application on loopback port 3000. `compose.db.yaml` adds persistent PostgreSQL; `compose.auth.yaml` adds local Mailpit. The named database volume is user data. Check port availability first; override the database host port when 5432 belongs to another project. See [EMAIL](docs/EMAIL.md) and [AUTHENTICATION](docs/AUTHENTICATION.md).

For local browser Python, build `pnpm runner:build` and start the trusted host process with `pnpm dev:python`. It binds Next and the execution orchestrator to loopback, loads the ignored root `.env`, and gives both processes a shared server-only key. Next has no Docker socket; only the separate host orchestrator controls job containers. The browser submits/polls/cancels bounded jobs and can replay their traces anonymously. Python is off by default in ordinary web starts and must not be enabled for public ingress. See [PYTHON-WEB-EXECUTION](docs/PYTHON-WEB-EXECUTION.md) and [SANDBOX](docs/SANDBOX.md).

`GET /api/health` is liveness. `GET /api/ready` checks migration readiness when PostgreSQL is configured; the container health check uses it. `pnpm verify:isolated` provisions fresh disposable PostgreSQL/Mailpit and runs `verify:full`, including production browser journeys and Docker builds. `DOCKER_NO_CACHE=1` rebuilds the web image without prior layers. Use `docker build --no-cache -t simulator-python-runner:0.1 runner/python` for a clean runner image.

Before production accounts, verify TLS/proxy behavior, real SMTP, durable email delivery, backups/restores, retention and monitoring. Schedule `pnpm db:prune` for expired sessions/tokens/quota buckets. The complete local milestone does not establish a production-safe hostile-code service. The current audit is [docs/audit/vnext-visual-auth-python](docs/audit/vnext-visual-auth-python/README.md).

## Development environment left available

The development preview uses `pnpm dev:python` at http://localhost:3000. The local PostgreSQL container uses host port 54328 and the intentionally retained `simulator-vnext-pgdata` volume; credentials live only in the ignored root `.env`. The local Mailpit inbox is http://localhost:18025 (SMTP 11025). These are active development resources. Temporary verification databases use tmpfs and are removed separately. Start the two labeled local service containers if Docker Desktop was restarted, then run `pnpm dev:python`.
