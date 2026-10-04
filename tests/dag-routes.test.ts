import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

type Edge = [number, number];
function output(id: string, input: unknown) {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1681;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

describe("independent DAG route oracles", () => {
  it("matches both published examples", () => {
    for (const id of ["game-routes", "longest-flight-route"]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("counts all source-to-target routes and validates the longest route", () => {
    for (let trial = 0; trial < 65; trial++) {
      const nodes = 2 + Math.floor(random() * 7),
        order = Array.from({ length: nodes }, (_, i) => i + 1);
      for (let i = nodes - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const edges: Edge[] = [];
      for (let i = 0; i < nodes; i++)
        for (let j = i + 1; j < nodes; j++)
          if (random() < 0.36 && edges.length < 24)
            edges.push([order[i], order[j]]);
      let count = 0,
        longest = 0;
      function walk(at: number, length: number) {
        if (at === nodes) {
          count++;
          longest = Math.max(longest, length);
          return;
        }
        for (const [from, to] of edges) if (from === at) walk(to, length + 1);
      }
      walk(1, 1);
      expect(output("game-routes", { nodes, edges })).toBe(String(count));
      const result = output("longest-flight-route", { nodes, edges });
      if (!count) expect(result).toBe("IMPOSSIBLE");
      else {
        const [first, line] = result.split("\n"),
          path = line.split(" ").map(Number);
        expect(Number(first)).toBe(longest);
        expect(path).toHaveLength(longest);
        expect(path[0]).toBe(1);
        expect(path.at(-1)).toBe(nodes);
        for (let i = 1; i < path.length; i++)
          expect(edges).toContainEqual([path[i - 1], path[i]]);
      }
    }
  });

  it("rejects cyclic and malformed custom graphs", () => {
    for (const id of ["game-routes", "longest-flight-route"]) {
      expect(() => output(id, {}), id).toThrow();
      expect(() =>
        output(id, {
          nodes: 2,
          edges: [
            [1, 2],
            [2, 1],
          ],
        }),
      ).toThrow();
    }
    expect(() =>
      output("longest-flight-route", { nodes: 1, edges: [] }),
    ).toThrow();
    expect(output("game-routes", { nodes: 1, edges: [] })).toBe("1");
  });
});
