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
let seed = 2189;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
type P = [number, number];
function cross(a: P, b: P) {
  return a[0] * b[1] - a[1] * b[0];
}
function independentIntersection(a: P, b: P, c: P, d: P) {
  const r: P = [b[0] - a[0], b[1] - a[1]],
    s: P = [d[0] - c[0], d[1] - c[1]],
    q: P = [c[0] - a[0], c[1] - a[1]];
  const denominator = cross(r, s),
    numerator = cross(q, s),
    other = cross(q, r);
  if (denominator === 0) {
    if (other !== 0) return false;
    const useX = Math.abs(r[0]) >= Math.abs(r[1]),
      axis = useX ? 0 : 1;
    return (
      Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])) <=
      Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]))
    );
  }
  const inside = (value: number) =>
    denominator > 0
      ? 0 <= value && value <= denominator
      : denominator <= value && value <= 0;
  return inside(numerator) && inside(other);
}

describe("independent geometry oracles", () => {
  it("matches official examples and rejects degenerate lines", () => {
    for (const id of ["point-location-test", "line-segment-intersection"]) {
      const problem = getProblem(id)!;
      for (const example of problem.metadata.examples)
        expect(output(id, JSON.parse(example.input)), id).toBe(example.output);
      expect(() => output(id, {})).toThrow();
    }
    expect(() =>
      output("point-location-test", { tests: [[0, 0, 0, 0, 1, 1]] }),
    ).toThrow();
    expect(() =>
      output("line-segment-intersection", {
        tests: [[0, 0, 1, 1, 2, 2, 2, 2]],
      }),
    ).toThrow();
  });
  it("point-location-test follows signed triangle area for seeded triples", () => {
    for (let trial = 0; trial < 180; trial++) {
      const points = Array.from(
        { length: 3 },
        () =>
          [Math.floor(random() * 17) - 8, Math.floor(random() * 17) - 8] as P,
      );
      const [a, b, c] = points;
      if (a[0] === b[0] && a[1] === b[1]) continue;
      const area =
        a[0] * b[1] +
        b[0] * c[1] +
        c[0] * a[1] -
        a[1] * b[0] -
        b[1] * c[0] -
        c[1] * a[0];
      expect(output("point-location-test", { tests: [points.flat()] })).toBe(
        area > 0 ? "LEFT" : area < 0 ? "RIGHT" : "TOUCH",
      );
    }
  });
  it("line-segment-intersection agrees with parametric intervals and collinear projections", () => {
    const cases = [
      [0, 0, 4, 0, 2, 0, 6, 0],
      [0, 0, 4, 0, 5, 0, 6, 0],
      [0, 0, 4, 0, 4, 0, 4, 3],
      [0, 0, 3, 3, 0, 3, 3, 0],
      [0, 0, 3, 1, 0, 2, 3, 3],
    ];
    for (let trial = 0; trial < 220; trial++)
      cases.push(
        ...[Array.from({ length: 8 }, () => Math.floor(random() * 13) - 6)],
      );
    for (const t of cases) {
      const [a, b, c, d]: P[] = [
        [t[0], t[1]],
        [t[2], t[3]],
        [t[4], t[5]],
        [t[6], t[7]],
      ];
      if ((a[0] === b[0] && a[1] === b[1]) || (c[0] === d[0] && c[1] === d[1]))
        continue;
      expect(
        output("line-segment-intersection", { tests: [t] }),
        t.join(","),
      ).toBe(independentIntersection(a, b, c, d) ? "YES" : "NO");
    }
  });
});
