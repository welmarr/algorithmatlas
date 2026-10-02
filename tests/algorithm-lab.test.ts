import { describe, expect, it } from "vitest";
import { runLab, LabInputError } from "../apps/web/src/lib/algorithm-lab";

describe("independent algorithm lab", () => {
  it.each([
    ["array", "insertion-sort", { values: [4, 1, 3], target: 3 }, "1 3 4"],
    ["array", "linear-search", { values: [4, 1, 3], target: 3 }, "2"],
    ["grid", "grid-bfs", { rows: ["A..", "##.", "..B"] }, "4 steps"],
    ["grid", "grid-dfs", { rows: ["A..", "##.", "..B"] }, "4 steps"],
    [
      "graph",
      "graph-bfs",
      {
        nodes: ["A", "B", "C", "D", "E"],
        edges: [
          ["A", "B"],
          ["A", "C"],
          ["B", "D"],
          ["D", "E"],
          ["C", "E"],
        ],
        start: "A",
        goal: "E",
      },
      "A → C → E",
    ],
    [
      "graph",
      "graph-dfs",
      {
        nodes: ["A", "B", "C", "D", "E"],
        edges: [
          ["A", "B"],
          ["A", "C"],
          ["B", "D"],
          ["D", "E"],
          ["C", "E"],
        ],
        start: "A",
        goal: "E",
      },
      "A → B → D → E",
    ],
    ["tree", "tree-preorder", { parents: [1, 1, 2, 2] }, "1 → 2 → 4 → 5 → 3"],
    [
      "tree",
      "tree-level-order",
      { parents: [1, 1, 2, 2] },
      "1 → 2 → 3 → 4 → 5",
    ],
  ] as const)(
    "runs %s %s with a deterministic replay",
    (structure, algorithm, input, output) => {
      const first = runLab(structure, algorithm, input);
      const second = runLab(structure, algorithm, input);
      expect(first.output).toBe(output);
      expect(first.events).toEqual(second.events);
      expect(first.teachingSteps.at(-1)?.eventRange.end).toBe(
        first.timeline.length,
      );
      const final = first.timeline.seek(first.timeline.length);
      expect(final.annotation).toBeTruthy();
      first.timeline.seek(0);
      expect(first.timeline.position).toBe(0);
      expect(first.timeline.seek(first.timeline.length)).toEqual(final);
    },
  );

  it("updates visual state and queue or stack inspectors", () => {
    const sort = runLab("array", "insertion-sort", {
      values: [3, 1, 2],
      target: 2,
    });
    expect(
      Object.values(sort.timeline.seek(sort.timeline.length).entities)
        .filter((item) => item.kind === "array")
        .map((item) => item.value),
    ).toEqual([1, 2, 3]);
    const graph = {
      nodes: ["A", "B"],
      edges: [["A", "B"]],
      start: "A",
      goal: "B",
    };
    const bfs = runLab("graph", "graph-bfs", graph);
    const queuePush = bfs.events.find((item) => item.type === "QUEUE_PUSH")!;
    expect(bfs.timeline.seek(queuePush.step).collections.queue).toEqual([
      "graph:node:A",
    ]);
    const dfs = runLab("graph", "graph-dfs", graph);
    const stackPush = dfs.events.find((item) => item.type === "STACK_PUSH")!;
    expect(dfs.timeline.seek(stackPush.step).collections.stack).toHaveLength(1);
  });

  it("rejects incompatible algorithms and malformed structure inputs", () => {
    expect(() =>
      runLab("array", "grid-bfs", { values: [1], target: 1 }),
    ).toThrow(LabInputError);
    expect(() =>
      runLab("array", "linear-search", { values: [], target: 1 }),
    ).toThrow(LabInputError);
    expect(() => runLab("grid", "grid-bfs", { rows: ["A.", ".."] })).toThrow(
      LabInputError,
    );
    expect(() =>
      runLab("graph", "graph-bfs", {
        nodes: ["A", "A"],
        edges: [],
        start: "A",
        goal: "A",
      }),
    ).toThrow(LabInputError);
    expect(() => runLab("tree", "tree-preorder", { parents: [2] })).toThrow(
      LabInputError,
    );
  });

  it("matches independent array and shortest-path oracles on varied inputs", () => {
    let seed = 314159;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let trial = 0; trial < 36; trial++) {
      const values = Array.from(
        { length: 1 + Math.floor(random() * 8) },
        () => Math.floor(random() * 21) - 10,
      );
      const target = Math.floor(random() * 21) - 10;
      expect(runLab("array", "insertion-sort", { values, target }).output).toBe(
        [...values].sort((a, b) => a - b).join(" "),
      );
      expect(runLab("array", "linear-search", { values, target }).output).toBe(
        String(values.indexOf(target)),
      );

      const n = 2 + Math.floor(random() * 6),
        nodes = Array.from({ length: n }, (_, i) => String(i)),
        edges: [string, string][] = [];
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++)
          if (random() < 0.4) edges.push([String(a), String(b)]);
      const distances = Array<number>(n).fill(-1),
        queue = [0];
      distances[0] = 0;
      while (queue.length) {
        const node = queue.shift()!;
        for (const [a, b] of edges) {
          const neighbor =
            Number(a) === node
              ? Number(b)
              : Number(b) === node
                ? Number(a)
                : -1;
          if (neighbor >= 0 && distances[neighbor] < 0) {
            distances[neighbor] = distances[node] + 1;
            queue.push(neighbor);
          }
        }
      }
      const result = runLab("graph", "graph-bfs", {
        nodes,
        edges,
        start: "0",
        goal: String(n - 1),
      }).output;
      if (distances[n - 1] < 0) expect(result).toBe("No route");
      else {
        const path = result.split(" → ");
        expect(path.length - 1).toBe(distances[n - 1]);
        expect(path[0]).toBe("0");
        expect(path.at(-1)).toBe(String(n - 1));
      }
    }
  });
});
