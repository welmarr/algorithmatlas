import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

type Pair = [number, number];
type Triple = [number, number, number];
type Update = [1, number, number, number] | [2, number];
function output(id: string, input: unknown) {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1647;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function valuesAndQueries() {
  const n = 1 + Math.floor(random() * 12),
    values = Array.from({ length: n }, () => 1 + Math.floor(random() * 100));
  const queries: Pair[] = Array.from({ length: 5 }, () => {
    const a = 1 + Math.floor(random() * n),
      b = 1 + Math.floor(random() * n);
    return [Math.min(a, b), Math.max(a, b)];
  });
  return { values, queries };
}

describe("independent range-query oracles", () => {
  it("matches all published examples", () => {
    for (const id of [
      "static-range-minimum",
      "dynamic-range-minimum",
      "range-xor-queries",
      "range-update-queries",
      "forest-queries",
    ]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("static minima and XOR equal direct range scans", () => {
    for (let trial = 0; trial < 45; trial++) {
      const { values, queries } = valuesAndQueries();
      expect(output("static-range-minimum", { values, queries })).toBe(
        queries.map(([a, b]) => Math.min(...values.slice(a - 1, b))).join("\n"),
      );
      expect(output("range-xor-queries", { values, queries })).toBe(
        queries
          .map(([a, b]) => values.slice(a - 1, b).reduce((x, y) => x ^ y, 0))
          .join("\n"),
      );
    }
  });

  it("dynamic minima agree with a naive mutable array", () => {
    for (let trial = 0; trial < 45; trial++) {
      const { values } = valuesAndQueries(),
        current = values.slice(),
        operations: Triple[] = [],
        expected: number[] = [];
      for (let i = 0; i < 8; i++) {
        if (i % 3 === 0) {
          const at = 1 + Math.floor(random() * values.length),
            value = 1 + Math.floor(random() * 100);
          operations.push([1, at, value]);
          current[at - 1] = value;
        } else {
          const a = 1 + Math.floor(random() * values.length),
            b = 1 + Math.floor(random() * values.length),
            left = Math.min(a, b),
            right = Math.max(a, b);
          operations.push([2, left, right]);
          expected.push(Math.min(...current.slice(left - 1, right)));
        }
      }
      expect(output("dynamic-range-minimum", { values, operations })).toBe(
        expected.join("\n"),
      );
    }
  });

  it("range increments and point queries equal direct array updates", () => {
    for (let trial = 0; trial < 45; trial++) {
      const { values } = valuesAndQueries(),
        current = values.slice(),
        operations: Update[] = [],
        expected: number[] = [];
      for (let i = 0; i < 8; i++) {
        if (i % 3 === 0) {
          const a = 1 + Math.floor(random() * values.length),
            b = 1 + Math.floor(random() * values.length),
            left = Math.min(a, b),
            right = Math.max(a, b),
            delta = 1 + Math.floor(random() * 20);
          operations.push([1, left, right, delta]);
          for (let k = left - 1; k < right; k++) current[k] += delta;
        } else {
          const at = 1 + Math.floor(random() * values.length);
          operations.push([2, at]);
          expected.push(current[at - 1]);
        }
      }
      expect(output("range-update-queries", { values, operations })).toBe(
        expected.join("\n"),
      );
    }
  });

  it("forest rectangle counts match direct cell enumeration", () => {
    for (let trial = 0; trial < 45; trial++) {
      const n = 1 + Math.floor(random() * 7),
        rows = Array.from({ length: n }, () =>
          Array.from({ length: n }, () => (random() < 0.4 ? "*" : ".")).join(
            "",
          ),
        );
      const queries: [number, number, number, number][] = Array.from(
        { length: 5 },
        () => {
          const y1 = 1 + Math.floor(random() * n),
            y2 = 1 + Math.floor(random() * n),
            x1 = 1 + Math.floor(random() * n),
            x2 = 1 + Math.floor(random() * n);
          return [
            Math.min(y1, y2),
            Math.min(x1, x2),
            Math.max(y1, y2),
            Math.max(x1, x2),
          ];
        },
      );
      const expected = queries.map(([y1, x1, y2, x2]) => {
        let count = 0;
        for (let y = y1 - 1; y < y2; y++)
          for (let x = x1 - 1; x < x2; x++) if (rows[y][x] === "*") count++;
        return count;
      });
      expect(output("forest-queries", { rows, queries })).toBe(
        expected.join("\n"),
      );
    }
  });

  it("rejects invalid ranges, updates, and forest shapes", () => {
    for (const id of [
      "static-range-minimum",
      "dynamic-range-minimum",
      "range-xor-queries",
      "range-update-queries",
      "forest-queries",
    ])
      expect(() => output(id, {}), id).toThrow();
    expect(() =>
      output("static-range-minimum", { values: [1, 2], queries: [[2, 1]] }),
    ).toThrow();
    expect(() =>
      output("dynamic-range-minimum", { values: [1], operations: [[1, 1, 2]] }),
    ).toThrow();
    expect(() =>
      output("range-update-queries", {
        values: [1],
        operations: [[1, 1, 2, 1]],
      }),
    ).toThrow();
    expect(() =>
      output("forest-queries", { rows: [".*", "."], queries: [[1, 1, 2, 2]] }),
    ).toThrow();
  });
});
