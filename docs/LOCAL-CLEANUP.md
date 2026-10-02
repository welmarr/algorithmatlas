# Scoped local cleanup

Keep source, migrations, useful documentation and active user data. Never run a global docker system/image/volume prune on a shared Docker Desktop host.

pnpm verify:isolated creates uniquely named atlas-verify-* PostgreSQL/Mailpit containers and removes exactly those names in finally. Test databases use tmpfs; no persistent test volume is created. Python jobs use generated simulator-python-runner-UUID names and are removed before completion/cancel/timeout resolves.

After all relevant processes finish, remove ignored test-results, playwright-report and stale build output only after resolving their absolute paths under the intended checkout. Do not remove .next while its development/production server is using it. node_modules and useful dependency caches are retained for ongoing development.

Inspect docker ps -a, image references and volume labels before cleanup. Remove obsolete simulator-web:verified or previous project image IDs only when no container or later test needs them. Do not remove shared base images or unattributed build cache. Compose pgdata contains account data and is retained while in use. Test mail capture is disposable; a configured active local mailbox may still be needed.

Fresh verification clones are outside the working checkout and have a dedicated explicit path. Verify that exact resolved path before recursive deletion. Historic audits under docs/audit and docs/audit/final are source evidence, not temporary artifacts.
