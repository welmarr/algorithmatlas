import { describe, expect, it } from "vitest";
import type { RawTraceEvent } from "@sim/domain";
import { interpretPythonTrace } from "@sim/semantic-interpreter";

function raw(
  line: number,
  changes: Record<string, unknown> = {},
): RawTraceEvent {
  return {
    schemaVersion: "0.1",
    operation: "line",
    data: {
      line,
      changes: JSON.stringify(
        Object.fromEntries(
          Object.entries(changes).map(([key, value]) => [
            key,
            JSON.stringify(value),
          ]),
        ),
      ),
    },
    sourceRef: { file: "submission.py", line },
  };
}

describe("Python semantic interpreter", () => {
  it("replays four input-dependent array writes and keeps every raw event", () => {
    const input = { values: [8, 2, 5, 1, 7] };
    const result = interpretPythonTrace({
      source:
        "def solve(data):\n    values = data['values']\n    values[1] = 8\n    return values",
      input,
      output: [8, 8, 8, 8, 8],
      rawTrace: [
        raw(2, { data: input }),
        raw(3, { values: input.values }),
        raw(4, { values: [8, 8, 8, 8, 8], data: { values: [8, 8, 8, 8, 8] } }),
      ],
    });
    expect(result.rawTrace).toHaveLength(3);
    expect(
      result.events.filter((event) => event.type === "WRITE_INDEX"),
    ).toHaveLength(4);
    expect(
      result.inferences.filter((item) => item.origin === "runtime-observation"),
    ).toHaveLength(4);
    expect(
      result.timeline.seek(result.events.length).entities["array:3"].value,
    ).toBe(8);
    expect(result.teachingSteps.length).toBeGreaterThan(1);
  });

  it("recognizes relaxation only when source, endpoints, and arithmetic agree", () => {
    const source =
      "def solve(data):\n    dist = [100,100,3,100,9]\n    dist[v] = dist[u] + 3\n    return dist";
    const input = { nodes: ["0", "1", "2", "3", "4"], edges: [["2", "4", 3]] };
    const trace = [
      raw(2, { dist: [100, 100, 3, 100, 9], u: 2, v: 4 }),
      raw(3),
      raw(4, { dist: [100, 100, 3, 100, 6] }),
    ];
    const result = interpretPythonTrace({
      source,
      input,
      output: 6,
      rawTrace: trace,
    });
    const relax = result.events.find((event) => event.type === "RELAX_EDGE");
    expect(relax?.entities).toEqual(["graph:edge:0"]);
    expect(relax?.payload.value).toBe(6);
    expect(relax?.sourceRef?.line).toBe(3);
    expect(
      result.inferences.find((item) => item.eventId === relax?.eventId)
        ?.confidence,
    ).toBe(0.98);
    expect(
      result.timeline.seek(result.events.length).entities["graph:node:4"]
        .metadata?.distance,
    ).toBe(6);

    const inconsistent = interpretPythonTrace({
      source,
      input: { ...input, edges: [["2", "4", 4]] },
      output: 6,
      rawTrace: trace,
    });
    expect(
      inconsistent.events.some((event) => event.type === "RELAX_EDGE"),
    ).toBe(false);
    expect(
      inconsistent.events.some((event) => event.type === "SET_DISTANCE"),
    ).toBe(true);

    const unexplained = interpretPythonTrace({
      source: source.replace("dist[v] = dist[u] + 3", "dist[v] = 6"),
      input,
      output: 6,
      rawTrace: trace,
    });
    expect(
      unexplained.events.some((event) => event.type === "RELAX_EDGE"),
    ).toBe(false);
    expect(
      unexplained.events.some((event) => event.type === "SET_DISTANCE"),
    ).toBe(true);
  });

  it("falls back to a source-linked annotation when meaning is unknown", () => {
    const result = interpretPythonTrace({
      source: "def solve(data):\n    return data",
      input: {},
      output: {},
      rawTrace: [raw(2)],
    });
    expect(result.events[0].type).toBe("ANNOTATE");
    expect(result.inferences[0]).toMatchObject({
      origin: "fallback",
      confidence: 0,
    });
    expect(result.events[0].sourceRef?.line).toBe(2);
  });
});
