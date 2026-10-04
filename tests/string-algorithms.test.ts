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
let seed = 1732;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
function word(length: number) {
  return Array.from({ length }, () => "abc"[Math.floor(random() * 3)]).join("");
}

describe("independent string algorithm oracles", () => {
  it("matches all published examples", () => {
    for (const id of [
      "finding-borders",
      "finding-periods",
      "string-functions",
      "word-combinations",
    ]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("borders and periods match direct substring comparisons", () => {
    for (let trial = 0; trial < 65; trial++) {
      const text = word(1 + Math.floor(random() * 15)),
        n = text.length;
      const borders = Array.from({ length: n - 1 }, (_, i) => i + 1).filter(
        (length) => text.slice(0, length) === text.slice(n - length),
      );
      const periods = Array.from({ length: n }, (_, i) => i + 1).filter(
        (length) => {
          for (let index = length; index < n; index++)
            if (text[index] !== text[index - length]) return false;
          return true;
        },
      );
      expect(output("finding-borders", { text })).toBe(borders.join(" "));
      expect(output("finding-periods", { text })).toBe(periods.join(" "));
    }
  });

  it("string-functions agrees with independent direct Z and border calculations", () => {
    for (let trial = 0; trial < 55; trial++) {
      const text = word(1 + Math.floor(random() * 15)),
        n = text.length;
      const z = Array.from({ length: n }, (_, index) => {
        if (index === 0) return 0;
        let length = 0;
        while (index + length < n && text[length] === text[index + length])
          length++;
        return length;
      });
      const pi = Array.from({ length: n }, (_, index) => {
        for (let length = index; length >= 1; length--)
          if (
            text.slice(0, length) === text.slice(index - length + 1, index + 1)
          )
            return length;
        return 0;
      });
      expect(output("string-functions", { text })).toBe(
        `${z.join(" ")}\n${pi.join(" ")}`,
      );
    }
  });

  it("word-combinations matches exhaustive recursive segmentation", () => {
    for (let trial = 0; trial < 60; trial++) {
      const text = word(1 + Math.floor(random() * 12)),
        words = [
          ...new Set(
            Array.from({ length: 1 + Math.floor(random() * 6) }, () =>
              word(1 + Math.floor(random() * 4)),
            ),
          ),
        ];
      function count(index: number): number {
        if (index === text.length) return 1;
        let ways = 0;
        for (const candidate of words)
          if (text.startsWith(candidate, index))
            ways += count(index + candidate.length);
        return ways;
      }
      expect(output("word-combinations", { text, words })).toBe(
        String(count(0)),
      );
    }
  });

  it("rejects malformed strings and duplicate dictionary words", () => {
    for (const id of [
      "finding-borders",
      "finding-periods",
      "string-functions",
      "word-combinations",
    ])
      expect(() => output(id, {}), id).toThrow();
    expect(() => output("finding-periods", { text: "Aa" })).toThrow();
    expect(() =>
      output("word-combinations", { text: "abc", words: ["a", "a"] }),
    ).toThrow();
  });
});
