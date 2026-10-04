# Open release gates

The feature branch has **100/100 certified official CSES problems**, but it is not releasable yet.

1. The mandatory all-dependency audit fails on a high-severity `braces <=3.0.3` stack-exhaustion advisory in `@next/eslint-plugin-next > fast-glob > micromatch > braces`. The advisory lists **no patched version**. The production-only audit passes. Keep the full audit threshold unchanged and resolve this dependency before release, or obtain an explicit decision on the material development-tool security tradeoff.
2. After the dependency is resolved, rerun the strict full gate, fresh clone and GitHub CI on the release candidate. The current `442f9634` candidate passed certification, fast, routes and the pre-audit service checks, but both its [CI run](https://github.com/welmarr/algorithmatlas/actions/runs/37195396541) and fresh-clone full gate fail at the advisory.
3. Merge to `main` by non-force merge and create/push an annotated release tag only after every mandatory gate passes. `main` remains at pre-milestone SHA `ec610a1443a58473936c6bdab00ef184a9a404e5`; no release tag exists for this milestone.

The browser regression and web-image build were verified separately from the strict full gate. That does not turn the full gate green.
