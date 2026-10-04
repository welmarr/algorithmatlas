# Open gates — interim checkpoint

This directory is an in-progress audit, not a release audit. Current certified unique CSES count is **50/100** on `feature/cses100-ux-polish` at implementation SHA `f283230`; see `docs/progress/CSES-WAVE-50.md` for the checkpoint. `main` remains at pre-milestone SHA `ec610a1`.

1. Add and independently certify 50 more unique official CSES tasks across the required families; run `pnpm problems:release` successfully.
2. Complete `pnpm verify:full` and the public-runner/prod-ops gates in a working isolated PostgreSQL/Mailpit environment. Local Docker Desktop's published Mailpit SMTP port currently accepts TCP without returning a `220` greeting.
3. Resolve the full dependency audit's high-severity `braces` advisory in the transitive development lint dependency. Production audit passed at baseline. Do not weaken the audit threshold.
4. Complete the 100+ visual, accessibility, mobile, reduced-motion, and performance reviews; capture authenticated/dashboard views and every new major visual family.
5. Push a final candidate, inspect GitHub CI, reproduce from a fresh clone, and complete the final audit/book reports. Then and only then consider a non-force merge and annotated release tag.

The CI problem-certification job deliberately runs `pnpm problems:release`, so branch CI will fail its count gate until the catalog reaches 100. An automatic approval review rejected changing that job to a softer push-time check; the strict gate remains intact.
