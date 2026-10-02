# Performance measurement

The opt-in Node benchmark in `tests/performance-bench.test.ts` builds 500 array entities and measures raw event generation, semantic mapping, event materialization, snapshot construction, 100 seeks, and process heap change. On the 2026-10-01 Windows development machine with Node 25.8.0 and Vitest 4, one sample run produced:

|  Events | Generate |      Map | Materialize |   Snapshots |   100 seeks | Heap delta |
| ------: | -------: | -------: | ----------: | ----------: | ----------: | ---------: |
|   1,000 |  0.33 ms |  1.86 ms |     3.54 ms |   134.71 ms | 5,656.44 ms |  20.19 MiB |
|  10,000 |  1.10 ms | 10.40 ms |     5.48 ms | 1,259.55 ms | 5,141.92 ms |  51.91 MiB |
| 100,000 |  6.63 ms | 54.58 ms |    54.02 ms | 9,331.24 ms | 4,326.87 ms |  18.66 MiB |

The heap delta is affected by garbage collection and is not peak retained memory. Seek order is deterministic but not identical work at each size. Snapshot construction repeatedly clones state and is the main measured bottleneck at 100k events. These are synthetic Node results, not browser capacity claims or production service-level objectives. Re-run with `PERF_BENCH=1 pnpm exec vitest run tests/performance-bench.test.ts` after core changes.

The separate Chromium benchmark in `tests/e2e/performance.spec.ts` uses the largest accepted Increasing Array input (64 values). One development-mode run measured 383 events, 64 displayed entities, 157 ms for input execution plus first render, 163 ms for a seek to the end plus render, and about 68 MB of browser JS heap at the inspected point. It also rendered 383 event rows. This browser workload is bounded by product input validation; it does **not** establish that a browser can render 10k or 100k events. Re-run with `PERF_BROWSER=1 pnpm exec playwright test tests/e2e/performance.spec.ts` and a free test port. Virtualized event rows and a browser worker are likely needed before lifting current bounds.
