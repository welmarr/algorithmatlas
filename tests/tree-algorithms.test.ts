import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

type Edge = [number, number];
function output(id: string, input: unknown): string {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1130;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function distances(nodes: number, edges: Edge[], start: number) {
  const d = Array<number>(nodes + 1).fill(-1),
    queue = [start];
  d[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    for (const [a, b] of edges) {
      const next = a === at ? b : b === at ? a : 0;
      if (next && d[next] < 0) {
        d[next] = d[at] + 1;
        queue.push(next);
      }
    }
  }
  return d.slice(1);
}

describe("independent tree algorithm oracles", () => {
  it("matches each published tree example", () => {
    for (const id of [
      "tree-distances-i",
      "tree-distances-ii",
      "tree-matching",
      "company-queries-i",
    ]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("tree-distances-i and ii agree with all-pairs breadth-first searches", () => {
    for (let trial = 0; trial < 50; trial++) {
      const nodes = 1 + Math.floor(random() * 10),
        edges: Edge[] = [];
      for (let child = 2; child <= nodes; child++)
        edges.push([1 + Math.floor(random() * (child - 1)), child]);
      const all = Array.from({ length: nodes }, (_, i) =>
        distances(nodes, edges, i + 1),
      );
      const maximum = all.map((row) => Math.max(...row));
      const sums = all.map((row) => row.reduce((a, b) => a + b, 0));
      expect(output("tree-distances-i", { nodes, edges })).toBe(
        maximum.join(" "),
      );
      expect(output("tree-distances-ii", { nodes, edges })).toBe(
        sums.join(" "),
      );
    }
  });

  it("tree-matching equals exhaustive nonincident edge selection", () => {
    for (let trial = 0; trial < 55; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        edges: Edge[] = [];
      for (let child = 2; child <= nodes; child++)
        edges.push([1 + Math.floor(random() * (child - 1)), child]);
      let best = 0;
      for (let mask = 0; mask < 2 ** edges.length; mask++) {
        const used = new Set<number>();
        let count = 0,
          valid = true;
        edges.forEach(([a, b], i) => {
          if (!(mask & (1 << i))) return;
          if (used.has(a) || used.has(b)) valid = false;
          used.add(a);
          used.add(b);
          count++;
        });
        if (valid) best = Math.max(best, count);
      }
      expect(output("tree-matching", { nodes, edges })).toBe(String(best));
    }
  });

  it("company-queries-i matches direct boss climbing", () => {
    for (let trial = 0; trial < 55; trial++) {
      const nodes = 1 + Math.floor(random() * 12);
      const parents = Array.from(
        { length: nodes - 1 },
        (_, i) => 1 + Math.floor(random() * (i + 1)),
      );
      const queries: Edge[] = Array.from({ length: 5 }, () => [
        1 + Math.floor(random() * nodes),
        1 + Math.floor(random() * nodes),
      ]);
      const expected = queries.map(([employee, levels]) => {
        let at = employee;
        for (let jump = 0; jump < levels; jump++)
          at = at > 1 ? parents[at - 2] : 0;
        return String(at || -1);
      });
      expect(output("company-queries-i", { nodes, parents, queries })).toBe(
        expected.join("\n"),
      );
    }
  });

  it("rejects disconnected, cyclic, malformed, and out-of-bound tree input", () => {
    for (const id of [
      "tree-distances-i",
      "tree-distances-ii",
      "tree-matching",
      "company-queries-i",
    ])
      expect(() => output(id, {}), id).toThrow();
    expect(() =>
      output("tree-matching", {
        nodes: 4,
        edges: [
          [1, 2],
          [2, 3],
          [3, 1],
        ],
      }),
    ).toThrow();
    expect(() =>
      output("tree-distances-i", {
        nodes: 3,
        edges: [
          [1, 2],
          [2, 1],
        ],
      }),
    ).toThrow();
    expect(() =>
      output("company-queries-i", {
        nodes: 3,
        parents: [1, 3],
        queries: [[3, 1]],
      }),
    ).toThrow();
  });
});
