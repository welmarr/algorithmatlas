# UX polish checkpoint

**Starting SHA:** `ec610a1443a58473936c6bdab00ef184a9a404e5`  
**Implementation checkpoint SHA:** `331fad1` (`feature/cses100-ux-polish`)  
**Certified CSES count:** 20 before; 30 after the accompanying introductory wave.

## Delivered

- Split sign-in, registration, password recovery/reset, and email verification into focused routes. `/account` now serves the signed-in state; legacy auth paths remain as aliases. Verification distinguishes pending, expired, already used, and success states, with resend secondary.
- Added brand, category, and semantic color tokens. Product colors guide navigation; algorithm state colors retain their own meaning and text/border cues.
- Added a live, server-computed Increasing Array demo with three compact client frames; Home features selected problems and learning paths instead of the full catalog.
- Added a searchable, filterable, sortable, dense Problems Library with title, official ID, category, algorithm, and tags. Anonymous explored state stays local; verified users can see persisted activity. There is no invented difficulty rating.
- Strengthened the workbench visual hierarchy, plain-language phase labels, related-problem links, and mobile playback controls. Curated code is labeled **Reference algorithm**. Dashboard now shows continue-learning guidance and category progress without claiming mastery from a view.

## Verification and visual review

- `pnpm verify`: passed; 157 tests passed, 36 skipped by opt-in/environment gates; production build generated 60 static pages including 30 problem paths.
- Focused Playwright UX and choreography: seven passed. All 30 routes also passed example custom-input reruns in `pnpm problems:verify`.
- Twenty anonymous desktop/mobile screenshots were captured under `artifacts/visual-audit/cses100-ux-polish`. Reviewed Home, Library, login, and mobile array workbench. The palette is coherent and less monochrome, category colors are subdued, and labels carry meaning without color. Mobile pages remain long below the primary visualization; code/input panels could be compacted further. Dashboard and authenticated screens were not visually captured because the disposable email gate is blocked locally.
- Build first-load JS: Home 107 kB, Library 108 kB, problem workbench 192 kB. Home demo ships compact frames rather than the registry to the client. Search latency at 100+ entries is not yet measured.

## Limits and cleanup

This is an intermediate checkpoint. The 100-problem release gate, full isolated email gate, development dependency audit, final visual audit, fresh clone, and final CI must pass before merge. Temporary verification containers are project-scoped and cleaned by the isolated script; screenshot captures remain in ignored `artifacts/` for review.
