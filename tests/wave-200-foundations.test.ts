import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
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
const rng = random(200101);
const int = (max: number) => Math.floor(rng() * max);

describe("CSES 200 foundation wave: independent small-case oracles", () => {
  it("all eleven official-task examples match the traced answer", () => {
    for (const id of [
      "palindrome-reorder",
      "gray-code",
      "creating-strings",
      "apple-division",
      "apartments",
      "ferris-wheel",
      "restaurant-customers",
      "movie-festival",
      "towers",
      "tasks-and-deadlines",
      "reading-books",
    ]) {
      const problem = getProblem(id)!;
      const example = problem.metadata.examples[0];
      const input = JSON.parse(example.input);
      expect(solve(id, input), id).toBe(example.output);
      const reference = runInNewContext(
        `(function(input){ const {${Object.keys(input).join(",")}}=input; ${problem.source} })(input)`,
        { input },
        { timeout: 1000 },
      );
      expect(String(reference), `${id} reference algorithm`).toBe(
        example.output,
      );
    }
  });

  it("palindrome-reorder preserves exactly the letters or proves impossibility", () => {
    for (let length = 1; length <= 5; length++)
      for (let mask = 0; mask < 3 ** length; mask++) {
        let value = mask,
          text = "";
        for (let i = 0; i < length; i++) {
          text += "ABC"[value % 3];
          value = Math.floor(value / 3);
        }
        const output = solve("palindrome-reorder", { text });
        const odd = [..."ABC"].filter(
          (letter) => [...text].filter((char) => char === letter).length % 2,
        ).length;
        if (odd > 1) expect(output).toBe("NO SOLUTION");
        else {
          expect(output).toBe([...output].reverse().join(""));
          expect([...output].sort().join("")).toBe([...text].sort().join(""));
        }
      }
    expect(() => solve("palindrome-reorder", { text: "a" })).toThrow();
  });

  it("gray-code visits every bit string once with single-bit transitions", () => {
    for (let n = 1; n <= 8; n++) {
      const codes = solve("gray-code", { n }).split("\n");
      expect(codes).toHaveLength(2 ** n);
      expect(new Set(codes).size).toBe(2 ** n);
      expect(
        codes.every((code) => code.length === n && /^[01]+$/.test(code)),
      ).toBe(true);
      for (let i = 1; i < codes.length; i++)
        expect(
          [...codes[i]].filter((bit, j) => bit !== codes[i - 1][j]),
        ).toHaveLength(1);
    }
    expect(() => solve("gray-code", { n: 9 })).toThrow();
  });

  it("creating-strings agrees with independent index-permutation enumeration", () => {
    for (const text of ["a", "aab", "abca", "ccbb", "abcde", "aaaaaa"]) {
      const found = new Set<string>();
      function enumerate(prefix: string, used: number) {
        if (prefix.length === text.length) {
          found.add(prefix);
          return;
        }
        for (let i = 0; i < text.length; i++)
          if (!(used & (1 << i))) enumerate(prefix + text[i], used | (1 << i));
      }
      enumerate("", 0);
      const ordered = [...found].sort();
      expect(solve("creating-strings", { text })).toBe(
        `${ordered.length}\n${ordered.join("\n")}`,
      );
    }
    expect(() => solve("creating-strings", { text: "aaaaaaa" })).toThrow();
  });

  it("apple-division agrees with subset-sum reachability", () => {
    for (let trial = 0; trial < 45; trial++) {
      const weights = Array.from({ length: 1 + int(10) }, () => 1 + int(25));
      const total = weights.reduce((sum, value) => sum + value, 0);
      let reachable = new Set([0]);
      for (const weight of weights)
        reachable = new Set([
          ...reachable,
          ...[...reachable].map((sum) => sum + weight),
        ]);
      const expected = Math.min(
        ...[...reachable].map((sum) => Math.abs(total - 2 * sum)),
      );
      expect(solve("apple-division", { weights })).toBe(String(expected));
    }
    expect(() => solve("apple-division", { weights: [] })).toThrow();
  });

  it("apartments agrees with exhaustive bipartite assignment", () => {
    for (let trial = 0; trial < 65; trial++) {
      const desired = Array.from({ length: 1 + int(5) }, () => 1 + int(12));
      const apartments = Array.from({ length: 1 + int(5) }, () => 1 + int(12));
      const k = int(4);
      function match(i: number, used: number): number {
        if (i === desired.length) return 0;
        let best = match(i + 1, used);
        for (let j = 0; j < apartments.length; j++)
          if (!(used & (1 << j)) && Math.abs(desired[i] - apartments[j]) <= k)
            best = Math.max(best, 1 + match(i + 1, used | (1 << j)));
        return best;
      }
      expect(solve("apartments", { desired, apartments, k })).toBe(
        String(match(0, 0)),
      );
    }
    expect(() =>
      solve("apartments", { desired: [1], apartments: [1], k: -1 }),
    ).toThrow();
  });

  it("ferris-wheel agrees with exhaustive legal gondola groupings", () => {
    for (let trial = 0; trial < 65; trial++) {
      const limit = 2 + int(15);
      const weights = Array.from({ length: 1 + int(8) }, () => 1 + int(limit));
      const memo = new Map<number, number>();
      function seats(used: number): number {
        if (used === (1 << weights.length) - 1) return 0;
        if (memo.has(used)) return memo.get(used)!;
        const first = weights.findIndex((_, i) => !(used & (1 << i)));
        let best = 1 + seats(used | (1 << first));
        for (let j = first + 1; j < weights.length; j++)
          if (!(used & (1 << j)) && weights[first] + weights[j] <= limit)
            best = Math.min(best, 1 + seats(used | (1 << first) | (1 << j)));
        memo.set(used, best);
        return best;
      }
      expect(solve("ferris-wheel", { weights, limit })).toBe(String(seats(0)));
    }
    expect(() => solve("ferris-wheel", { weights: [3], limit: 2 })).toThrow();
  });

  it("restaurant-customers agrees with direct occupancy at every event time", () => {
    for (let trial = 0; trial < 55; trial++) {
      const n = 1 + int(6),
        pool = Array.from({ length: 20 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const visits = Array.from({ length: n }, (_, i) => [
        Math.min(pool[2 * i], pool[2 * i + 1]),
        Math.max(pool[2 * i], pool[2 * i + 1]),
      ]);
      const expected = Math.max(
        ...visits
          .flat()
          .map(
            (time) =>
              visits.filter(([start, end]) => start <= time && time < end)
                .length,
          ),
      );
      expect(solve("restaurant-customers", { visits })).toBe(String(expected));
    }
    expect(() =>
      solve("restaurant-customers", {
        visits: [
          [1, 3],
          [3, 4],
        ],
      }),
    ).toThrow();
  });

  it("movie-festival agrees with subset enumeration", () => {
    for (let trial = 0; trial < 60; trial++) {
      const movies = Array.from({ length: 1 + int(8) }, () => {
        const start = 1 + int(12);
        return [start, start + 1 + int(6)];
      });
      let best = 0;
      for (let mask = 0; mask < 2 ** movies.length; mask++) {
        const selected = movies
          .filter((_, i) => mask & (1 << i))
          .sort((a, b) => a[0] - b[0]);
        if (
          selected.every(([start], i) => i === 0 || start >= selected[i - 1][1])
        )
          best = Math.max(best, selected.length);
      }
      expect(solve("movie-festival", { movies })).toBe(String(best));
    }
  });

  it("towers agrees with exhaustive placement choices", () => {
    for (let trial = 0; trial < 65; trial++) {
      const values = Array.from({ length: 1 + int(8) }, () => 1 + int(8));
      const memo = new Map<string, number>();
      function place(i: number, tops: number[]): number {
        if (i === values.length) return tops.length;
        const key = `${i}:${tops.join(",")}`;
        if (memo.has(key)) return memo.get(key)!;
        let best = place(
          i + 1,
          [...tops, values[i]].sort((a, b) => a - b),
        );
        for (let j = 0; j < tops.length; j++)
          if (tops[j] > values[i]) {
            const next = [...tops];
            next[j] = values[i];
            next.sort((a, b) => a - b);
            best = Math.min(best, place(i + 1, next));
          }
        memo.set(key, best);
        return best;
      }
      expect(solve("towers", { values })).toBe(String(place(0, [])));
    }
  });

  it("tasks-and-deadlines agrees with all task orders, including late deadlines", () => {
    for (let trial = 0; trial < 35; trial++) {
      const tasks = Array.from({ length: 1 + int(6) }, () => [
        1 + int(8),
        1 + int(10),
      ]);
      let best = -Infinity;
      function order(used: number, finish: number, reward: number) {
        if (used === (1 << tasks.length) - 1) {
          best = Math.max(best, reward);
          return;
        }
        for (let i = 0; i < tasks.length; i++)
          if (!(used & (1 << i)))
            order(
              used | (1 << i),
              finish + tasks[i][0],
              reward + tasks[i][1] - finish - tasks[i][0],
            );
      }
      order(0, 0, 0);
      expect(solve("tasks-and-deadlines", { tasks })).toBe(String(best));
    }
    expect(solve("tasks-and-deadlines", { tasks: [[9, 1]] })).toBe("-8");
  });

  it("reading-books agrees with an exhaustive minute-by-minute two-reader schedule", () => {
    function brute(times: number[]): number {
      type State = [number, number, number, number, number, number];
      const all = (1 << times.length) - 1;
      const queue: [State, number][] = [[[0, 0, -1, -1, 0, 0], 0]];
      const seen = new Set<string>();
      for (let head = 0; head < queue.length; head++) {
        const [state, elapsed] = queue[head];
        const [doneA, doneB, runA, runB, leftA, leftB] = state;
        if (doneA === all && doneB === all) return elapsed;
        const key = state.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const optionsA =
          runA >= 0
            ? [runA]
            : [
                -1,
                ...times
                  .map((_, i) => i)
                  .filter((i) => !(doneA & (1 << i)) && i !== runB),
              ];
        const optionsB =
          runB >= 0
            ? [runB]
            : [
                -1,
                ...times
                  .map((_, i) => i)
                  .filter((i) => !(doneB & (1 << i)) && i !== runA),
              ];
        for (const a of optionsA)
          for (const b of optionsB) {
            if ((a >= 0 && a === b) || (a < 0 && b < 0 && runA < 0 && runB < 0))
              continue;
            const nextA = a < 0 ? 0 : (runA >= 0 ? leftA : times[a]) - 1;
            const nextB = b < 0 ? 0 : (runB >= 0 ? leftB : times[b]) - 1;
            queue.push([
              [
                doneA | (a >= 0 && nextA === 0 ? 1 << a : 0),
                doneB | (b >= 0 && nextB === 0 ? 1 << b : 0),
                nextA > 0 ? a : -1,
                nextB > 0 ? b : -1,
                nextA,
                nextB,
              ],
              elapsed + 1,
            ]);
          }
      }
      throw new Error("No schedule found");
    }
    for (let trial = 0; trial < 18; trial++) {
      const times = Array.from({ length: 1 + int(3) }, () => 1 + int(3));
      expect(solve("reading-books", { times })).toBe(String(brute(times)));
    }
    expect(solve("reading-books", { times: [2, 8, 3] })).toBe("16");
  });
});
