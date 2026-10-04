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
const next = random(1634);

describe("independent dynamic-programming oracles", () => {
  it("minimizing-coins matches breadth-first search over reachable sums", () => {
    for (let trial = 0; trial < 40; trial++) {
      const coins = [
        ...new Set(
          Array.from(
            { length: 1 + Math.floor(next() * 5) },
            () => 1 + Math.floor(next() * 12),
          ),
        ),
      ];
      const target = 1 + Math.floor(next() * 25),
        queue: Array<[number, number]> = [[0, 0]],
        seen = new Set([0]);
      let best = -1;
      for (let head = 0; head < queue.length; head++) {
        const [sum, steps] = queue[head];
        if (sum === target) {
          best = steps;
          break;
        }
        for (const coin of coins)
          if (sum + coin <= target && !seen.has(sum + coin)) {
            seen.add(sum + coin);
            queue.push([sum + coin, steps + 1]);
          }
      }
      expect(output("minimizing-coins", { coins, target })).toBe(String(best));
    }
  });

  it("coin-combinations-i matches direct ordered-sequence enumeration", () => {
    for (let trial = 0; trial < 35; trial++) {
      const coins = [
        ...new Set(
          Array.from(
            { length: 1 + Math.floor(next() * 4) },
            () => 1 + Math.floor(next() * 8),
          ),
        ),
      ];
      const target = 1 + Math.floor(next() * 12);
      function count(remaining: number): number {
        if (remaining === 0) return 1;
        let ways = 0;
        for (const coin of coins)
          if (coin <= remaining) ways += count(remaining - coin);
        return ways;
      }
      expect(output("coin-combinations-i", { coins, target })).toBe(
        String(count(target)),
      );
    }
  });

  it("coin-combinations-ii matches exhaustive multiset counts", () => {
    for (let trial = 0; trial < 35; trial++) {
      const coins = [
        ...new Set(
          Array.from(
            { length: 1 + Math.floor(next() * 4) },
            () => 1 + Math.floor(next() * 8),
          ),
        ),
      ];
      const target = 1 + Math.floor(next() * 15);
      function count(index: number, remaining: number): number {
        if (index === coins.length) return remaining === 0 ? 1 : 0;
        let ways = 0;
        for (let copies = 0; copies * coins[index] <= remaining; copies++)
          ways += count(index + 1, remaining - copies * coins[index]);
        return ways;
      }
      expect(output("coin-combinations-ii", { coins, target })).toBe(
        String(count(0, target)),
      );
    }
  });

  it("removing-digits matches breadth-first shortest paths", () => {
    for (let n = 1; n <= 64; n++) {
      const queue: Array<[number, number]> = [[n, 0]],
        seen = new Set([n]);
      let best = -1;
      for (let head = 0; head < queue.length; head++) {
        const [value, steps] = queue[head];
        if (value === 0) {
          best = steps;
          break;
        }
        for (const char of String(value)) {
          const nextValue = value - Number(char);
          if (nextValue < value && !seen.has(nextValue)) {
            seen.add(nextValue);
            queue.push([nextValue, steps + 1]);
          }
        }
      }
      expect(output("removing-digits", { n })).toBe(String(best));
    }
  }, 15_000);

  it("book-shop matches exhaustive subsets, including empty purchase", () => {
    for (let trial = 0; trial < 40; trial++) {
      const n = 1 + Math.floor(next() * 7),
        prices = Array.from({ length: n }, () => 1 + Math.floor(next() * 15));
      const pages = Array.from(
          { length: n },
          () => 1 + Math.floor(next() * 30),
        ),
        budget = 1 + Math.floor(next() * 35);
      let best = 0;
      for (let mask = 0; mask < 2 ** n; mask++) {
        let cost = 0,
          total = 0;
        for (let i = 0; i < n; i++)
          if (mask & (1 << i)) {
            cost += prices[i];
            total += pages[i];
          }
        if (cost <= budget) best = Math.max(best, total);
      }
      expect(output("book-shop", { prices, pages, budget })).toBe(String(best));
    }
  });

  it("grid-paths-i matches direct right/down path enumeration", () => {
    for (let trial = 0; trial < 35; trial++) {
      const n = 1 + Math.floor(next() * 5),
        rows = Array.from({ length: n }, () =>
          Array.from({ length: n }, () => (next() < 0.25 ? "*" : ".")).join(""),
        );
      function count(r: number, c: number): number {
        if (r >= n || c >= n || rows[r][c] === "*") return 0;
        if (r === n - 1 && c === n - 1) return 1;
        return count(r + 1, c) + count(r, c + 1);
      }
      expect(output("grid-paths-i", { rows })).toBe(String(count(0, 0)));
    }
  });

  it("money-sums matches all nonempty subsets", () => {
    for (let trial = 0; trial < 35; trial++) {
      const coins = Array.from(
        { length: 1 + Math.floor(next() * 8) },
        () => 1 + Math.floor(next() * 12),
      );
      const sums = new Set<number>();
      for (let mask = 1; mask < 2 ** coins.length; mask++) {
        let sum = 0;
        for (let i = 0; i < coins.length; i++)
          if (mask & (1 << i)) sum += coins[i];
        sums.add(sum);
      }
      const ordered = [...sums].sort((a, b) => a - b);
      expect(output("money-sums", { coins })).toBe(
        `${ordered.length}\n${ordered.join(" ")}`,
      );
    }
  });

  it("two-sets-ii counts each equal partition once", () => {
    for (let n = 1; n <= 12; n++) {
      const total = (n * (n + 1)) / 2;
      let count = 0;
      if (total % 2 === 0)
        for (let mask = 0; mask < 2 ** (n - 1); mask++) {
          let sum = 0;
          for (let value = 1; value < n; value++)
            if (mask & (1 << (value - 1))) sum += value;
          if (sum * 2 === total) count++;
        }
      expect(output("two-sets-ii", { n })).toBe(String(count));
    }
  });

  it("increasing-subsequence agrees with exhaustive order-preserving subsets", () => {
    for (let trial = 0; trial < 45; trial++) {
      const values = Array.from(
        { length: 1 + Math.floor(next() * 10) },
        () => 1 + Math.floor(next() * 15),
      );
      let best = 0;
      for (let mask = 1; mask < 2 ** values.length; mask++) {
        let last = -Infinity,
          length = 0,
          valid = true;
        for (let i = 0; i < values.length; i++)
          if (mask & (1 << i)) {
            if (values[i] <= last) {
              valid = false;
              break;
            }
            last = values[i];
            length++;
          }
        if (valid) best = Math.max(best, length);
      }
      expect(output("increasing-subsequence", { values })).toBe(String(best));
    }
  });

  it("rectangle-cutting agrees with recursive first-cut exploration", () => {
    const memo = new Map<string, number>();
    function cuts(a: number, b: number): number {
      if (a === b) return 0;
      const key = `${a},${b}`;
      if (!memo.has(key)) {
        let best = Infinity;
        for (let h = 1; h < a; h++)
          best = Math.min(best, 1 + cuts(h, b) + cuts(a - h, b));
        for (let w = 1; w < b; w++)
          best = Math.min(best, 1 + cuts(a, w) + cuts(a, b - w));
        memo.set(key, best);
      }
      return memo.get(key)!;
    }
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        expect(output("rectangle-cutting", { a, b })).toBe(String(cuts(a, b)));
  });

  it("array-description matches exhaustive filling of unknown positions", () => {
    for (let trial = 0; trial < 40; trial++) {
      const maxValue = 1 + Math.floor(next() * 4),
        values = Array.from({ length: 1 + Math.floor(next() * 7) }, () =>
          next() < 0.55 ? 0 : 1 + Math.floor(next() * maxValue),
        );
      function count(index: number, last: number): number {
        if (index === values.length) return 1;
        let ways = 0;
        for (let value = 1; value <= maxValue; value++)
          if (
            (values[index] === 0 || values[index] === value) &&
            (index === 0 || Math.abs(value - last) <= 1)
          )
            ways += count(index + 1, value);
        return ways;
      }
      expect(output("array-description", { values, maxValue })).toBe(
        String(count(0, 0)),
      );
    }
  });

  it("rejects invalid inputs across the new DP family", () => {
    for (const id of [
      "minimizing-coins",
      "coin-combinations-i",
      "coin-combinations-ii",
      "removing-digits",
      "book-shop",
      "grid-paths-i",
      "money-sums",
      "two-sets-ii",
      "increasing-subsequence",
      "rectangle-cutting",
      "array-description",
    ])
      expect(() => output(id, {}), id).toThrow();
    expect(() =>
      output("minimizing-coins", { coins: [1, 1], target: 4 }),
    ).toThrow();
    expect(() => output("grid-paths-i", { rows: ["..", "."] })).toThrow();
  });
});
