# Feature matrix

| Requirement               | Implementation and evidence                                                                                                                                                | Status                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Focused authentication    | Dedicated login, registration, recovery, reset and verification routes; account routes retain return paths. `tests/e2e/ux-polish.spec.ts` and service-backed auth flows.   | Passed                      |
| Home live demo            | Three real Increasing Array states from deterministic simulation, anonymous controls and reduced-motion support. Home E2E passed.                                          | Passed                      |
| Color system              | Brand, category and semantic tokens in `apps/web/src/app/globals.css`; labels, borders and text accompany state color.                                                     | Visually reviewed           |
| Problems Library          | Dense 100-entry listing with title, CSES ID, category, algorithm-name search, concepts, progress filter and sort. Mobile filters and E2E search passed.                    | Passed                      |
| Dashboard                 | Verified saved runs, inputs, Python workspaces, continue-learning and category progress. The label is “explored,” not mastery. Authenticated capture passed.               | Passed                      |
| Workbench                 | Primary visualization, reasoning phases, timeline, contextual code/input and optional advanced panels. Curated code is labelled Reference algorithm.                       | Passed                      |
| Mobile and reduced motion | Responsive controls and no page-level overflow in the capture matrix; representative problem screenshots at 390 px.                                                        | Passed                      |
| Problem factory           | Evidence-backed certificates, bounded input, deterministic replay, Teaching Steps, renderer/choreography assignment, generated catalog and hard 100-count release command. | Passed                      |
| All-route behavior        | All 100 certified routes open and accept custom example input in Playwright.                                                                                               | Passed                      |
| Release                   | Non-force main merge and annotated release tag require every mandatory gate.                                                                                               | Blocked by dependency audit |

The exact source and test locations are in the progress reports and [certification report](PROBLEM_CERTIFICATION_REPORT.md).
