import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";

type Point = [number, number];
function tests(raw: unknown, width: number): number[][] {
  const value = readObject(raw).tests;
  if (!Array.isArray(value) || value.length < 1 || value.length > 8)
    throw new InputError("tests must contain 1–8 cases");
  return value.map((test, i) => {
    if (!Array.isArray(test) || test.length !== width)
      throw new InputError(`tests[${i}] must contain ${width} coordinates`);
    return test.map((cell, j) =>
      integer(cell, `tests[${i}][${j}]`, -100_000, 100_000),
    );
  });
}
function cross(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function between(a: Point, b: Point, c: Point) {
  return (
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1])
  );
}
function solveIntersection(a: Point, b: Point, c: Point, d: Point) {
  const p = cross(a, b, c),
    q = cross(a, b, d),
    r = cross(c, d, a),
    s = cross(c, d, b);
  if (
    (p === 0 && between(a, b, c)) ||
    (q === 0 && between(a, b, d)) ||
    (r === 0 && between(c, d, a)) ||
    (s === 0 && between(c, d, b))
  )
    return true;
  return Math.sign(p) !== Math.sign(q) && Math.sign(r) !== Math.sign(s);
}
function traceCases(
  cases: number[][],
  solve: (
    test: number[],
    index: number,
  ) => { answer: string; value: number; reason: string; equation: string },
) {
  const state = emptyState(),
    events: EventDraft[] = [],
    outputs: string[] = [];
  cases.forEach((test, i) => {
    const id = `array:${i}`;
    state.entities[id] = {
      id,
      kind: "array",
      label: `Case ${i + 1}`,
      value: 0,
      status: "idle",
      metadata: { coordinates: test.join(", ") },
    };
    const step = solve(test, i);
    outputs.push(step.answer);
    events.push(
      event("WRITE_INDEX", [id], step.reason, { value: step.value }, 1, {
        schemaVersion: "0.1",
        equation: step.equation,
        reason: step.reason,
      }),
    );
  });
  return { initialState: state, events, output: outputs.join("\n") };
}

const pointLocationTest = defineProblem({
  metadata: metadata({
    id: "point-location-test",
    title: "Point Location Test",
    task: "2189",
    category: "Geometry",
    renderer: "array",
    summary: "Determine which side of a directed line contains each point.",
    limits: "1–8 triples of integer points, coordinates ±100,000",
    tags: ["orientation", "cross product", "geometry"],
    examples: [
      {
        input: '{"tests":[[1,1,5,3,2,3],[1,1,5,3,4,1],[1,1,5,3,3,2]]}',
        output: "LEFT\nRIGHT\nTOUCH",
      },
    ],
    complexity: { time: "O(t)", space: "O(t) for the interactive trace" },
    learning: {
      intuition:
        "The signed cross product tells whether the turn from the line to the point is left or right.",
      approach: [
        "Subtract the first endpoint from the second and query point.",
        "Compute the determinant of those two vectors.",
        "Map positive, negative, and zero to LEFT, RIGHT, and TOUCH.",
      ],
      explanation:
        "A positive determinant is counterclockwise relative to the directed line; zero means collinearity.",
    },
  }),
  defaultInput: {
    tests: [
      [1, 1, 5, 3, 2, 3],
      [1, 1, 5, 3, 4, 1],
      [1, 1, 5, 3, 3, 2],
    ],
  },
  source: `return tests.map(([x1,y1,x2,y2,x3,y3])=>{const turn=(x2-x1)*(y3-y1)-(y2-y1)*(x3-x1);return turn>0?'LEFT':turn<0?'RIGHT':'TOUCH';}).join(String.fromCharCode(10));`,
  parseInput(raw) {
    const cases = tests(raw, 6);
    for (const t of cases)
      if (t[0] === t[2] && t[1] === t[3])
        throw new InputError("The line endpoints must differ");
    return { tests: cases };
  },
  trace({ tests: cases }) {
    return traceCases(cases, (t, i) => {
      const turn = cross([t[0], t[1]], [t[2], t[3]], [t[4], t[5]]);
      const answer = turn > 0 ? "LEFT" : turn < 0 ? "RIGHT" : "TOUCH";
      return {
        answer,
        value: turn,
        reason: `Case ${i + 1}: signed turn ${turn} places the point ${answer.toLowerCase()} of the directed line.`,
        equation: `(${t[2]}−${t[0]})(${t[5]}−${t[1]}) − (${t[3]}−${t[1]})(${t[4]}−${t[0]}) = ${turn}`,
      };
    });
  },
});

