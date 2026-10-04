import { runInNewContext } from "node:vm";
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
  let value = seed >>> 0;
  return () =>
    (value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
const rng = random(200116);
const int = (max: number) => Math.floor(rng() * max);

describe("CSES 200 DP and search wave: independent oracles", () => {
  it("matches official-task fixtures in both traces and reference snippets", () => {
    for (const id of [
      "digit-queries",
      "array-division",
      "removal-game",
      "longest-common-subsequence",
      "josephus-problem-i",
    ]) {
      const problem = getProblem(id)!;
      const example = problem.metadata.examples[0];
      const input = JSON.parse(example.input);
      expect(solve(id, input), id).toBe(example.output);
      const reference = runInNewContext(
        `(function(input){const {${Object.keys(input).join(",")}}=input;${problem.source}})(input)`,
        { input },
        { timeout: 1000 },
      );
      expect(String(reference), `${id} reference algorithm`).toBe(
        example.output,
      );
    }
  });

  it("digit-queries agrees with direct concatenation and independent cumulative-digit search", () => {
    let direct = "";
    for (let number = 1; direct.length < 30000; number++) direct += number;
    for (let trial = 0; trial < 100; trial++) {
      const position = 1 + int(30000);
      expect(solve("digit-queries", { positions: [String(position)] })).toBe(
        direct[position - 1],
      );
    }
    function digitsThrough(number: bigint): bigint {
      let digits = 1n,
        first = 1n,
        total = 0n;
      while (first <= number) {
        const last = first * 10n - 1n;
        total += ((number < last ? number : last) - first + 1n) * digits;
        first *= 10n;
        digits++;
      }
      return total;
    }
    for (const position of [
      1n,
      9n,
      10n,
      189n,
      190n,
      1_000_000_000_000_000_000n,
    ]) {
      let low = 1n,
        high = position;
      while (low < high) {
        const middle = (low + high) / 2n;
        if (digitsThrough(middle) >= position) high = middle;
        else low = middle + 1n;
      }
      const index = Number(position - digitsThrough(low - 1n) - 1n);
      expect(solve("digit-queries", { positions: [position.toString()] })).toBe(
        low.toString()[index],
      );
    }
    expect(() =>
      solve("digit-queries", { positions: [1_000_000_000_000_000_000] }),
    ).toThrow();
  });

  it("array-division agrees with exhaustive exact-k cut placements", () => {
    for (let trial = 0; trial < 85; trial++) {
      const values = Array.from({ length: 1 + int(8) }, () => 1 + int(15));
      const k = 1 + int(values.length);
      let best = Infinity;
      function divide(at: number, partsLeft: number, biggest: number) {
        if (partsLeft === 0) {
          if (at === values.length) best = Math.min(best, biggest);
          return;
        }
        let sum = 0;
        for (let end = at; end <= values.length - partsLeft; end++) {
          sum += values[end];
          divide(end + 1, partsLeft - 1, Math.max(biggest, sum));
        }
      }
      divide(0, k, 0);
      expect(solve("array-division", { values, k })).toBe(String(best));
    }
    expect(() => solve("array-division", { values: [1, 2], k: 3 })).toThrow();
  });

  it("removal-game agrees with alternating minimax over both endpoints", () => {
    for (let trial = 0; trial < 70; trial++) {
      const values = Array.from({ length: 1 + int(8) }, () => int(21) - 10);
      function play(left: number, right: number, firstTurn: boolean): number {
        if (left > right) return 0;
        if (firstTurn)
          return Math.max(
            values[left] + play(left + 1, right, false),
            values[right] + play(left, right - 1, false),
          );
        return Math.min(
          play(left + 1, right, true),
          play(left, right - 1, true),
        );
      }
      expect(solve("removal-game", { values })).toBe(
        String(play(0, values.length - 1, true)),
      );
    }
    expect(solve("removal-game", { values: [-7] })).toBe("-7");
  });

  it("longest-common-subsequence returns a maximum-length valid common subsequence", () => {
    function isSubsequence(needle: number[], haystack: number[]) {
      let next = 0;
      for (const value of haystack) if (value === needle[next]) next++;
      return next === needle.length;
    }
    for (let trial = 0; trial < 80; trial++) {
      const first = Array.from({ length: 1 + int(7) }, () => 1 + int(5));
      const second = Array.from({ length: 1 + int(7) }, () => 1 + int(5));
      let maximum = 0;
      for (let mask = 0; mask < 2 ** first.length; mask++) {
        const chosen = first.filter((_, i) => mask & (1 << i));
        if (isSubsequence(chosen, second))
          maximum = Math.max(maximum, chosen.length);
      }
      const [lengthText, sequenceText] = solve("longest-common-subsequence", {
        first,
        second,
      }).split("\n");
      const sequence = sequenceText ? sequenceText.split(" ").map(Number) : [];
      expect(Number(lengthText)).toBe(maximum);
      expect(sequence).toHaveLength(maximum);
      expect(
        isSubsequence(sequence, first) && isSubsequence(sequence, second),
      ).toBe(true);
    }
  });

  it("josephus-problem-i agrees with direct circular deletion", () => {
    for (let n = 1; n <= 32; n++) {
      const circle = Array.from({ length: n }, (_, i) => i + 1),
        removed: number[] = [];
      let index = 0;
      while (circle.length) {
        index = (index + 1) % circle.length;
        removed.push(circle.splice(index, 1)[0]);
        if (index === circle.length) index = 0;
      }
      expect(solve("josephus-problem-i", { n })).toBe(removed.join(" "));
    }
    expect(() => solve("josephus-problem-i", { n: 0 })).toThrow();
  });
});
