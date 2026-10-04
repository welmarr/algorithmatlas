# Open release gates

The feature branch has **100/100 certified official CSES problems**, but it is not releasable yet.

1. The mandatory all-dependency audit fails on a high-severity `braces <=3.0.3` stack-exhaustion advisory in `@next/eslint-plugin-next > fast-glob > micromatch > braces`. The advisory lists **no patched version**. The production-only audit passes. Keep the full audit threshold unchanged and resolve this dependency before release, or obtain an explicit decision on the material development-tool security tradeoff.
2. Push a frozen candidate, run GitHub CI and reproduce the gates in a fresh clone with frozen dependencies and disposable services. Record the exact results in the audit.
3. Merge to `main` by non-force merge and create/push an annotated release tag only after every mandatory gate passes. `main` remains at pre-milestone SHA `ec610a1443a58473936c6bdab00ef184a9a404e5`; no release tag exists for this milestone.

The browser regression and web-image build were verified separately from the strict full gate. That does not turn the full gate green.
