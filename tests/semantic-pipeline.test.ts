import { describe, expect, it } from "vitest";
import type { RawTraceEvent } from "@sim/domain";
import { getProblem } from "@sim/problems";
import {
  createEvents,
  EVENT_GOVERNANCE,
  EVENT_TYPES,
  mapRawTrace,
  validateRawTraceEvent,
  type EventDraft,
  type SemanticMapper,
} from "@sim/semantic-events";

const event = (
  type: (typeof EVENT_TYPES)[number],
  entities: string[],
  payload: Record<string, string | number | boolean | null>,
) =>
  createEvents([{ type, entities, payload, explanation: "test" }], "schema")[0];

describe("governed event protocol", () => {
  it("classifies every vocabulary entry and rejects reserved trace events", () => {
    expect(Object.keys(EVENT_GOVERNANCE)).toHaveLength(EVENT_TYPES.length);
    expect(EVENT_GOVERNANCE.WRITE_INDEX).toBe("ACTIVE");
    expect(EVENT_GOVERNANCE.RELAX_EDGE).toBe("EXPERIMENTAL");
    expect(EVENT_GOVERNANCE.HEAP_INSERT).toBe("EXPERIMENTAL");
    expect(EVENT_GOVERNANCE.VISIT_EDGE).toBe("RESERVED");
    expect(() => event("VISIT_EDGE", ["graph:edge:1"], {})).toThrow("reserved");
  });

  it("validates required payloads, entity kinds, and semantic ranges", () => {
    expect(event("WRITE_INDEX", ["array:1"], { value: 8 }).payload.value).toBe(
      8,
    );
    expect(() => event("WRITE_INDEX", ["array:1"], { value: 1.5 })).toThrow(
      "valid value",
    );
    expect(() => event("WRITE_INDEX", ["grid:1:1"], { value: 1 })).toThrow(
      "entity kind",
    );
    expect(() =>
      event("SET_CELL_STATE", ["grid:1:1"], { status: "unexpected" }),
    ).toThrow("valid status");
    expect(
      event("SET_CELL_STATE", ["grid:1:1"], { status: "path" }).payload.status,
    ).toBe("path");
    expect(() => event("RELAX_EDGE", ["graph:edge:1"], { value: -1 })).toThrow(
      "valid value",
    );
    expect(
      event("RELAX_EDGE", ["graph:edge:1"], { value: 2 }).payload.value,
    ).toBe(2);
    expect(() =>
      event("SET_DISTANCE", ["graph:node:A"], { value: -1 }),
    ).toThrow("valid value");
    expect(() => event("DP_UPDATE", ["dp:2"], {})).toThrow("valid value");
    expect(() => event("QUEUE_PUSH", [], {})).toThrow("entity count");
    expect(() =>
      event("QUEUE_PUSH", ["graph:node:A"], { color: "red" }),
    ).toThrow("invalid color");
  });
});

describe("versioned raw-to-semantic pipeline", () => {
  it("maps array, grid BFS, and graph BFS deterministically", () => {
    const cases = [
      {
        id: "increasing-array",
        input: { values: [8, 2, 5, 1, 7] },
        expected: "WRITE_INDEX",
      },
      {
        id: "labyrinth",
        input: { rows: ["A..", ".#.", "..B"] },
        expected: "SET_CELL_DISTANCE",
      },
      {
        id: "message-route",
        input: {
          nodes: ["A", "B", "C"],
          edges: [
            ["A", "B"],
            ["B", "C"],
          ],
          source: "A",
          target: "C",
        },
        expected: "SET_PARENT",
      },
    ];
    for (const { id, input, expected } of cases) {
      const problem = getProblem(id)!;
      const first = problem.run(input);
      const second = problem.run(input);
      expect(first.rawTrace.length).toBeGreaterThan(0);
      expect(first.rawTrace.every((item) => item.schemaVersion === "0.1")).toBe(
        true,
      );
      expect(first.events.length).toBe(first.rawTrace.length);
      expect(first.events.some((item) => item.type === expected)).toBe(true);
      expect(first.rawTrace).toEqual(second.rawTrace);
      expect(first.events).toEqual(second.events);
    }
  });

  it("rejects malformed raw records and supports one-to-many mapping", () => {
    const raw: RawTraceEvent = {
      schemaVersion: "0.1",
      operation: "inspect",
      data: { index: 0 },
    };
    expect(() => validateRawTraceEvent({ ...raw, schemaVersion: "9" })).toThrow(
      "Invalid raw trace",
    );
    expect(() =>
      validateRawTraceEvent({ ...raw, data: { value: Infinity } }),
    ).toThrow("Invalid raw trace");
    const mapper: SemanticMapper<undefined> = {
      id: "test-v0.1",
      map: (): EventDraft[] => [
        {
          type: "READ_INDEX" as const,
          entities: ["array:0"],
          payload: { value: 2 },
          explanation: "Read",
        },
        {
          type: "ANNOTATE" as const,
          entities: [],
          payload: {},
          explanation: "Explain",
        },
      ],
    };
    const drafts = mapRawTrace([raw], mapper, undefined);
    expect(drafts.map((item) => item.type)).toEqual(["READ_INDEX", "ANNOTATE"]);
    expect(createEvents(drafts, "mapped").map((item) => item.eventId)).toEqual([
      "mapped:1",
      "mapped:2",
    ]);
  });
});
