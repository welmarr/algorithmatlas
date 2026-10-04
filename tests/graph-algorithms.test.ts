import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

type Edge = [number, number];
type Weighted = [number, number, number];
function output(id: string, input: unknown): string {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1672;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

describe("independent graph algorithm oracles", () => {
  it("matches all published examples", () => {
    for (const id of [
      "building-teams",
      "round-trip-ii",
      "shortest-routes-ii",
    ]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("building-teams agrees with exhaustive two-color assignments", () => {
    for (let trial = 0; trial < 55; trial++) {
      const nodes = 1 + Math.floor(random() * 8),
        edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = a + 1; b <= nodes; b++)
          if (random() < 0.35) edges.push([a, b]);
      let possible = false;
      for (let mask = 0; mask < 2 ** nodes; mask++)
        if (
          edges.every(
            ([a, b]) =>
              Boolean(mask & (1 << (a - 1))) !== Boolean(mask & (1 << (b - 1))),
          )
        ) {
          possible = true;
          break;
        }
      const result = output("building-teams", { nodes, edges });
      if (!possible) expect(result).toBe("IMPOSSIBLE");
      else {
        const team = result.split(" ").map(Number);
        expect(team).toHaveLength(nodes);
        expect(team.every((value) => value === 1 || value === 2)).toBe(true);
        for (const [a, b] of edges) expect(team[a - 1]).not.toBe(team[b - 1]);
      }
    }
  });

  it("round-trip-ii finds a valid directed cycle iff one exists", () => {
    for (let trial = 0; trial < 55; trial++) {
      const nodes = 1 + Math.floor(random() * 8),
        edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++)
          if (a !== b && random() < 0.2) edges.push([a, b]);
      const reach = Array.from({ length: nodes + 1 }, (_, a) => {
        const seen = new Set<number>(),
          stack = [a];
        while (stack.length) {
          const at = stack.pop()!;
          for (const [from, to] of edges)
            if (from === at && !seen.has(to)) {
              seen.add(to);
              stack.push(to);
            }
        }
        return seen;
      });
      const cyclic = Array.from({ length: nodes }, (_, i) => i + 1).some((a) =>
        reach[a].has(a),
      );
      const result = output("round-trip-ii", { nodes, edges });
      if (!cyclic) expect(result).toBe("IMPOSSIBLE");
      else {
        const [count, route] = result.split("\n"),
          cities = route.split(" ").map(Number);
        expect(cities).toHaveLength(Number(count));
        expect(cities.length).toBeGreaterThan(2);
        expect(cities[0]).toBe(cities.at(-1));
        expect(new Set(cities.slice(0, -1)).size).toBe(cities.length - 1);
        for (let i = 1; i < cities.length; i++)
          expect(edges).toContainEqual([cities[i - 1], cities[i]]);
      }
    }
  });

  it("shortest-routes-ii matches independent per-query path search", () => {
    for (let trial = 0; trial < 45; trial++) {
      const nodes = 1 + Math.floor(random() * 7),
        edges: Weighted[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = a + 1; b <= nodes; b++)
          if (random() < 0.45)
            edges.push([a, b, 1 + Math.floor(random() * 20)]);
      const queries: Edge[] = Array.from({ length: 4 }, () => [
        1 + Math.floor(random() * nodes),
        1 + Math.floor(random() * nodes),
      ]);
      const expected = queries.map(([start, target]) => {
        const distance = Array<number>(nodes + 1).fill(Infinity),
          used = new Set<number>();
        distance[start] = 0;
        for (let i = 0; i < nodes; i++) {
          let at = 0;
          for (let node = 1; node <= nodes; node++)
            if (!used.has(node) && (!at || distance[node] < distance[at]))
              at = node;
          if (!at || !Number.isFinite(distance[at])) break;
          used.add(at);
          for (const [a, b, cost] of edges) {
            if (a === at)
              distance[b] = Math.min(distance[b], distance[at] + cost);
            if (b === at)
              distance[a] = Math.min(distance[a], distance[at] + cost);
          }
        }
        return Number.isFinite(distance[target])
          ? String(distance[target])
          : "-1";
      });
      expect(output("shortest-routes-ii", { nodes, edges, queries })).toBe(
        expected.join("\n"),
      );
    }
  });

  it("rejects malformed graph and query inputs", () => {
    for (const id of ["building-teams", "round-trip-ii", "shortest-routes-ii"])
      expect(() => output(id, {}), id).toThrow();
    expect(() =>
      output("shortest-routes-ii", { nodes: 2, edges: [], queries: [] }),
    ).toThrow();
    expect(() =>
      output("shortest-routes-ii", { nodes: 2, edges: [], queries: [[1, 3]] }),
    ).toThrow();
  });
});
