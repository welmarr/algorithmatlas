# Accounts and learning progress

PostgreSQL is optional for browsing and simulating. The account pages require `DATABASE_URL` and migration `001_initial.sql`. No database or Docker daemon is needed by the curated browser simulator.

## Local setup

1. Set a unique `SIM_DB_PASSWORD` in your local environment or an untracked root `.env` file. Start the optional stack with `docker compose -p simulator -f compose.yaml -f compose.db.yaml up -d --build`.
2. Apply migrations with `docker compose -p simulator -f compose.yaml -f compose.db.yaml exec web pnpm db:migrate`.
3. Open `/account` to register. The authenticated dashboard at `/dashboard` lists verified curated runs and saved inputs. The problem page lets you explicitly save an input, a reference run, or the edited JavaScript source. Saved input links restore the input in the editor.

For a separately running web app, set `DATABASE_URL` to a PostgreSQL connection string before starting the server and run `pnpm db:migrate`. The migration command serializes concurrent runs and checks a SHA-256 checksum to detect changes to an already applied migration. Keep migration files immutable; add a new numbered file for schema changes.

## Data and authorization

Accounts use a 12–128 character password hashed with a unique scrypt salt. Sessions use a random cookie token; only its SHA-256 hash is stored. The cookie is HttpOnly, SameSite Lax, and Secure in production. Mutations require a matching Origin and bound the request body. Every input lookup and dashboard query is scoped to the authenticated user. A saved curated run is recomputed from the supplied input on the server; client-supplied output is ignored. A source submission is saved as source, not marked as a verified run.

The schema includes users, sessions, problem progress, simulation runs, saved inputs, source submissions, learning progress, and provider metadata. Provider metadata deliberately has no key or secret column. Existing browser AI keys are not sent to account storage.

## Verification and cleanup

`DB_TEST_URL=... pnpm exec vitest run tests/persistence-db.test.ts` checks two-user isolation. The opt-in browser test uses `E2E_DATABASE_URL` and `E2E_PORT` and checks registration, saving, restoring, logout, and login. Tests used a temporary PostgreSQL container with a tmpfs database directory; it creates no persistent Docker volume and should be removed after verification. The Compose `pgdata` volume, if used, contains account data and must be retained while that data is wanted. Do not run a global volume prune to clean temporary tests.

Production deployment still needs an external identity/session review, login rate limits, database backups and recovery checks, connection TLS where appropriate, monitoring, and a trusted reverse-proxy configuration. These are Lot 12 gates; this local account feature is not a claim of production readiness.
