# Performance measurement

The opt-in Node benchmark in `tests/performance-bench.test.ts` builds 500 array entities and measures raw generation, semantic mapping, materialization, snapshot construction, 100 deterministic seeks and process heap change. On 2026-10-02, Windows Node 25.8.0 / Vitest 4:

|  Events | Generate |      Map | Materialize |    Snapshots |   100 seeks | Heap delta |
| ------: | -------: | -------: | ----------: | -----------: | ----------: | ---------: |
|   1,000 |  0.16 ms |  1.47 ms |     3.42 ms |    121.23 ms | 7,451.07 ms |  37.95 MiB |
|  10,000 |  1.90 ms | 12.89 ms |     6.69 ms |  1,431.71 ms | 7,099.21 ms |  -9.75 MiB |
| 100,000 | 10.75 ms | 57.52 ms |    63.79 ms | 12,913.85 ms | 6,299.49 ms |  96.32 MiB |

All three opt-in benchmarks passed in 36.22 seconds. Docker build activity shared the host during this sample; these figures are observations, not service-level objectives. Heap delta includes garbage collection and is not peak retained memory. Snapshot construction repeatedly clones state and dominates at 100k events. Seek order is deterministic but not identical work at each size. Run `PERF_BENCH=1 pnpm exec vitest run tests/performance-bench.test.ts` after relevant core changes.

The production Chromium benchmark uses the maximum accepted Increasing Array input: 64 values, 383 events and 64 entities. The primary final gate measured 144 ms for execution plus first render and 43 ms for seeking to the end plus render. Chromium reported heapUsed=10,000,000 bytes, a coarse reported value, not a measured memory peak. It also rendered 383 technical rows.

These are bounded product/browser results. They do not establish that the browser can render 10k/100k events. Virtualized event rows and a worker strategy are likely needed before lifting input limits. The complete local full gate enables `PERF_BROWSER=1`; optional Node benchmarks are run separately.
