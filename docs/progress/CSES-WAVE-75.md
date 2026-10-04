# CSES wave 75 checkpoint

**Starting SHA:** `e2809624dc9264b03f38fe8a5749cf9d782f139f`  
**Ending implementation SHA:** `10cc540` on `feature/cses100-ux-polish`  
**Unique certified CSES count:** 50 → 75; zero partial or failed entries.

## Families, architecture, and learning

Nine graph tasks added connected components, bipartite assignment, directed cycle reconstruction, topological ordering and route DP, Kruskal/DSU, Floyd–Warshall, and strong-connectivity checking. Four tree tasks added diameter-endpoint eccentricity, rerooted distance sums, matching DP, and binary-lifting ancestors. Five range tasks added sparse-table minimum, segment-tree minimum, prefix XOR, Fenwick differences, and two-dimensional forest prefixes. Four string tasks added prefix-function borders, Z-function periods and values, and trie-guided word segmentation. Three DP tasks added two-state tower counting, weighted interval scheduling, and bitmask elevator rides. All have official CSES IDs, bounded custom JSON input, original learning material, deterministic traces, Teaching Steps, and rendered workspaces.

The existing Problem SDK and semantic reducer were reused. A reusable `topological-sort` choreography profile was added for three DAG tasks; no problem-ID branches were added to generic renderers. The graph and [Wave 75 family](../book/cses-wave-75-families.md) case studies record algorithm invariants and oracle choices. The client workbench still imports the full registry, so its bundle grew and requires a selected-runner split before the 100/200 catalog expands further.

## Verification and visual findings

- `pnpm problems:status`: 75 registered, 75 certified, zero partial/failed; 97 focused evidence tests passed. The generated [catalog](../CSES-CATALOG.md) and [machine status](cses-status.json) list every certified ID.
- `pnpm problems:verify`: all 75 routes loaded in Playwright and reran each published example as custom input; one browser test passed in 2.5 minutes.
- `pnpm verify`: formatting, lint, types, 259 tests passed (36 service/opt-in tests skipped), and a production build with 105 static pages passed.
- The added independent oracles enumerate small graph colorings, cycles, topological orders, spanning trees, DAG paths, tree matchings, project schedules, rectangle tilings, elevator assignments, word segmentations, and more. Other oracles use alternate BFS, Dijkstra, direct prefix/range scans, and string comparisons. Displayed reference snippets agree with default and example outputs.
- `pnpm audit --prod --audit-level=low` passed. `pnpm audit --audit-level=low` remains blocked by the transitive development-only `braces <=3.0.3` advisory through Next ESLint; no patched release is reported by pnpm.
- A 39-view anonymous screenshot harness passed, including desktop/mobile graph, forest, word-combination, DP, auth, Home, Library, Lab, Compare, and Own Code views. Reviewed graph, binary-lifting, forest, and word-DP screenshots show clear stage and controls with no mobile overlap. The new reference snippets are visually too compressed because several are single-line code; this is a remaining polish item. Authenticated Dashboard capture still requires the full disposable service gate.

The first isolated full-gate attempt at Wave 75 did not reach application tests: Docker Mailpit reported its SMTP listener and HTTP port, while the host SMTP port never supplied a `220` greeting. The readiness check failed and removed only its named disposable database/mail containers. The full, public-runner, and production-ops suites therefore remain unverified at this checkpoint. The earlier Removing Digits oracle's complete 64-case run exceeded Vitest's default five-second timeout under the larger concurrent suite; its timeout was raised to 15 seconds without changing assertions. A Counting Towers example expectation for height 13 was corrected after the exact small-height tiling oracle and recurrence exposed the mistaken number.

## Performance, gaps, and cleanup

Production first-load JS at 75: Home 107 kB, Library 108 kB, problem workbench 219 kB (201 kB at 50). Home and Library client bundles remain light because their server pages pass only curated/metadata content. Problem workbench growth confirms the planned registry implementation split is needed. Search/filter latency and build memory were not separately measured in this wave.

The release is **25 certified tasks short** of the hard 100 gate. Graph, range, tree, mathematics, and geometry category targets remain thin; mathematics and geometry are especially underrepresented. The full service gates, development dependency audit, authenticated visual review, fresh clone, remote CI, and final performance/audit package remain open. No main merge or release tag is permitted yet. Screenshot and certificate outputs remain ignored artifacts; the failed isolated run cleaned its named containers.
