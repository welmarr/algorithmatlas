import { describe, expect, it } from "vitest";
import { createEvents, validateEvent } from "@sim/semantic-events";
import { emptyState } from "@sim/domain";
import { SimulationTimeline } from "@sim/simulation-core";
import { getProblem, problems } from "@sim/problems";

describe("event protocol", () => {
  it("rejects unsupported events and malformed references", () => {
    expect(() =>
      validateEvent({
        schemaVersion: "0.1",
        eventId: "x",
        step: 1,
        type: "COLOR_NODE",
        entities: [],
        payload: {},
        explanation: "",
      }),
    ).toThrow("Unsupported event");
    expect(() =>
      validateEvent({
        schemaVersion: "0.1",
        eventId: "x",
        step: 1,
        type: "SELECT",
        entities: ["node:a"],
        payload: {},
        explanation: "",
      }),
    ).toThrow("Invalid entity");
  });
  it("creates stable step IDs", () => {
    expect(
      createEvents(
        [{ type: "ANNOTATE", entities: [], payload: {}, explanation: "test" }],
        "run",
      )[0].eventId,
    ).toBe("run:1");
  });
  it("rejects unsafe payload values and reserved state keys", () => {
    const base = {
      schemaVersion: "0.1",
      eventId: "x",
      step: 1,
      type: "ANNOTATE",
      entities: [],
      explanation: "x",
    };
    expect(() =>
      validateEvent({ ...base, payload: { value: Infinity } }),
    ).toThrow("finite primitives");
    expect(() =>
      validateEvent({ ...base, payload: { variable: "__proto__", value: 1 } }),
    ).toThrow("Reserved variable");
    expect(() =>
      validateEvent({ ...base, payload: { collection: "constructor" } }),
    ).toThrow("Reserved collection");
  });
});

describe("simulation timeline", () => {
  const state = emptyState();
  state.entities["array:0"] = {
    id: "array:0",
    kind: "array",
    label: "0",
    value: 1,
    status: "idle",
  };
  const events = createEvents(
    Array.from({ length: 20 }, (_, index) => ({
      type: "WRITE_INDEX" as const,
      entities: ["array:0"],
      payload: { value: index + 2 },
      explanation: `Set ${index + 2}`,
    })),
    "test",
  );
  it("seeks from snapshots, rewinds and replays identically", () => {
    const timeline = new SimulationTimeline(state, events, {
      snapshotInterval: 3,
    });
    expect(timeline.snapshots.map((item) => item.position)).toEqual([
      0, 3, 6, 9, 12, 15, 18, 20,
    ]);
    expect(timeline.seek(20).entities["array:0"].value).toBe(21);
    expect(timeline.seek(7).entities["array:0"].value).toBe(8);
    expect(timeline.previous().entities["array:0"].value).toBe(7);
    timeline.rewind();
    expect(timeline.position).toBe(0);
    expect(timeline.seek(20).entities["array:0"].value).toBe(21);
    timeline.dispose();
  });
  it("does not expose mutable internal state", () => {
    const timeline = new SimulationTimeline(state, events);
    timeline.state.entities["array:0"].value = 999;
    expect(timeline.state.entities["array:0"].value).toBe(1);
    timeline.snapshots[0].state.entities["array:0"].value = 999;
    expect(timeline.seek(1).entities["array:0"].value).toBe(2);
    expect(() => {
      events[0].payload.value = 999;
    }).not.toThrow();
    expect(timeline.rewind().entities["array:0"].value).toBe(1);
    expect(timeline.next().entities["array:0"].value).toBe(2);
  });
  it("records the focused action and before/after value across replay", () => {
    const focused = new SimulationTimeline(
      state,
      createEvents(
        [
          {
            type: "READ_INDEX",
            entities: ["array:0"],
            payload: { value: 1 },
            explanation: "Read",
          },
          {
            type: "WRITE_INDEX",
            entities: ["array:0"],
            payload: { value: 4 },
            explanation: "Write",
          },
        ],
        "focus",
      ),
      { snapshotInterval: 1 },
    );
    expect(focused.next().focus).toMatchObject({
      kind: "inspect",
      eventId: "focus:1",
    });
    expect(focused.next().focus).toMatchObject({
      kind: "update",
      before: 1,
      after: 4,
      eventId: "focus:2",
    });
    expect(focused.previous().focus?.kind).toBe("inspect");
    expect(focused.seek(2).focus).toMatchObject({
      kind: "update",
      before: 1,
      after: 4,
    });
  });
});

describe("problem pack integration", () => {
  it.each(problems.map((problem) => [problem.metadata.id, problem] as const))(
    "%s produces a deterministic valid replay",
    (_id, problem) => {
      const first = problem.run(problem.defaultInput),
        second = problem.run(problem.defaultInput);
      expect(first.events).toEqual(second.events);
      expect(first.output).toEqual(second.output);
      expect(first.timeline.seek(first.timeline.length)).toEqual(
        second.timeline.seek(second.timeline.length),
      );
      first.timeline.rewind();
      expect(first.timeline.seek(first.timeline.length)).toEqual(
        second.timeline.state,
      );
    },
  );
  it("matches the increasing array brute-force oracle for small inputs", () => {
    const problem = getProblem("increasing-array")!;
    for (let length = 1; length <= 6; length++)
      for (let seed = 0; seed < 100; seed++) {
        const values = Array.from(
          { length },
          (_, i) => ((seed * 17 + i * 13) % 11) - 5,
        );
        let moves = 0,
          floor = values[0];
        for (const value of values.slice(1)) {
          moves += Math.max(0, floor - value);
          floor = Math.max(floor, value);
        }
        expect(problem.run({ values }).output).toBe(String(moves));
      }
  });
  it("finds expected answers in every family", () => {
    expect(
      getProblem("labyrinth")!.run({ rows: ["A..", ".#.", "..B"] }).output,
    ).toBe("4 steps");
    expect(
      getProblem("message-route")!.run({
        nodes: ["A", "B", "C"],
        edges: [
          ["A", "B"],
          ["B", "C"],
        ],
        source: "A",
        target: "C",
      }).output,
    ).toBe("A → B → C");
    expect(
      getProblem("tree-diameter")!.run({
        nodes: ["A", "B", "C"],
        edges: [
          ["A", "B"],
          ["B", "C"],
        ],
      }).output,
    ).toBe("2 edges");
    expect(getProblem("dice-combinations")!.run({ target: 3 }).output).toBe(
      "4",
    );
  });
  it("rejects malformed custom inputs", () => {
    expect(() => getProblem("labyrinth")!.run({ rows: ["A.", "##"] })).toThrow(
      "exactly one A and one B",
    );
    expect(() =>
      getProblem("tree-diameter")!.run({
        nodes: ["A", "B", "C"],
        edges: [
          ["A", "B"],
          ["A", "B"],
        ],
      }),
    ).toThrow("connect every node");
  });
});
