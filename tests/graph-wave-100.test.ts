import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

type Edge = [number, number];
type Weighted = [number, number, number];
function output(id: string, input: unknown) {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1669;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function undirected(n: number) {
  const edges: Edge[] = [];
  for (let a = 1; a <= n; a++)
    for (let b = a + 1; b <= n; b++) if (random() < 0.35) edges.push([a, b]);
  return edges;
}
function reach(n: number, edges: Edge[] | Weighted[]) {
  const r = Array.from({ length: n + 1 }, () =>
    Array<boolean>(n + 1).fill(false),
  );
  for (let i = 1; i <= n; i++) r[i][i] = true;
  for (const [a, b] of edges) r[a][b] = true;
  for (let k = 1; k <= n; k++)
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= n; j++) r[i][j] ||= r[i][k] && r[k][j];
  return r;
}
function weighted(n: number, positive = false) {
  const edges: Weighted[] = [];
  for (let a = 1; a <= n; a++)
    for (let b = 1; b <= n; b++)
      if (a !== b && random() < 0.34)
        edges.push([
          a,
          b,
          positive
            ? 1 + Math.floor(random() * 9)
            : Math.floor(random() * 17) - 8,
        ]);
  if (edges.length >= 24) edges.length = 23;
  if (!edges.some(([a, b]) => a === 1 && b === n))
    edges.push([
      1,
      n,
      positive ? 1 + Math.floor(random() * 9) : Math.floor(random() * 17) - 8,
    ]);
  return edges;
}
function validateCycle(nodes: number[], edges: Edge[], directed: boolean) {
  expect(nodes.length).toBeGreaterThanOrEqual(directed ? 2 : 4);
  expect(nodes[0]).toBe(nodes.at(-1));
  expect(new Set(nodes.slice(0, -1)).size).toBe(nodes.length - 1);
  for (let i = 1; i < nodes.length; i++)
    expect(
      edges.some(
        ([a, b]) =>
          (a === nodes[i - 1] && b === nodes[i]) ||
          (!directed && a === nodes[i] && b === nodes[i - 1]),
      ),
    ).toBe(true);
}

