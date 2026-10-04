# Open gates — interim checkpoint

This directory is an in-progress audit, not a release audit. Current certified unique CSES count is **100/100** on `feature/cses100-ux-polish` at implementation SHA `b6508e5`; see `docs/progress/CSES-WAVE-100.md` for the checkpoint. `main` remains at pre-milestone SHA `ec610a1`.

1. Resolve the full dependency audit's high-severity `braces` advisory in the transitive development Next ESLint dependency. The advisory lists no patched version. The production audit passes; keep the all-dependency audit threshold unchanged. `pnpm verify:isolated` now reaches this exact gate after migrations, 347 service-backed tests, and production build.
2. Complete public-runner and prod-ops regression gates, then rerun the full gate through browser and web-image stages. Disposable Mailpit now supplies its `220` greeting after its reverse DNS lookup was disabled.
3. Complete 100-task visual, accessibility, mobile, reduced-motion, and performance reviews; capture authenticated/dashboard views and every major new visual family.
4. Push a final candidate, inspect GitHub CI, reproduce from a fresh clone, and complete the final audit reports. Then and only then consider a non-force merge and annotated release tag.

The CI problem-certification job deliberately runs `pnpm problems:release`; its hard count gate now passes at 100. An earlier automatic approval review rejected changing that job to a softer push-time check; the strict gate remains intact.
