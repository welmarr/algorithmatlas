import { describe, expect, it } from "vitest";
import { emptyState, type VisualEntity } from "@sim/domain";
import { createEvents } from "@sim/semantic-events";
import { SimulationTimeline } from "@sim/simulation-core";
import {
  layoutDp,
  layoutTree,
} from "../apps/web/src/components/renderer-layout";

function entity(
  id: string,
  kind: VisualEntity["kind"],
  label: string,
  value?: number,
): VisualEntity {
  return { id, kind, label, value, status: "idle" };
}

describe("renderer layout contracts", () => {
  it("places tree children below their parent and centers parent over siblings", () => {
    const nodes = [
      entity("tree:node:A", "tree-node", "A"),
      { ...entity("tree:node:B", "tree-node", "B"), metadata: { parent: "A" } },
      { ...entity("tree:node:C", "tree-node", "C"), metadata: { parent: "A" } },
      { ...entity("tree:node:D", "tree-node", "D"), metadata: { parent: "B" } },
    ];
    const layout = layoutTree(nodes);
    const a = layout.positions.get("A")!;
    const b = layout.positions.get("B")!;
    const c = layout.positions.get("C")!;
    const d = layout.positions.get("D")!;
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(d.y);
    expect(a.x).toBe((b.x + c.x) / 2);
    expect(new Set([b.x, c.x]).size).toBe(2);
    expect(layout.edges).toHaveLength(3);
    expect(layoutTree(nodes)).toEqual(layout);
  });

  it("supports sparse two-dimensional DP and ordinary one-dimensional DP", () => {
    const table = layoutDp([
      entity("dp:0:0", "dp", "0,0", 1),
      entity("dp:1:1", "dp", "1,1", 3),
    ]);
    expect([table.rowCount, table.columnCount, table.twoDimensional]).toEqual([
      2,
      2,
      true,
    ]);
    expect(table.rows[1][0]).toBeUndefined();
    expect(table.rows[1][1]?.value).toBe(3);
    const row = layoutDp([
      entity("dp:0", "dp", "0", 1),
      entity("dp:1", "dp", "1", 2),
    ]);
    expect([row.rowCount, row.columnCount, row.twoDimensional]).toEqual([
      1,
      2,
      false,
    ]);
  });
});

describe("collection semantic state", () => {
  it("preserves FIFO queue and LIFO stack order", () => {
    const state = emptyState();
    for (const id of [
      "queue:item:a",
      "queue:item:b",
      "stack:item:a",
      "stack:item:b",
    ])
      state.entities[id] = entity(
        id,
        id.startsWith("queue") ? "queue-item" : "stack-item",
        id.at(-1)!,
      );
    const events = createEvents(
      [
        {
          type: "QUEUE_PUSH",
          entities: ["queue:item:a"],
          payload: {},
          explanation: "enqueue a",
        },
        {
          type: "QUEUE_PUSH",
          entities: ["queue:item:b"],
          payload: {},
          explanation: "enqueue b",
        },
        {
          type: "STACK_PUSH",
          entities: ["stack:item:a"],
          payload: {},
          explanation: "push a",
        },
        {
          type: "STACK_PUSH",
          entities: ["stack:item:b"],
          payload: {},
          explanation: "push b",
        },
        {
          type: "QUEUE_POP",
          entities: ["queue:item:a"],
          payload: {},
          explanation: "dequeue a",
        },
        {
          type: "STACK_POP",
          entities: ["stack:item:b"],
          payload: {},
          explanation: "pop b",
        },
      ],
      "collections",
    );
    const timeline = new SimulationTimeline(state, events);
    timeline.seek(4);
    expect(timeline.state.collections.queue).toEqual([
      "queue:item:a",
      "queue:item:b",
    ]);
    expect(timeline.state.collections.stack).toEqual([
      "stack:item:a",
      "stack:item:b",
    ]);
    timeline.seek(6);
    expect(timeline.state.collections.queue).toEqual(["queue:item:b"]);
    expect(timeline.state.collections.stack).toEqual(["stack:item:a"]);
    expect(
      () =>
        new SimulationTimeline(
          state,
          createEvents(
            [
              {
                type: "QUEUE_POP",
                entities: ["queue:item:b"],
                payload: {},
                explanation: "wrong front",
              },
            ],
            "invalid",
          ),
        ),
    ).toThrow("current queue item");
  });

  it("orders heap items by priority and extracts the minimum", () => {
    const state = emptyState();
    state.entities["heap:item:a"] = entity("heap:item:a", "heap-item", "a", 5);
    state.entities["heap:item:b"] = entity("heap:item:b", "heap-item", "b", 2);
    state.entities["heap:item:c"] = entity("heap:item:c", "heap-item", "c", 8);
    const events = createEvents(
      [
        {
          type: "HEAP_INSERT",
          entities: ["heap:item:a"],
          payload: {},
          explanation: "insert a",
        },
        {
          type: "HEAP_INSERT",
          entities: ["heap:item:b"],
          payload: {},
          explanation: "insert b",
        },
        {
          type: "HEAP_INSERT",
          entities: ["heap:item:c"],
          payload: {},
          explanation: "insert c",
        },
        {
          type: "HEAP_UPDATE",
          entities: ["heap:item:c"],
          payload: { value: 1 },
          explanation: "decrease c",
        },
        {
          type: "HEAP_EXTRACT",
          entities: ["heap:item:c"],
          payload: {},
          explanation: "extract c",
        },
      ],
      "heap",
    );
    const timeline = new SimulationTimeline(state, events);
    timeline.seek(3);
    expect(timeline.state.collections.heap).toEqual([
      "heap:item:b",
      "heap:item:a",
      "heap:item:c",
    ]);
    timeline.seek(4);
    expect(timeline.state.collections.heap[0]).toBe("heap:item:c");
    timeline.seek(5);
    expect(timeline.state.collections.heap).toEqual([
      "heap:item:b",
      "heap:item:a",
    ]);
    const invalid = emptyState();
    invalid.entities["heap:item:missing"] = entity(
      "heap:item:missing",
      "heap-item",
      "missing",
    );
    expect(
      () =>
        new SimulationTimeline(
          invalid,
          createEvents(
            [
              {
                type: "HEAP_INSERT",
                entities: ["heap:item:missing"],
                payload: {},
                explanation: "No priority",
              },
            ],
            "invalid-heap",
          ),
        ),
    ).toThrow("numeric priority");
  });

  it("keeps DP transition dependencies active without mutating the target", () => {
    const state = emptyState();
    state.entities["dp:1:1"] = entity("dp:1:1", "dp", "1,1", 0);
    state.entities["dp:0:1"] = entity("dp:0:1", "dp", "0,1", 2);
    state.entities["dp:1:0"] = entity("dp:1:0", "dp", "1,0", 3);
    const events = createEvents(
      [
        {
          type: "DP_TRANSITION",
          entities: ["dp:1:1", "dp:0:1", "dp:1:0"],
          payload: { value: 5 },
          explanation: "Combine neighbors",
        },
        {
          type: "DP_UPDATE",
          entities: ["dp:1:1", "dp:0:1", "dp:1:0"],
          payload: { value: 5 },
          explanation: "Store result",
        },
      ],
      "dp2d",
    );
    const timeline = new SimulationTimeline(state, events);
    expect(timeline.seek(1).entities["dp:1:1"].value).toBe(0);
    expect(timeline.state.activeEntities).toHaveLength(3);
    expect(timeline.seek(2).entities["dp:1:1"].value).toBe(5);
  });
});
