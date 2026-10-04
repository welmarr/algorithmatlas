import { describe, expect, it } from "vitest";
import { getProblem } from "@sim/problems";

function solve(id: string, input: unknown) {
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

describe("independent introductory CSES oracles and boundaries", () => {
  it("weird-algorithm follows the independently generated recurrence for all bounded starts", () => {
    for (let start = 1; start <= 30; start++) {
      const terms: number[] = [];
      function visit(value: number): void {
        terms.push(value);
        if (value > 1) visit(value & 1 ? 3 * value + 1 : value / 2);
      }
      visit(start);
      expect(solve("weird-algorithm", { n: start })).toBe(terms.join(" "));
    }
    expect(() => solve("weird-algorithm", { n: 31 })).toThrow();
  });

  it("missing-number finds each absent value and rejects duplicates", () => {
    for (let n = 2; n <= 33; n++)
      for (const missing of n <= 12
        ? Array.from({ length: n }, (_, i) => i + 1)
        : [...new Set([1, Math.floor(n / 2), n])]) {
        const values = Array.from({ length: n }, (_, i) => i + 1)
          .filter((value) => value !== missing)
          .reverse();
        expect(solve("missing-number", { n, values })).toBe(String(missing));
      }
    expect(() =>
      solve("missing-number", { n: 4, values: [1, 1, 3] }),
    ).toThrow();
  });

  it("repetitions matches exhaustive runs on seeded DNA strings", () => {
    const next = random(1069),
      letters = "ACGT";
    for (let trial = 0; trial < 150; trial++) {
      const sequence = Array.from(
        { length: 1 + Math.floor(next() * 35) },
        () => letters[Math.floor(next() * 4)],
      ).join("");
      let best = 0;
      for (let start = 0; start < sequence.length; start++)
        for (let end = start + 1; end <= sequence.length; end++)
          if (
            [...sequence.slice(start, end)].every(
              (char) => char === sequence[start],
            )
          )
            best = Math.max(best, end - start);
      expect(solve("repetitions", { sequence })).toBe(String(best));
    }
    expect(() => solve("repetitions", { sequence: "AB" })).toThrow();
  });

  it("permutations constructs every bounded valid length", () => {
    for (let n = 1; n <= 32; n++) {
      const output = solve("permutations", { n });
      if (n === 2 || n === 3) {
        expect(output).toBe("NO SOLUTION");
        continue;
      }
      const values = output.split(" ").map(Number);
      expect([...values].sort((a, b) => a - b)).toEqual(
        Array.from({ length: n }, (_, i) => i + 1),
      );
      expect(
        values.slice(1).every((value, i) => Math.abs(value - values[i]) !== 1),
      ).toBe(true);
    }
  });

  it("bit-strings agrees with exact BigInt powers modulo the CSES modulus", () => {
    for (let n = 1; n <= 64; n++)
      expect(solve("bit-strings", { n })).toBe(
        String((1n << BigInt(n)) % 1_000_000_007n),
      );
  });

  it("trailing-zeros agrees with direct factorization on small factorials", () => {
    let factors = 0;
    for (let n = 1; n <= 250; n++) {
      let value = n;
      while (value % 5 === 0) {
        factors++;
        value /= 5;
      }
      expect(solve("trailing-zeros", { n })).toBe(String(factors));
    }
    expect(solve("trailing-zeros", { n: 1_000_000_000 })).toBe("249999998");
  });

  it("coin-piles agrees with exhaustive legal moves on small piles", () => {
    const memo = new Map<string, boolean>();
    function reachable(a: number, b: number): boolean {
      if (a === 0 && b === 0) return true;
      const key = `${a},${b}`;
      if (!memo.has(key))
        memo.set(
          key,
          (a >= 1 && b >= 2 && reachable(a - 1, b - 2)) ||
            (a >= 2 && b >= 1 && reachable(a - 2, b - 1)),
        );
      return memo.get(key)!;
    }
    const piles: [number, number][] = [];
    for (let a = 0; a <= 12; a++)
      for (let b = 0; b <= 12; b++) piles.push([a, b]);
    for (let i = 0; i < piles.length; i += 32) {
      const batch = piles.slice(i, i + 32);
      expect(solve("coin-piles", { piles: batch }).split("\n")).toEqual(
        batch.map(([a, b]) => (reachable(a, b) ? "YES" : "NO")),
      );
    }
  });

  it("two-knights agrees with direct pair enumeration on small boards", () => {
    const expected: number[] = [];
    for (let n = 1; n <= 7; n++) {
      let count = 0;
      for (let a = 0; a < n * n; a++)
        for (let b = a + 1; b < n * n; b++) {
          const dr = Math.abs(Math.floor(a / n) - Math.floor(b / n));
          const dc = Math.abs((a % n) - (b % n));
          if (!(dr === 1 && dc === 2) && !(dr === 2 && dc === 1)) count++;
        }
      expected.push(count);
      expect(solve("two-knights", { n }).split("\n").map(Number)).toEqual(
        expected,
      );
    }
  });

  it("two-sets agrees with subset-sum feasibility and produces a valid partition", () => {
    for (let n = 1; n <= 32; n++) {
      const output = solve("two-sets", { n });
      const total = (n * (n + 1)) / 2;
      if (n <= 14) {
        let feasible = false;
        for (let mask = 0; mask < 2 ** n; mask++) {
          let sum = 0;
          for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += i + 1;
          if (sum * 2 === total) {
            feasible = true;
            break;
          }
        }
        expect(output !== "NO").toBe(feasible);
      }
      if (total % 2) {
        expect(output).toBe("NO");
        continue;
      }
      const [yes, firstCount, firstLine, secondCount, secondLine] =
        output.split("\n");
      const first = firstLine.split(" ").map(Number),
        second = secondLine.split(" ").map(Number);
      expect(yes).toBe("YES");
      expect(first.length).toBe(Number(firstCount));
      expect(second.length).toBe(Number(secondCount));
      expect([...first, ...second].sort((a, b) => a - b)).toEqual(
        Array.from({ length: n }, (_, i) => i + 1),
      );
      expect(first.reduce((a, b) => a + b, 0)).toBe(
        second.reduce((a, b) => a + b, 0),
      );
    }
  });

  it("number-spiral matches a directly built square spiral", () => {
    const grid = Array.from({ length: 8 }, () => Array<number>(8).fill(0));
    grid[0][0] = 1;
    let value = 1;
    for (let layer = 2; layer <= 8; layer++) {
      if (layer % 2 === 0) {
        for (let row = 0; row < layer; row++) grid[row][layer - 1] = ++value;
        for (let col = layer - 2; col >= 0; col--)
          grid[layer - 1][col] = ++value;
      } else {
        for (let col = 0; col < layer; col++) grid[layer - 1][col] = ++value;
        for (let row = layer - 2; row >= 0; row--)
          grid[row][layer - 1] = ++value;
      }
    }
    const positions: [number, number][] = [];
    for (let y = 1; y <= 8; y++)
      for (let x = 1; x <= 8; x++) positions.push([y, x]);
    for (let i = 0; i < positions.length; i += 32) {
      const batch = positions.slice(i, i + 32);
      expect(
        solve("number-spiral", { positions: batch }).split("\n").map(Number),
      ).toEqual(batch.map(([y, x]) => grid[y - 1][x - 1]));
    }
    expect(solve("number-spiral", { positions: [[100_000, 100_000]] })).toBe(
      "9999900001",
    );
  });

  it("rejects malformed or oversized input for every new problem", () => {
    for (const id of [
      "weird-algorithm",
      "missing-number",
      "repetitions",
      "permutations",
      "bit-strings",
      "trailing-zeros",
      "coin-piles",
      "two-knights",
      "two-sets",
      "number-spiral",
    ])
      expect(() => solve(id, {}), id).toThrow();
    expect(() => solve("coin-piles", { piles: [[-1, 2]] })).toThrow();
    expect(() => solve("number-spiral", { positions: [[0, 1]] })).toThrow();
  });
});
