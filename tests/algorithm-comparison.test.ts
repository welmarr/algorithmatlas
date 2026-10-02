import { describe, expect, it } from "vitest";
import {
  comparisonDefinitions,
  comparisonMetrics,
  runComparison,
} from "../apps/web/src/lib/algorithm-comparison";

describe("algorithm comparison", () => {
  it.each(["graph-search", "grid-search", "tree-traversal"] as const)(
    "uses the same validated input for two independent %s timelines",
    (id) => {
      const result = runComparison(id, comparisonDefinitions[id].input);
      expect(result.left.input).toEqual(result.right.input);
      expect(result.correctness).toEqual([true, true]);
      expect(result.left.timeline).not.toBe(result.right.timeline);
      result.left.timeline.next();
      expect(result.left.timeline.position).toBe(1);
      expect(result.right.timeline.position).toBe(0);
      result.right.timeline.seek(result.right.timeline.length);
      expect(result.left.timeline.position).toBe(1);
      expect(result.right.timeline.position).toBe(result.right.timeline.length);
      result.left.timeline.dispose();
      result.right.timeline.dispose();
    },
  );

  it("explains a longer DFS route without calling event counts runtime", () => {
    const result = runComparison(
      "graph-search",
      comparisonDefinitions["graph-search"].input,
    );
    expect(result.left.output).toBe("A → C → F");
    expect(result.right.output).toBe("A → B → D → E → F");
    expect(result.conclusion).toContain("Shortest route: 2 edges");
    const left = comparisonMetrics(result.left.events);
    expect(left.events).toBe(result.left.timeline.length);
    expect(left.visited).toBeGreaterThan(0);
    expect(left.byType.VISIT_NODE).toBe(left.visited);
  });

  it("validates an unreachable input and does not confuse empty routes with errors", () => {
    const result = runComparison("graph-search", {
      nodes: ["A", "B", "C"],
      edges: [["A", "B"]],
      start: "A",
      goal: "C",
    });
    expect(result.left.output).toBe("No route");
    expect(result.right.output).toBe("No route");
    expect(result.correctness).toEqual([true, true]);
    expect(result.conclusion).toContain("unreachable");
  });

  it("rejects invalid shared inputs before a comparison is accepted", () => {
    expect(() => runComparison("grid-search", { rows: ["A#", ".."] })).toThrow(
      /one A and one B/,
    );
  });

  it("counts visits and collection actions from event types at a position", () => {
    const result = runComparison("graph-search", {
      nodes: ["A", "B"],
      edges: [["A", "B"]],
      start: "A",
      goal: "B",
    });
    const first = comparisonMetrics(result.left.events.slice(0, 1));
    const full = comparisonMetrics(result.left.events);
    expect(first.events).toBe(1);
    expect(first.visited).toBe(0);
    expect(full.visited).toBe(2);
    expect(full.collectionOperations).toBeGreaterThan(0);
  });

  it("validates routes and shortest BFS results across varied shared graphs", () => {
    let seed = 191;
    const random = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const nodes = ["A", "B", "C", "D", "E", "F"];
    for (let sample = 0; sample < 60; sample++) {
      const edges: [string, string][] = [];
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++)
          if (random() < 0.3) edges.push([nodes[i], nodes[j]]);
      const result = runComparison("graph-search", {
        nodes,
        edges,
        start: "A",
        goal: "F",
      });
      expect(result.correctness).toEqual([true, true]);
      result.left.timeline.dispose();
      result.right.timeline.dispose();
    }
  });
});
