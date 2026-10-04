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
let seed = 1079;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

describe("independent mathematics oracles", () => {
  const ids = [
    "exponentiation-ii",
    "fibonacci-numbers",
    "counting-divisors",
    "common-divisors",
    "binomial-coefficients",
    "creating-strings-ii",
    "distributing-apples",
  ];
  it("matches published fixtures and rejects malformed input", () => {
    for (const id of ids) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
      expect(() => output(id, {}), id).toThrow();
    }
    expect(() =>
      output("binomial-coefficients", { queries: [[2, 3]] }),
    ).toThrow();
    expect(() => output("creating-strings-ii", { text: "Aa" })).toThrow();
    expect(() =>
      output("distributing-apples", { children: 0, apples: 2 }),
    ).toThrow();
  });
  it("exponentiation-ii agrees with direct nested powers on small cases and zero-base edges", () => {
    const MOD = 1_000_000_007n;
    for (let a = 0; a <= 8; a++)
      for (let b = 0; b <= 5; b++)
        for (let c = 0; c <= 3; c++) {
          const exponent = BigInt(b) ** BigInt(c);
          const expected = String(BigInt(a) ** exponent % MOD);
          expect(
            output("exponentiation-ii", { queries: [[a, b, c]] }),
            `${a},${b},${c}`,
          ).toBe(expected);
        }
    expect(
      output("exponentiation-ii", {
        queries: [
          [0, 0, 1],
          [0, 0, 0],
        ],
      }),
    ).toBe("1\n0");
  });
  it("fibonacci-numbers agrees with linear recurrence including zero", () => {
    let a = 0,
      b = 1;
    for (let n = 0; n <= 120; n++) {
      expect(output("fibonacci-numbers", { index: n }), String(n)).toBe(
        String(a),
      );
      [a, b] = [b, (a + b) % 1_000_000_007];
    }
  });
  it("counting-divisors agrees with direct factor enumeration", () => {
    for (let n = 1; n <= 100; n++) {
      let count = 0;
      for (let d = 1; d <= n; d++) if (n % d === 0) count++;
      expect(output("counting-divisors", { values: [n] }), String(n)).toBe(
        String(count),
      );
    }
  });
  it("common-divisors agrees with exhaustive pairwise Euclidean GCD", () => {
    for (let trial = 0; trial < 100; trial++) {
      const values = Array.from(
        { length: 2 + Math.floor(random() * 8) },
        () => 1 + Math.floor(random() * 100),
      );
      let best = 1;
      for (let i = 0; i < values.length; i++)
        for (let j = i + 1; j < values.length; j++)
          best = Math.max(best, gcd(values[i], values[j]));
      expect(output("common-divisors", { values })).toBe(String(best));
    }
  });
  it("binomial-coefficients agrees with Pascal rows", () => {
    let row = [1];
    for (let a = 0; a <= 25; a++) {
      for (let b = 0; b <= a; b++)
        expect(
          output("binomial-coefficients", { queries: [[a, b]] }),
          `${a},${b}`,
        ).toBe(String(row[b]));
      row = [1, ...row.slice(1).map((x, i) => x + row[i]), 1];
    }
  });
  it("creating-strings-ii agrees with unique permutation enumeration", () => {
    for (let trial = 0; trial < 45; trial++) {
      const text = Array.from(
        { length: 1 + Math.floor(random() * 7) },
        () => "abc"[Math.floor(random() * 3)],
      ).join("");
      const seen = new Set<string>();
      function visit(prefix: string, left: string) {
        if (!left.length) {
          seen.add(prefix);
          return;
        }
        for (let i = 0; i < left.length; i++)
          visit(prefix + left[i], left.slice(0, i) + left.slice(i + 1));
      }
      visit("", text);
      expect(output("creating-strings-ii", { text }), text).toBe(
        String(seen.size),
      );
    }
  });
  it("distributing-apples agrees with exhaustive weak compositions", () => {
    function count(children: number, apples: number): number {
      if (children === 1) return 1;
      let ways = 0;
      for (let first = 0; first <= apples; first++)
        ways += count(children - 1, apples - first);
      return ways;
    }
    for (let n = 1; n <= 6; n++)
      for (let m = 1; m <= 8; m++)
        expect(
          output("distributing-apples", { children: n, apples: m }),
          `${n},${m}`,
        ).toBe(String(count(n, m)));
  });
});