const lineSegmentIntersection = defineProblem({
  metadata: metadata({
    id: "line-segment-intersection",
    title: "Line Segment Intersection",
    task: "2190",
    category: "Geometry",
    renderer: "array",
    summary: "Test whether two closed segments cross or touch.",
    limits: "1–8 pairs of nonzero-length segments, coordinates ±100,000",
    tags: ["orientation", "cross product", "geometry", "interval overlap"],
    examples: [
      {
        input:
          '{"tests":[[1,1,5,3,1,2,4,3],[1,1,5,3,1,1,4,3],[1,1,5,3,2,3,4,1]]}',
        output: "NO\nYES\nYES",
      },
    ],
    complexity: { time: "O(t)", space: "O(t) for the interactive trace" },
    learning: {
      intuition:
        "Crossing segments put each other's endpoints on opposite sides, with endpoint and collinear cases included.",
      approach: [
        "Compute four signed orientations.",
        "Accept a proper crossing when both endpoint pairs straddle.",
        "For zero turns, check whether the touching point lies inside the closed segment bounds.",
      ],
      explanation:
        "The straddle test covers proper crossings. Bounding checks are necessary when segments are collinear or meet exactly at an endpoint.",
    },
  }),
  defaultInput: {
    tests: [
      [1, 1, 5, 3, 1, 2, 4, 3],
      [1, 1, 5, 3, 1, 1, 4, 3],
      [1, 1, 5, 3, 2, 3, 4, 1],
    ],
  },
  source: `const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const inside=(a,b,p)=>Math.min(a[0],b[0])<=p[0]&&p[0]<=Math.max(a[0],b[0])&&Math.min(a[1],b[1])<=p[1]&&p[1]<=Math.max(a[1],b[1]);return tests.map(([x1,y1,x2,y2,x3,y3,x4,y4])=>{const a=[x1,y1],b=[x2,y2],c=[x3,y3],d=[x4,y4];const [p,q,r,s]=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];return p===0&&inside(a,b,c)||q===0&&inside(a,b,d)||r===0&&inside(c,d,a)||s===0&&inside(c,d,b)||Math.sign(p)!==Math.sign(q)&&Math.sign(r)!==Math.sign(s)?'YES':'NO';}).join(String.fromCharCode(10));`,
  parseInput(raw) {
    const cases = tests(raw, 8);
    for (const t of cases)
      if ((t[0] === t[2] && t[1] === t[3]) || (t[4] === t[6] && t[5] === t[7]))
        throw new InputError("Each segment must have distinct endpoints");
    return { tests: cases };
  },
  trace({ tests: cases }) {
    return traceCases(cases, (t, i) => {
      const [a, b, c, d]: Point[] = [
        [t[0], t[1]],
        [t[2], t[3]],
        [t[4], t[5]],
        [t[6], t[7]],
      ];
      const turns = [
        cross(a, b, c),
        cross(a, b, d),
        cross(c, d, a),
        cross(c, d, b),
      ];
      const answer = solveIntersection(a, b, c, d) ? "YES" : "NO";
      return {
        answer,
        value: answer === "YES" ? 1 : 0,
        reason: `Case ${i + 1}: orientations ${turns.join(", ")}; the closed segments ${answer === "YES" ? "meet" : "do not meet"}.`,
        equation: `orientations = (${turns.join(", ")}) ⇒ ${answer}`,
      };
    });
  },
});

export const geometryPrimitiveProblems = [
  entry(pointLocationTest),
  entry(lineSegmentIntersection),
];
