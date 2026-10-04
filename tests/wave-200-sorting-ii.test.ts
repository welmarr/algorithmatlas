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
const rng = random(200121);
const int = (max: number) => Math.floor(rng() * max);

describe("CSES 200 second sorting wave: independent oracles", () => {
  it("matches the published fixtures in both traced and reference algorithms", () => {
    for (const id of [
      "concert-tickets",
      "traffic-lights",
      "sum-of-three-values",
      "sum-of-four-values",
      "maximum-subarray-sum-ii",
    ]) {
      const problem = getProblem(id)!;
      const example = problem.metadata.examples[0],
        input = JSON.parse(example.input);
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

  it("concert-tickets agrees with direct maximum-affordable multiset removal", () => {
    for (let trial = 0; trial < 80; trial++) {
      const tickets = Array.from({ length: 1 + int(8) }, () => 1 + int(15));
      const budgets = Array.from({ length: 1 + int(8) }, () => 1 + int(17));
      const available = [...tickets],
        expected: number[] = [];
      for (const budget of budgets) {
        const affordable = available.filter((price) => price <= budget);
        if (!affordable.length) {
          expected.push(-1);
          continue;
        }
        const price = Math.max(...affordable);
        expected.push(price);
        available.splice(available.indexOf(price), 1);
      }
      expect(solve("concert-tickets", { tickets, budgets })).toBe(
        expected.join("\n"),
      );
    }
    expect(() =>
      solve("concert-tickets", { tickets: [], budgets: [1] }),
    ).toThrow();
  });

  it("traffic-lights agrees with forward sorted-gap recomputation", () => {
    for (let trial = 0; trial < 80; trial++) {
      const length = 3 + int(30),
        possible = Array.from({ length: length - 1 }, (_, i) => i + 1);
      for (let i = possible.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [possible[i], possible[j]] = [possible[j], possible[i]];
      }
      const positions = possible.slice(
        0,
        1 + int(Math.min(9, possible.length)),
      );
      const active = [0, length],
        expected: number[] = [];
      for (const position of positions) {
        active.push(position);
        active.sort((a, b) => a - b);
        expected.push(
          Math.max(...active.slice(1).map((value, i) => value - active[i])),
        );
      }
      expect(solve("traffic-lights", { length, positions })).toBe(
        expected.join(" "),
      );
    }
    expect(() =>
      solve("traffic-lights", { length: 8, positions: [3, 3] }),
    ).toThrow();
  });

  function checkPositions(
    id: string,
    values: number[],
    target: number,
    count: number,
  ) {
    let exists = false;
    function choose(start: number, remaining: number, sum: number) {
      if (!remaining) {
        if (sum === target) exists = true;
        return;
      }
      for (let i = start; i <= values.length - remaining; i++)
        choose(i + 1, remaining - 1, sum + values[i]);
    }
    choose(0, count, 0);
    const output = solve(id, { values, target });
    if (!exists) {
      expect(output).toBe("IMPOSSIBLE");
      return;
    }
    expect(output).not.toBe("IMPOSSIBLE");
    const indices = output.split(" ").map(Number);
    expect(indices).toHaveLength(count);
    expect(new Set(indices).size).toBe(count);
    expect(
      indices.every(
        (index) =>
          Number.isInteger(index) && index >= 1 && index <= values.length,
      ),
    ).toBe(true);
    expect(indices.reduce((sum, index) => sum + values[index - 1], 0)).toBe(
      target,
    );
  }

  it("sum-of-three-values returns valid distinct indices or impossibility", () => {
    for (let trial = 0; trial < 110; trial++)
      checkPositions(
        "sum-of-three-values",
        Array.from({ length: 3 + int(7) }, () => 1 + int(13)),
        1 + int(34),
        3,
      );
    expect(() =>
      solve("sum-of-three-values", { values: [1, 2], target: 3 }),
    ).toThrow();
  });

  it("sum-of-four-values returns valid distinct indices or impossibility", () => {
    for (let trial = 0; trial < 110; trial++)
      checkPositions(
        "sum-of-four-values",
        Array.from({ length: 4 + int(7) }, () => 1 + int(13)),
        1 + int(43),
        4,
      );
    expect(() =>
      solve("sum-of-four-values", { values: [1, 2, 3], target: 6 }),
    ).toThrow();
  });

  it("maximum-subarray-sum-ii agrees with exhaustive bounded-length sums", () => {
    for (let trial = 0; trial < 100; trial++) {
      const values = Array.from({ length: 1 + int(10) }, () => int(23) - 11);
      const minLength = 1 + int(values.length),
        maxLength = minLength + int(values.length - minLength + 1);
      let expected = -Infinity;
      for (let left = 0; left < values.length; left++) {
        let sum = 0;
        for (let right = left; right < values.length; right++) {
          sum += values[right];
          if (right - left + 1 >= minLength && right - left + 1 <= maxLength)
            expected = Math.max(expected, sum);
        }
      }
      expect(
        solve("maximum-subarray-sum-ii", { values, minLength, maxLength }),
      ).toBe(String(expected));
    }
    expect(() =>
      solve("maximum-subarray-sum-ii", {
        values: [1, 2],
        minLength: 2,
        maxLength: 1,
      }),
    ).toThrow();
  });
});
