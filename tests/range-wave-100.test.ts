import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

function output(id: string, input: unknown) {
  const run = getProblem(id)!.run(input);
  try {
    return run.output;
  } finally {
    run.timeline.dispose();
  }
}
let seed = 1143;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
describe("independent dynamic range oracles", () => {
  const ids = [
    "hotel-queries",
    "list-removals",
    "prefix-sum-queries",
    "pizzeria-queries",
  ];
  it("matches official examples, validates input, and keeps executable reference snippets", () => {
    for (const id of ids) {
      const p = getProblem(id)!;
      for (const example of p.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
      expect(() => output(id, {})).toThrow();
    }
    expect(() =>
      output("list-removals", { values: [1, 2], positions: [2, 2] }),
    ).toThrow();
    expect(() =>
      output("prefix-sum-queries", { values: [1], queries: [[2, 1, 2]] }),
    ).toThrow();
    expect(() =>
      output("pizzeria-queries", { prices: [1], queries: [[1, 2, 3]] }),
    ).toThrow();
  });
  it("hotel-queries agrees with sequential first-fit scans", () => {
    for (let trial = 0; trial < 90; trial++) {
      const hotels = Array.from({ length: 1 + Math.floor(random() * 10) }, () =>
          Math.floor(random() * 16),
        ),
        groups = Array.from(
          { length: 1 + Math.floor(random() * 15) },
          () => 1 + Math.floor(random() * 18),
        ),
        free = [...hotels],
        answer: number[] = [];
      for (const need of groups) {
        const at = free.findIndex((x) => x >= need);
        answer.push(at + 1);
        if (at >= 0) free[at] -= need;
      }
      expect(output("hotel-queries", { hotels, groups })).toBe(
        answer.join(" "),
      );
    }
  });
  it("list-removals agrees with direct mutable list deletion", () => {
    for (let trial = 0; trial < 80; trial++) {
      const values = Array.from(
          { length: 1 + Math.floor(random() * 11) },
          () => 1 + Math.floor(random() * 100),
        ),
        left = [...values],
        positions: number[] = [],
        answer: number[] = [];
      while (left.length) {
        const rank = 1 + Math.floor(random() * left.length);
        positions.push(rank);
        answer.push(left.splice(rank - 1, 1)[0]);
      }
      expect(output("list-removals", { values, positions })).toBe(
        answer.join(" "),
      );
    }
  });
  it("prefix-sum-queries agrees with scanning each requested interval", () => {
    for (let trial = 0; trial < 90; trial++) {
      const values = Array.from(
          { length: 1 + Math.floor(random() * 10) },
          () => Math.floor(random() * 21) - 10,
        ),
        work = [...values],
        queries: number[][] = [],
        answer: number[] = [];
      for (let q = 0; q < 10; q++)
        if (random() < 0.45) {
          const at = 1 + Math.floor(random() * values.length),
            value = Math.floor(random() * 21) - 10;
          queries.push([1, at, value]);
          work[at - 1] = value;
        } else {
          const a = 1 + Math.floor(random() * values.length),
            b = a + Math.floor(random() * (values.length - a + 1));
          queries.push([2, a, b]);
          let sum = 0,
            best = 0;
          for (let i = a - 1; i < b; i++) {
            sum += work[i];
            best = Math.max(best, sum);
          }
          answer.push(best);
        }
      expect(output("prefix-sum-queries", { values, queries })).toBe(
        answer.join("\n"),
      );
    }
  });
  it("pizzeria-queries agrees with scanning every pizza price plus distance", () => {
    for (let trial = 0; trial < 90; trial++) {
      const prices = Array.from(
          { length: 1 + Math.floor(random() * 10) },
          () => 1 + Math.floor(random() * 30),
        ),
        work = [...prices],
        queries: number[][] = [],
        answer: number[] = [];
      for (let q = 0; q < 10; q++)
        if (random() < 0.45) {
          const k = 1 + Math.floor(random() * prices.length),
            value = 1 + Math.floor(random() * 30);
          queries.push([1, k, value]);
          work[k - 1] = value;
        } else {
          const k = 1 + Math.floor(random() * prices.length);
          queries.push([2, k]);
          answer.push(
            Math.min(...work.map((value, i) => value + Math.abs(i + 1 - k))),
          );
        }
      expect(output("pizzeria-queries", { prices, queries })).toBe(
        answer.join("\n"),
      );
    }
  });
});
