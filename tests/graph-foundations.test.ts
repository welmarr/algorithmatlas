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

let seed = 1675;
function random(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function reachable(
  nodes: number,
  edges: Edge[],
  start: number,
  reverse = false,
) {
  const seen = new Set([start]);
  const pending = [start];
  while (pending.length) {
    const at = pending.shift()!;
    for (const [from, to] of edges) {
      if ((reverse ? to : from) === at && !seen.has(reverse ? from : to)) {
        const next = reverse ? from : to;
        seen.add(next);
        pending.push(next);
      }
    }
  }
  return seen;
}

function components(nodes: number, edges: Edge[]) {
  const all = edges.flatMap(
    ([a, b]) =>
      [
        [a, b],
        [b, a],
      ] as Edge[],
  );
  const seen = new Set<number>();
  let count = 0;
  for (let node = 1; node <= nodes; node++) {
    if (seen.has(node)) continue;
    count++;
    for (const member of reachable(nodes, all, node)) seen.add(member);
  }
  return count;
}

describe("independent graph foundation oracles", () => {
  it("matches the published example fixture for every new graph task", () => {
    for (const id of [
      "building-roads",
      "course-schedule",
      "road-reparation",
      "flight-routes-check",
    ]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("building-roads joins components using the minimum number of roads", () => {
    for (let trial = 0; trial < 50; trial++) {
      const nodes = 1 + Math.floor(random() * 8);
      const edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = a + 1; b <= nodes; b++)
          if (random() < 0.24) edges.push([a, b]);
      const lines = output("building-roads", { nodes, edges }).split("\n");
      const roads = lines
        .slice(1)
        .map((line) => line.split(" ").map(Number) as Edge);
      expect(Number(lines[0])).toBe(components(nodes, edges) - 1);
      expect(roads).toHaveLength(Number(lines[0]));
      expect(components(nodes, [...edges, ...roads])).toBe(1);
    }
    expect(output("building-roads", { nodes: 1, edges: [] })).toBe("0");
  });

  it("course-schedule returns a valid order exactly for acyclic graphs", () => {
    for (let trial = 0; trial < 50; trial++) {
      const nodes = 1 + Math.floor(random() * 8);
      const edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++)
          if (a !== b && random() < 0.15) edges.push([a, b]);
      const result = output("course-schedule", { nodes, edges });
      // The independent oracle enumerates all orders for these small graphs.
      function possible(done: number): boolean {
        if (done === (1 << nodes) - 1) return true;
        for (let course = 1; course <= nodes; course++) {
          if (done & (1 << (course - 1))) continue;
          if (edges.some(([a, b]) => b === course && !(done & (1 << (a - 1)))))
            continue;
          if (possible(done | (1 << (course - 1)))) return true;
        }
        return false;
      }
      if (!possible(0)) expect(result).toBe("IMPOSSIBLE");
      else {
        const order = result.split(" ").map(Number);
        expect(new Set(order).size).toBe(nodes);
        expect(order).toHaveLength(nodes);
        for (const [a, b] of edges)
          expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
      }
    }
    expect(
      output("course-schedule", {
        nodes: 2,
        edges: [
          [1, 2],
          [2, 1],
        ],
      }),
    ).toBe("IMPOSSIBLE");
  });

  it("road-reparation matches exhaustive spanning-tree costs", () => {
    for (let trial = 0; trial < 45; trial++) {
      const nodes = 1 + Math.floor(random() * 6);
      const edges: Weighted[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = a + 1; b <= nodes; b++)
          if (edges.length < 10 && random() < 0.55)
            edges.push([a, b, 1 + Math.floor(random() * 20)]);
      let best = Infinity;
      for (let mask = 0; mask < 2 ** edges.length; mask++) {
        if (mask.toString(2).replaceAll("0", "").length !== nodes - 1) continue;
        const chosen = edges.filter((_, index) => mask & (1 << index));
        if (
          components(
            nodes,
            chosen.map(([a, b]) => [a, b]),
          ) === 1
        )
          best = Math.min(
            best,
            chosen.reduce((sum, edge) => sum + edge[2], 0),
          );
      }
      expect(output("road-reparation", { nodes, edges })).toBe(
        Number.isFinite(best) ? String(best) : "IMPOSSIBLE",
      );
    }
    expect(output("road-reparation", { nodes: 1, edges: [] })).toBe("0");
  });

  it("flight-routes-check returns YES or a valid unreachable pair", () => {
    for (let trial = 0; trial < 50; trial++) {
      const nodes = 1 + Math.floor(random() * 8);
      const edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++)
          if (a !== b && random() < 0.16) edges.push([a, b]);
      const allReach = Array.from({ length: nodes }, (_, i) =>
        reachable(nodes, edges, i + 1),
      );
      const strong = allReach.every((set) => set.size === nodes);
      const result = output("flight-routes-check", { nodes, edges });
      if (strong) expect(result).toBe("YES");
      else {
        const match = /^NO\n(\d+) (\d+)$/.exec(result);
        expect(match).not.toBeNull();
        const a = Number(match![1]),
          b = Number(match![2]);
        expect(allReach[a - 1].has(b)).toBe(false);
      }
    }
    expect(output("flight-routes-check", { nodes: 1, edges: [] })).toBe("YES");
  });

  it("rejects malformed, duplicate, self-loop, and out-of-bound graph input", () => {
    for (const id of [
      "building-roads",
      "course-schedule",
      "road-reparation",
      "flight-routes-check",
    ])
      expect(() => output(id, {}), id).toThrow();
    expect(() =>
      output("building-roads", {
        nodes: 2,
        edges: [
          [1, 2],
          [2, 1],
        ],
      }),
    ).toThrow();
    expect(() =>
      output("road-reparation", { nodes: 2, edges: [[1, 2, 0]] }),
    ).toThrow();
    expect(() =>
      output("course-schedule", { nodes: 2, edges: [[1, 1]] }),
    ).toThrow();
    expect(() =>
      output("flight-routes-check", { nodes: 2, edges: [[1, 3]] }),
    ).toThrow();
  });
});