describe("independent graph wave oracles", () => {
  const ids = [
    "round-trip",
    "planets-queries-i",
    "planets-and-kingdoms",
    "cycle-finding",
    "flight-discount",
    "investigation",
    "high-score",
  ];
  it("matches examples and rejects malformed inputs", () => {
    for (const id of ids) {
      const p = getProblem(id)!;
      for (const example of p.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
      expect(() => output(id, {}), id).toThrow();
    }
    expect(() =>
      output("flight-discount", { nodes: 3, edges: [[1, 2, 3]] }),
    ).toThrow();
    expect(() =>
      output("planets-queries-i", { next: [2], queries: [[1, 1]] }),
    ).toThrow();
  });
  it("round-trip reports exactly a simple undirected cycle when one exists", () => {
    for (let trial = 0; trial < 90; trial++) {
      const nodes = 1 + Math.floor(random() * 8),
        edges = undirected(nodes),
        parent = Array.from({ length: nodes + 1 }, (_, i) => i);
      function root(x: number): number {
        return parent[x] === x ? x : (parent[x] = root(parent[x]));
      }
      let cyclic = false;
      for (const [a, b] of edges) {
        if (root(a) === root(b)) cyclic = true;
        else parent[root(a)] = root(b);
      }
      const result = output("round-trip", { nodes, edges });
      if (!cyclic) expect(result).toBe("IMPOSSIBLE");
      else {
        const [size, line] = result.split("\n"),
          path = line.split(" ").map(Number);
        expect(path.length).toBe(Number(size));
        validateCycle(path, edges, false);
      }
    }
  });
  it("planets-queries-i agrees with direct teleporter stepping and long-cycle reduction", () => {
    for (let trial = 0; trial < 80; trial++) {
      const nodes = 1 + Math.floor(random() * 10),
        next = Array.from(
          { length: nodes },
          () => 1 + Math.floor(random() * nodes),
        ),
        queries = Array.from({ length: 10 }, () => [
          1 + Math.floor(random() * nodes),
          Math.floor(random() * 100),
        ]),
        answers = queries.map(([start, k]) => {
          let at = start;
          for (let i = 0; i < k; i++) at = next[at - 1];
          return at;
        });
      expect(output("planets-queries-i", { next, queries })).toBe(
        answers.join("\n"),
      );
    }
    expect(
      output("planets-queries-i", {
        next: [2, 3, 1],
        queries: [[1, 1_000_000_000]],
      }),
    ).toBe("2");
  });
  it("planets-and-kingdoms partitions exactly mutually reachable pairs", () => {
    for (let trial = 0; trial < 80; trial++) {
      const nodes = 1 + Math.floor(random() * 8),
        edges: Edge[] = [];
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++)
          if (a !== b && random() < 0.3) edges.push([a, b]);
      const [count, line] = output("planets-and-kingdoms", {
          nodes,
          edges,
        }).split("\n"),
        labels = line.split(" ").map(Number),
        r = reach(nodes, edges);
      expect(new Set(labels).size).toBe(Number(count));
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++)
          expect(labels[a - 1] === labels[b - 1]).toBe(r[a][b] && r[b][a]);
    }
  });
  it("cycle-finding agrees with Floyd-Warshall negative diagonals and returns a negative directed cycle", () => {
    for (let trial = 0; trial < 85; trial++) {
      const nodes = 1 + Math.floor(random() * 7),
        edges = weighted(nodes),
        dist = Array.from({ length: nodes + 1 }, (_, i) =>
          Array.from({ length: nodes + 1 }, (_, j) => (i === j ? 0 : Infinity)),
        );
      for (const [a, b, w] of edges) dist[a][b] = Math.min(dist[a][b], w);
      for (let k = 1; k <= nodes; k++)
        for (let i = 1; i <= nodes; i++)
          for (let j = 1; j <= nodes; j++)
            dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
      const negative = Array.from(
          { length: nodes },
          (_, i) => dist[i + 1][i + 1],
        ).some((x) => x < 0),
        result = output("cycle-finding", { nodes, edges });
      if (!negative) expect(result).toBe("NO");
      else {
        const [yes, line] = result.split("\n"),
          path = line.split(" ").map(Number);
        expect(yes).toBe("YES");
        validateCycle(
          path,
          edges.map(([a, b]) => [a, b]),
          true,
        );
        let weight = 0;
        for (let i = 1; i < path.length; i++)
          weight += Math.min(
            ...edges
              .filter(([a, b]) => a === path[i - 1] && b === path[i])
              .map((edge) => edge[2]),
          );
        expect(weight).toBeLessThan(0);
      }
    }
  });
  it("flight-discount agrees with independent two-layer Bellman-Ford", () => {
    for (let trial = 0; trial < 70; trial++) {
      const nodes = 2 + Math.floor(random() * 7),
        edges = weighted(nodes, true),
        dist = Array.from({ length: 2 }, () =>
          Array<number>(nodes + 1).fill(Infinity),
        );
      dist[0][1] = 0;
      for (let pass = 0; pass < 2 * nodes; pass++)
        for (const [a, b, w] of edges) {
          dist[0][b] = Math.min(dist[0][b], dist[0][a] + w);
          dist[1][b] = Math.min(
            dist[1][b],
            dist[1][a] + w,
            dist[0][a] + Math.floor(w / 2),
          );
        }
      expect(output("flight-discount", { nodes, edges })).toBe(
        String(dist[1][nodes]),
      );
    }
  });
  it("investigation agrees with exhaustive positive-cost simple routes", () => {
    for (let trial = 0; trial < 65; trial++) {
      const nodes = 2 + Math.floor(random() * 6),
        edges = weighted(nodes, true),
        adj = Array.from({ length: nodes + 1 }, () => [] as [number, number][]);
      for (const [a, b, w] of edges) adj[a].push([b, w]);
      const routes: [number, number][] = [];
      function visit(node: number, mask: number, cost: number, hops: number) {
        if (node === nodes) {
          routes.push([cost, hops]);
          return;
        }
        for (const [next, w] of adj[node])
          if (!(mask & (1 << next)))
            visit(next, mask | (1 << next), cost + w, hops + 1);
      }
      visit(1, 1 << 1, 0, 0);
      const best = Math.min(...routes.map(([cost]) => cost)),
        short = routes.filter(([cost]) => cost === best),
        few = Math.min(...short.map(([, hops]) => hops)),
        many = Math.max(...short.map(([, hops]) => hops));
      expect(output("investigation", { nodes, edges })).toBe(
        `${best} ${short.length} ${few} ${many}`,
      );
    }
  });
  it("high-score agrees with exhaustive simple paths and reachable positive cycles", () => {
    for (let trial = 0; trial < 65; trial++) {
      const nodes = 2 + Math.floor(random() * 5),
        edges = weighted(nodes),
        r = reach(nodes, edges),
        adj = Array.from({ length: nodes + 1 }, () => [] as [number, number][]);
      for (const [a, b, w] of edges) adj[a].push([b, w]);
      let positive = false,
        best = -Infinity;
      function path(node: number, mask: number, score: number) {
        if (node === nodes) best = Math.max(best, score);
        for (const [next, w] of adj[node])
          if (!(mask & (1 << next))) path(next, mask | (1 << next), score + w);
      }
      path(1, 1 << 1, 0);
      for (let start = 1; start <= nodes; start++)
        if (r[1][start] && r[start][nodes]) {
          function cycle(node: number, mask: number, score: number) {
            for (const [next, w] of adj[node])
              if (next === start) {
                if (score + w > 0) positive = true;
              } else if (!(mask & (1 << next)))
                cycle(next, mask | (1 << next), score + w);
          }
          cycle(start, 1 << start, 0);
        }
      expect(output("high-score", { nodes, edges })).toBe(
        positive ? "-1" : String(best),
      );
    }
  });
});
