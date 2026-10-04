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
function random(seed: number) {
  let state = seed >>> 0;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
const next = random(1643);
const sample = (length: number, min: number, max: number) =>
  Array.from({ length }, () => min + Math.floor(next() * (max - min + 1)));

describe("independent sorting and searching oracles", () => {
  it("maximum-subarray-sum includes all-negative and singleton blocks", () => {
    expect(output("maximum-subarray-sum", { values: [-8, -3, -5] })).toBe("-3");
    for (let trial = 0; trial < 60; trial++) {
      const values = sample(1 + Math.floor(next() * 10), -15, 15);
      let best = -Infinity;
      for (let a = 0; a < values.length; a++) {
        let sum = 0;
        for (let b = a; b < values.length; b++) {
          sum += values[b];
          best = Math.max(best, sum);
        }
      }
      expect(output("maximum-subarray-sum", { values })).toBe(String(best));
    }
  });

  it("stick-lengths agrees with exhaustive target lengths", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 9), 1, 20);
      let best = Infinity;
      for (let target = 1; target <= 20; target++)
        best = Math.min(
          best,
          values.reduce((sum, value) => sum + Math.abs(value - target), 0),
        );
      expect(output("stick-lengths", { values })).toBe(String(best));
    }
  });

  it("missing-coin-sum agrees with explicit subset sums", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 9), 1, 12);
      const sums = new Set([0]);
      for (const coin of values)
        for (const existing of [...sums]) sums.add(existing + coin);
      let first = 1;
      while (sums.has(first)) first++;
      expect(output("missing-coin-sum", { values })).toBe(String(first));
    }
  });

  it("collecting-numbers agrees with a direct pass simulation", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = Array.from(
        { length: 1 + Math.floor(next() * 10) },
        (_, i) => i + 1,
      );
      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      let want = 1,
        rounds = 0;
      while (want <= values.length) {
        rounds++;
        for (const value of values) if (value === want) want++;
      }
      expect(output("collecting-numbers", { values })).toBe(String(rounds));
    }
    expect(() => output("collecting-numbers", { values: [1, 1] })).toThrow();
  });

  it("playlist agrees with exhaustive unique stretches", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 11), 1, 6);
      let best = 0;
      for (let a = 0; a < values.length; a++) {
        const seen = new Set<number>();
        for (let b = a; b < values.length; b++) {
          if (seen.has(values[b])) break;
          seen.add(values[b]);
          best = Math.max(best, b - a + 1);
        }
      }
      expect(output("playlist", { values })).toBe(String(best));
    }
  });

  it("nearest-smaller-values agrees with reverse scanning", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 12), 1, 15);
      const expected = values.map((value, i) => {
        for (let j = i - 1; j >= 0; j--) if (values[j] < value) return j + 1;
        return 0;
      });
      expect(output("nearest-smaller-values", { values })).toBe(
        expected.join(" "),
      );
    }
  });

  it("subarray-sums-i agrees with exhaustive positive windows", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 11), 1, 12),
        target = 1 + Math.floor(next() * 22);
      let count = 0;
      for (let a = 0; a < values.length; a++) {
        let sum = 0;
        for (let b = a; b < values.length; b++) {
          sum += values[b];
          if (sum === target) count++;
        }
      }
      expect(output("subarray-sums-i", { values, target })).toBe(String(count));
    }
  });

  it("subarray-sums-ii agrees with exhaustive signed windows", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 11), -8, 8),
        target = Math.floor(next() * 21) - 10;
      let count = 0;
      for (let a = 0; a < values.length; a++) {
        let sum = 0;
        for (let b = a; b < values.length; b++) {
          sum += values[b];
          if (sum === target) count++;
        }
      }
      expect(output("subarray-sums-ii", { values, target })).toBe(
        String(count),
      );
    }
  });

  it("subarray-divisibility agrees with direct modular sums", () => {
    for (let trial = 0; trial < 50; trial++) {
      const values = sample(1 + Math.floor(next() * 11), -8, 8);
      let count = 0;
      for (let a = 0; a < values.length; a++) {
        let sum = 0;
        for (let b = a; b < values.length; b++) {
          sum += values[b];
          if (sum % values.length === 0) count++;
        }
      }
      expect(output("subarray-divisibility", { values })).toBe(String(count));
    }
  });

  it("rejects malformed input for every entry", () => {
    for (const id of [
      "maximum-subarray-sum",
      "stick-lengths",
      "missing-coin-sum",
      "collecting-numbers",
      "playlist",
      "nearest-smaller-values",
      "subarray-sums-i",
      "subarray-sums-ii",
      "subarray-divisibility",
    ])
      expect(() => output(id, {}), id).toThrow();
  });
});
