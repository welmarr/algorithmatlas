# CSES wave 100 checkpoint

**Starting SHA:** `a362c8a` on `feature/cses100-ux-polish`  
**Ending implementation SHA:** `b6508e504a5a98d2925123d427e5126e29c060ec`  
**Unique certified CSES count:** 75 → 100; zero partial or failed entries.

## Families and architecture

The 25 new official tasks comprise seven mathematics, two geometry, four range-query, five tree, and seven graph tasks. Mathematics now covers nested modular powers, prime factorization, divisor multiples, fast-doubling Fibonacci, binomial coefficients, multinomial permutations, and stars and bars. Geometry adds signed orientation and closed-segment intersection. The range wave adds first-fit segment maxima, Fenwick order statistics, maximum-prefix segment merging, and paired distance-transform minima. Trees add LCA, distance, centroid balance, Euler/Fenwick subtree sums, and offline distinct-color counting. Graphs add undirected cycle reconstruction, functional-graph jumps, SCCs, negative-cycle reconstruction, discounted shortest paths, shortest-route counting, and unbounded maximum-score detection.

All 25 use the existing Problem SDK, bounded custom JSON inputs, official title/ID/source URL, original teaching copy, a real deterministic trace, reusable renderer/choreography capabilities, and executable reference code. The server registry and selected-family lazy map contain each new ID exactly once. New family helpers are limited to problem packages; the simulation core and generic renderers did not gain problem-ID branches. The [Wave 100 case study](../book/cses-wave-100-families.md) explains the correctness invariants and independent oracles.

The exact `Graphs` category contains 17 entries; the separate `Shortest Path` and `Depth-First Search` catalog categories bring graph-oriented coverage to 19. The exact `Sorting and Searching` category remains at 10, with Arrays, Two Pointers, Sliding Window, and Binary Search catalog entries providing related coverage. This distribution favors the previously weak mathematics, geometry, range, and tree families over adding superficial sorting tasks to meet a label quota.

## Verification and visual status

- `pnpm problems:status`: 100 registered, 100 certified, zero partial/failed; 128 focused evidence tests passed. The generated [catalog](../CSES-CATALOG.md), [machine status](cses-status.json), and per-task certificates list the exact IDs.
- `pnpm problems:release`: hard `>=100` assertion passed; all 100 routes opened in Playwright and reran their published examples as custom input in 3.3 minutes.
- `pnpm verify`: formatting, lint, types, 315 tests passed (36 service/opt-in tests skipped), and a production build with 130 static pages passed.
- Independent oracles cover direct modular arithmetic and recurrence calculations, exhaustive permutations/distributions, brute divisor enumeration, parametric geometry, direct range scans, parent-chain/BFS tree answers, simple-path enumeration, Floyd–Warshall negative diagonals, SCC mutual reachability, and semantic validation of cycles and centroids.
- The disposable full service gate now provisions Mailpit successfully after disabling reverse DNS lookups in its isolated container. Migrations, runner image, 347 service-backed tests (4 skipped), production build, and production dependency audit passed. The full gate stopped at the development dependency audit: transitive `braces@3.0.3` under the Next ESLint plugin has a high-severity advisory with no published patched version. Browser/full-image stages were therefore not reached in that command.

The existing 39-view anonymous visual harness passed at the 75-task checkpoint; final 100-task representative and authenticated captures remain to be completed. Reference snippets in some workspaces are visually compressed because several sources are a single line, despite being executable and correct. Final accessibility/color/mobile review remains open.

Post-checkpoint update: the 100-task route smoke passed again, a 54-view anonymous matrix passed, and the full authenticated capture passed with 234 screenshots and no missing inventory route or page-level overflow. Long source lines now wrap in the code panel; see `docs/audit/cses100-ux-polish/VISUAL_REVIEW_REPORT.md` for the remaining geometry and code-format limitations.

## Performance, limitations, and cleanup

At 100 tasks the production build reports Home **107 kB**, Library **108 kB**, and problem-route **133 kB** first-load JavaScript. The selected-family registry split kept the problem-route figure at the 75-task level; 100 route pages were statically generated. Search latency and build memory were not separately measured. The server still eagerly constructs the implementation registry, which is a candidate for a generated metadata manifest if future measurement warrants it.

The release count is met, but `main` is unchanged and no release tag is permitted until the full audit, public-runner/prod-ops regressions, final visual package, fresh clone, and remote CI gates pass. The failed isolated run removed only its named disposable database/mail containers. Screenshot and certificate outputs remain ignored project artifacts.
