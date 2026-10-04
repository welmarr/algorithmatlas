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
let seed = 2413;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

describe("independent advanced DP oracles", () => {
  it("matches all published examples", () => {
    for (const id of ["counting-towers", "projects", "elevator-rides"]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
    }
  });

  it("counting-towers matches exact rectangle-tiling enumeration at small heights", () => {
    function tilings(height: number) {
      const cells = 2 * height,
        full = (1 << cells) - 1;
      function count(mask: number): number {
        if (mask === full) return 1;
        let first = 0;
        while (mask & (1 << first)) first++;
        const row = Math.floor(first / 2),
          col = first % 2;
        let total = 0;
        for (let h = 1; row + h <= height; h++)
          for (let w = 1; col + w <= 2; w++) {
            let rectangle = 0;
            for (let y = row; y < row + h; y++)
              for (let x = col; x < col + w; x++) rectangle |= 1 << (2 * y + x);
            if (!(mask & rectangle)) total += count(mask | rectangle);
          }
        return total;
      }
      return count(0);
    }
    for (let height = 1; height <= 5; height++)
      expect(output("counting-towers", { heights: [height] })).toBe(
        String(tilings(height)),
      );
  });

  it("projects matches exhaustive compatible subsets", () => {
    for (let trial = 0; trial < 55; trial++) {
      const projects: [number, number, number][] = Array.from(
        { length: 1 + Math.floor(random() * 9) },
        () => {
          const start = 1 + Math.floor(random() * 15),
            end = start + Math.floor(random() * (16 - start));
          return [start, end, 1 + Math.floor(random() * 40)];
        },
      );
      let best = 0;
      for (let mask = 0; mask < 2 ** projects.length; mask++) {
        let valid = true,
          reward = 0;
        for (let i = 0; i < projects.length; i++)
          if (mask & (1 << i)) {
            reward += projects[i][2];
            for (let j = i + 1; j < projects.length; j++)
              if (mask & (1 << j))
                if (!(
                  projects[i][1] < projects[j][0] ||
                  projects[j][1] < projects[i][0]
                ))
                  valid = false;
          }
        if (valid) best = Math.max(best, reward);
      }
      expect(output("projects", { projects })).toBe(String(best));
    }
  });

  // Preserve all 55 exhaustive cases when the full suite shares the CPU with service probes.
  it("elevator-rides matches exhaustive assignment to capacity-limited rides", () => {
    for (let trial = 0; trial < 55; trial++) {
      const capacity = 3 + Math.floor(random() * 18),
        weights = Array.from(
          { length: 1 + Math.floor(random() * 7) },
          () => 1 + Math.floor(random() * capacity),
        );
      let best = weights.length;
      function assign(index: number, loads: number[]) {
        if (loads.length >= best) return;
        if (index === weights.length) {
          best = loads.length;
          return;
        }
        for (let i = 0; i < loads.length; i++)
          if (loads[i] + weights[index] <= capacity) {
            loads[i] += weights[index];
            assign(index + 1, loads);
            loads[i] -= weights[index];
          }
        loads.push(weights[index]);
        assign(index + 1, loads);
        loads.pop();
      }
      best = weights.length + 1;
      assign(0, []);
      expect(output("elevator-rides", { capacity, weights })).toBe(
        String(best),
      );
    }
  }, 10000);

  it("rejects invalid tower, project, and elevator input", () => {
    for (const id of ["counting-towers", "projects", "elevator-rides"])
      expect(() => output(id, {}), id).toThrow();
    expect(() => output("counting-towers", { heights: [0] })).toThrow();
    expect(() => output("projects", { projects: [[5, 4, 2]] })).toThrow();
    expect(() =>
      output("elevator-rides", { capacity: 5, weights: [6] }),
    ).toThrow();
  });
});
