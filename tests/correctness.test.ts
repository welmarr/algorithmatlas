import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

describe("curated algorithm correctness", () => {
  it("matches recursive dice counts on small targets", () => {
    function count(remaining: number): number {
      if (remaining === 0) return 1;
      let total = 0;
      for (let die = 1; die <= 6 && die <= remaining; die++)
        total += count(remaining - die);
      return total;
    }
    const problem = getProblem("dice-combinations")!;
    for (let target = 0; target <= 12; target++)
      expect(Number(problem.run({ target }).output)).toBe(count(target));
  });

  it("returns shortest valid message routes on seeded random graphs", () => {
    const next = random(39),
      problem = getProblem("message-route")!;
    for (let trial = 0; trial < 100; trial++) {
      const n = 2 + Math.floor(next() * 7),
        nodes = Array.from({ length: n }, (_, i) => String(i));
      const edges: [string, string][] = [];
      const distance = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
      );
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++)
          if (next() < 0.4) {
            edges.push([String(a), String(b)]);
            distance[a][b] = 1;
            distance[b][a] = 1;
          }
      for (let k = 0; k < n; k++)
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            distance[i][j] = Math.min(
              distance[i][j],
              distance[i][k] + distance[k][j],
            );
      const output = problem.run({
        nodes,
        edges,
        source: "0",
        target: String(n - 1),
      }).output;
      if (!Number.isFinite(distance[0][n - 1])) expect(output).toBe("No route");
      else {
        const path = output.split(" → ");
        expect(path[0]).toBe("0");
        expect(path.at(-1)).toBe(String(n - 1));
        expect(path.length - 1).toBe(distance[0][n - 1]);
        for (let i = 1; i < path.length; i++)
          expect(
            edges.some(
              ([a, b]) =>
                (a === path[i - 1] && b === path[i]) ||
                (b === path[i - 1] && a === path[i]),
            ),
          ).toBe(true);
      }
    }
  });

  it("matches all-pairs tree diameter on seeded trees", () => {
    const next = random(2026),
      problem = getProblem("tree-diameter")!;
    for (let trial = 0; trial < 100; trial++) {
      const n = 2 + Math.floor(next() * 12),
        nodes = Array.from({ length: n }, (_, i) => String(i));
      const edges: [string, string][] = nodes
        .slice(1)
        .map((node, i) => [node, String(Math.floor(next() * (i + 1)))]);
      const adjacency = Array.from({ length: n }, () => [] as number[]);
      for (const [a, b] of edges) {
        adjacency[Number(a)].push(Number(b));
        adjacency[Number(b)].push(Number(a));
      }
      let expected = 0;
      for (let source = 0; source < n; source++) {
        const distances = Array(n).fill(-1) as number[],
          queue = [source];
        distances[source] = 0;
        while (queue.length) {
          const node = queue.shift()!;
          for (const neighbor of adjacency[node])
            if (distances[neighbor] === -1) {
              distances[neighbor] = distances[node] + 1;
              queue.push(neighbor);
            }
        }
        expected = Math.max(expected, ...distances);
      }
      expect(problem.run({ nodes, edges }).output).toBe(`${expected} edges`);
    }
  });

  it("matches relaxation-based shortest grid distances", () => {
    const next = random(711),
      problem = getProblem("labyrinth")!;
    for (let trial = 0; trial < 60; trial++) {
      const h = 2 + Math.floor(next() * 4),
        w = 2 + Math.floor(next() * 4);
      const cells: string[][] = Array.from({ length: h }, () =>
        Array.from({ length: w }, () => (next() < 0.25 ? "#" : ".")),
      );
      cells[0][0] = "A";
      cells[h - 1][w - 1] = "B";
      const dist = Array.from(
        { length: h },
        () => Array(w).fill(Infinity) as number[],
      );
      dist[0][0] = 0;
      for (let pass = 0; pass < h * w; pass++)
        for (let r = 0; r < h; r++)
          for (let c = 0; c < w; c++) {
            if (cells[r][c] === "#") continue;
            for (const [dr, dc] of [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ]) {
              const nr = r + dr,
                nc = c + dc;
              if (
                nr >= 0 &&
                nr < h &&
                nc >= 0 &&
                nc < w &&
                cells[nr][nc] !== "#"
              )
                dist[r][c] = Math.min(dist[r][c], dist[nr][nc] + 1);
            }
          }
      const expected = dist[h - 1][w - 1];
      expect(
        problem.run({ rows: cells.map((row) => row.join("")) }).output,
      ).toBe(Number.isFinite(expected) ? `${expected} steps` : "No path");
    }
  });
});
