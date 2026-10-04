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
let seed = 1688;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function sampleTree(n: number) {
  const parents = Array.from(
      { length: n - 1 },
      (_, i) => 1 + Math.floor(random() * (i + 1)),
    ),
    edges = parents.map((p, i) => [p, i + 2] as Edge);
  return { parents, edges };
}
function adjacency(n: number, edges: Edge[]) {
  const result = Array.from({ length: n + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    result[a].push(b);
    result[b].push(a);
  }
  return result;
}
function rooted(n: number, edges: Edge[]) {
  const adj = adjacency(n, edges),
    parent = Array<number>(n + 1).fill(0),
    depth = Array<number>(n + 1).fill(0),
    order = [1];
  for (let i = 0; i < order.length; i++)
    for (const next of adj[order[i]])
      if (next !== parent[order[i]]) {
        parent[next] = order[i];
        depth[next] = depth[order[i]] + 1;
        order.push(next);
      }
  return { adj, parent, depth };
}
function descendants(node: number, parent: number[]) {
  const answer: number[] = [];
  for (let at = 1; at < parent.length; at++) {
    let cursor = at;
    while (cursor && cursor !== node) cursor = parent[cursor];
    if (cursor === node) answer.push(at);
  }
  return answer;
}

describe("independent tree-wave oracles", () => {
  const ids = [
    "company-queries-ii",
    "distance-queries",
    "finding-a-centroid",
    "subtree-queries",
    "distinct-colors",
  ];
  it("matches fixtures and rejects invalid trees and queries", () => {
    for (const id of ids) {
      const p = getProblem(id)!;
      for (const example of p.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
      expect(() => output(id, {})).toThrow();
    }
    expect(() =>
      output("company-queries-ii", {
        nodes: 3,
        parents: [2, 1],
        queries: [[1, 2]],
      }),
    ).toThrow();
    expect(() =>
      output("distance-queries", {
        nodes: 3,
        edges: [
          [1, 2],
          [1, 2],
        ],
        queries: [[1, 2]],
      }),
    ).toThrow();
  });
  it("company LCA agrees with parent-chain intersection", () => {
    for (let trial = 0; trial < 75; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        { parents, edges } = sampleTree(nodes),
        { parent } = rooted(nodes, edges),
        queries = Array.from({ length: 8 }, () => [
          1 + Math.floor(random() * nodes),
          1 + Math.floor(random() * nodes),
        ]),
        answers = queries.map(([a, b]) => {
          const seen = new Set<number>();
          for (let at = a; at; at = parent[at]) seen.add(at);
          for (let at = b; at; at = parent[at]) if (seen.has(at)) return at;
          throw new Error("No root");
        });
      expect(output("company-queries-ii", { nodes, parents, queries })).toBe(
        answers.join("\n"),
      );
    }
  });
  it("distance agrees with breadth-first path lengths", () => {
    for (let trial = 0; trial < 75; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        { edges } = sampleTree(nodes),
        adj = adjacency(nodes, edges),
        queries = Array.from({ length: 8 }, () => [
          1 + Math.floor(random() * nodes),
          1 + Math.floor(random() * nodes),
        ]),
        answers = queries.map(([a, b]) => {
          const dist = Array<number>(nodes + 1).fill(-1),
            queue = [a];
          dist[a] = 0;
          for (let i = 0; i < queue.length; i++)
            for (const next of adj[queue[i]])
              if (dist[next] < 0) {
                dist[next] = dist[queue[i]] + 1;
                queue.push(next);
              }
          return dist[b];
        });
      expect(output("distance-queries", { nodes, edges, queries })).toBe(
        answers.join("\n"),
      );
    }
  });
  it("centroid leaves no component larger than half, including even two-centroid trees", () => {
    for (let trial = 0; trial < 90; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        { edges } = sampleTree(nodes),
        adj = adjacency(nodes, edges),
        answer = Number(output("finding-a-centroid", { nodes, edges }));
      expect(answer).toBeGreaterThanOrEqual(1);
      expect(answer).toBeLessThanOrEqual(nodes);
      for (const neighbor of adj[answer]) {
        const seen = new Set([answer, neighbor]),
          queue = [neighbor];
        for (let i = 0; i < queue.length; i++)
          for (const next of adj[queue[i]])
            if (!seen.has(next)) {
              seen.add(next);
              queue.push(next);
            }
        expect(queue.length).toBeLessThanOrEqual(Math.floor(nodes / 2));
      }
    }
  });
  it("subtree updates and sums agree with direct descendant scans", () => {
    for (let trial = 0; trial < 75; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        { edges } = sampleTree(nodes),
        { parent } = rooted(nodes, edges),
        values = Array.from(
          { length: nodes },
          () => 1 + Math.floor(random() * 20),
        ),
        work = [...values],
        queries: number[][] = [],
        answers: number[] = [];
      for (let q = 0; q < 12; q++) {
        const node = 1 + Math.floor(random() * nodes);
        if (random() < 0.5) {
          const value = 1 + Math.floor(random() * 20);
          queries.push([1, node, value]);
          work[node - 1] = value;
        } else {
          queries.push([2, node]);
          answers.push(
            descendants(node, parent).reduce(
              (sum, at) => sum + work[at - 1],
              0,
            ),
          );
        }
      }
      expect(output("subtree-queries", { nodes, edges, values, queries })).toBe(
        answers.join("\n"),
      );
    }
  });
  it("distinct colors agrees with subtree color sets", () => {
    for (let trial = 0; trial < 90; trial++) {
      const nodes = 1 + Math.floor(random() * 11),
        { edges } = sampleTree(nodes),
        { parent } = rooted(nodes, edges),
        colors = Array.from(
          { length: nodes },
          () => 1 + Math.floor(random() * 5),
        ),
        answers = Array.from(
          { length: nodes },
          (_, i) =>
            new Set(descendants(i + 1, parent).map((at) => colors[at - 1]))
              .size,
        );
      expect(output("distinct-colors", { nodes, edges, colors })).toBe(
        answers.join(" "),
      );
    }
  });
});
