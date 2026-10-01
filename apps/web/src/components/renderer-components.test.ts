import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyState } from "@sim/domain";
import {
  CodeVisual,
  CollectionVisual,
  VariablesVisual,
} from "./StructureVisuals";
import { DPVisual, GraphVisual, Visuals } from "./Visuals";

describe("accessible renderer components", () => {
  it("renders queue, stack, and heap as ordered visual items", () => {
    const state = emptyState();
    state.entities["queue:item:a"] = {
      id: "queue:item:a",
      kind: "queue-item",
      label: "A",
      status: "idle",
    };
    state.entities["queue:item:b"] = {
      id: "queue:item:b",
      kind: "queue-item",
      label: "B",
      status: "idle",
    };
    state.entities["stack:item:a"] = {
      id: "stack:item:a",
      kind: "stack-item",
      label: "A",
      status: "idle",
    };
    state.entities["stack:item:b"] = {
      id: "stack:item:b",
      kind: "stack-item",
      label: "B",
      status: "idle",
    };
    state.entities["heap:item:a"] = {
      id: "heap:item:a",
      kind: "heap-item",
      label: "A",
      value: 1,
      status: "idle",
    };
    state.collections = {
      queue: ["queue:item:a", "queue:item:b"],
      stack: ["stack:item:a", "stack:item:b"],
      heap: ["heap:item:a"],
    };
    const queue = renderToStaticMarkup(
      createElement(CollectionVisual, { state, kind: "queue" }),
    );
    const stack = renderToStaticMarkup(
      createElement(CollectionVisual, { state, kind: "stack" }),
    );
    const heap = renderToStaticMarkup(
      createElement(CollectionVisual, { state, kind: "heap" }),
    );
    expect(queue).toContain("Queue items");
    expect(queue).toContain("A, front");
    expect(stack).toContain("B, top");
    expect(heap).toContain("A: 1, minimum");
    expect(queue.indexOf('aria-label="A, front"')).toBeLessThan(
      queue.indexOf('aria-label="B"'),
    );
  });

  it("renders directed weighted graph edges, predecessor links, and tree hierarchy", () => {
    const state = emptyState();
    state.entities["graph:node:A"] = {
      id: "graph:node:A",
      kind: "graph-node",
      label: "A",
      status: "visited",
    };
    state.entities["graph:node:B"] = {
      id: "graph:node:B",
      kind: "graph-node",
      label: "B",
      status: "discovered",
      metadata: { distance: 4, parent: "A" },
    };
    state.entities["graph:edge:0"] = {
      id: "graph:edge:0",
      kind: "graph-edge",
      label: "A-B",
      status: "active",
      metadata: { from: "A", to: "B", directed: true, weight: 4 },
    };
    const graph = renderToStaticMarkup(createElement(GraphVisual, { state }));
    expect(graph).toContain('marker-end="url(#graph-arrow)"');
    expect(graph).toContain("graph-weight");
    expect(graph).toContain("parent-link");
    expect(graph).toContain("weight 4");
    state.entities = {
      "tree:node:A": {
        id: "tree:node:A",
        kind: "tree-node",
        label: "A",
        status: "idle",
      },
      "tree:node:B": {
        id: "tree:node:B",
        kind: "tree-node",
        label: "B",
        status: "idle",
        metadata: { parent: "A" },
      },
    };
    const tree = renderToStaticMarkup(
      createElement(GraphVisual, { state, tree: true }),
    );
    expect(tree).toContain("Tree nodes and traversal state");
    expect(tree).toContain('viewBox="0 0 600 300"');
  });

  it("renders 2D DP dependencies, variables, and active code line", () => {
    const state = emptyState();
    state.entities["dp:0:0"] = {
      id: "dp:0:0",
      kind: "dp",
      label: "0,0",
      value: 1,
      status: "idle",
    };
    state.entities["dp:1:0"] = {
      id: "dp:1:0",
      kind: "dp",
      label: "1,0",
      value: 2,
      status: "idle",
    };
    state.entities["dp:1:1"] = {
      id: "dp:1:1",
      kind: "dp",
      label: "1,1",
      value: 3,
      status: "idle",
    };
    state.activeEntities = ["dp:1:1", "dp:1:0"];
    state.focus = {
      eventId: "test",
      kind: "update",
      before: 0,
      after: 3,
      variable: "sum",
    };
    state.variables.sum = 3;
    const dp = renderToStaticMarkup(createElement(DPVisual, { state }));
    expect(dp).toContain('role="rowheader"');
    expect(dp).toContain("dependency");
    expect(dp).toContain("USED");
    expect(dp).toContain("UPDATE");
    const variables = renderToStaticMarkup(
      createElement(VariablesVisual, { state }),
    );
    expect(variables).toContain("is-changing");
    const code = renderToStaticMarkup(
      createElement(CodeVisual, {
        source: "let sum = 0;\nreturn sum;",
        activeLine: 2,
        focusKind: "result",
      }),
    );
    expect(code).toContain("code-line active cue-result");
    expect(
      renderToStaticMarkup(createElement(Visuals, { kind: "heap", state })),
    ).toContain("Priority queue");
  });
});
