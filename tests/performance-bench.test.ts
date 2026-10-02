import { performance } from "node:perf_hooks";
import { describe, it } from "vitest";
import { emptyState, type RawTraceEvent } from "@sim/domain";
import {
  createEvents,
  mapRawTrace,
  type EventDraft,
} from "@sim/semantic-events";
import { SimulationTimeline } from "@sim/simulation-core";

const benchIt = process.env.PERF_BENCH === "1" ? it : it.skip;

describe("opt-in Node simulation benchmark", () => {
  for (const count of [1000, 10000, 100000]) {
    benchIt(
      `measures ${count} events with 500 array entities`,
      () => {
        const memoryStart = process.memoryUsage().heapUsed;
        const state = emptyState();
        for (let index = 0; index < 500; index++) {
          const id = `array:${index}`;
          state.entities[id] = {
            id,
            kind: "array",
            label: String(index),
            value: 0,
            status: "idle",
          };
        }
        let mark = performance.now();
        const raw: RawTraceEvent[] = Array.from(
          { length: count },
          (_, index) => ({
            schemaVersion: "0.1",
            operation: "write-index",
            data: { index: index % 500, value: index + 1 },
          }),
        );
        const generationMs = performance.now() - mark;
        mark = performance.now();
        const drafts = mapRawTrace(
          raw,
          {
            id: "benchmark-write-v0.1",
            map(event): EventDraft {
              const index = Number(event.data.index);
              return {
                type: "WRITE_INDEX",
                entities: [`array:${index}`],
                payload: { value: Number(event.data.value) },
                explanation: `Write ${event.data.value} at ${index}.`,
              };
            },
          },
          undefined,
        );
        const mappingMs = performance.now() - mark;
        mark = performance.now();
        const events = createEvents(drafts, `bench-${count}`);
        const materializationMs = performance.now() - mark;
        mark = performance.now();
        const timeline = new SimulationTimeline(state, events, {
          snapshotInterval: 1000,
        });
        const snapshotsMs = performance.now() - mark;
        mark = performance.now();
        for (let index = 0; index < 100; index++)
          timeline.seek(Math.floor((index * 7919) % (count + 1)));
        const seek100Ms = performance.now() - mark;
        const memoryDeltaMiB =
          (process.memoryUsage().heapUsed - memoryStart) / 1024 / 1024;
        process.stdout.write(
          `NODE_PERF ${JSON.stringify({ eventCount: count, entityCount: 500, generationMs: +generationMs.toFixed(2), mappingMs: +mappingMs.toFixed(2), materializationMs: +materializationMs.toFixed(2), snapshotsMs: +snapshotsMs.toFixed(2), seek100Ms: +seek100Ms.toFixed(2), memoryDeltaMiB: +memoryDeltaMiB.toFixed(2), snapshots: timeline.snapshots.length })}\n`,
        );
        timeline.dispose();
      },
      120000,
    );
  }
});
