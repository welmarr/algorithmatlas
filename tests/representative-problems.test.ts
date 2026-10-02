import { describe, expect, it } from "vitest";
import { getProblem, problems } from "@sim/problems";

function run(id: string, input: unknown): string {
  return getProblem(id)!.run(input).output;
}
function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

describe("representative problem suite", () => {
  it("has twenty unique, sourced, executable problems with learning steps", () => {
    expect(problems).toHaveLength(20);
    expect(new Set(problems.map((problem) => problem.metadata.id)).size).toBe(
      20,
    );
    for (const problem of problems) {
      expect(problem.metadata.source.url).toMatch(
        /^https:\/\/cses\.fi\/problemset\/task\/\d+$/,
      );
      expect(problem.metadata.constraints.length).toBeGreaterThan(0);
      expect(problem.metadata.learning.approach.length).toBeGreaterThan(0);
      const result = problem.run(problem.defaultInput);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.teachingSteps.length).toBeGreaterThan(1);
      expect(result.teachingSteps.at(-1)?.eventRange.end).toBe(
        result.events.length,
      );
      expect(
        result.timeline.seek(result.timeline.length).annotation,
      ).toBeTruthy();
    }
  });

  it("shows complete reference code that agrees with each new traced example", () => {
    const added = problems.slice(5);
    for (const problem of added) {
      for (const input of [
        problem.defaultInput,
        JSON.parse(problem.metadata.examples[0].input),
      ]) {
        const args = input as Record<string, unknown>;
        const execute = new Function(...Object.keys(args), problem.source) as (
          ...values: unknown[]
        ) => unknown;
        const reference = execute(...Object.values(args));
        let displayed: string;
        if (problem.metadata.id === "shortest-routes-i")
          displayed = (reference as (number | string)[])
            .map((value, i) => `${(args.nodes as string[])[i]}:${value}`)
            .join(" ");
        else if (problem.metadata.id === "road-construction")
          displayed = (reference as number[][])
            .map((pair) => pair.join(" "))
            .join(" | ");
        else if (Array.isArray(reference)) displayed = reference.join(" ");
        else displayed = String(reference);
        expect(displayed, problem.metadata.id).toBe(problem.run(input).output);
      }
    }
  });

  it.each([
    ["distinct-numbers", { values: [2, 3, 2, 2, 3] }, "2"],
    ["sum-of-two-values", { values: [2, 7, 5, 1], target: 8 }, "2 4"],
    ["sliding-window-sum", { values: [1, 3, 2, 5], window: 2 }, "4 5 7"],
    ["factory-machines", { values: [3, 2, 5], target: 7 }, "8"],
    [
      "static-range-sum",
      {
        values: [3, 2, 4, 5],
        queries: [
          [1, 3],
          [2, 4],
        ],
      },
      "9 11",
    ],
    [
      "dynamic-range-sum",
      {
        values: [1, 2, 3],
        queries: [
          [2, 1, 3],
          [1, 2, 5],
          [2, 1, 3],
        ],
      },
      "6 9",
    ],
    ["counting-rooms", { rows: ["..#", "###", "#.."] }, "2"],
    [
      "shortest-routes-i",
      {
        nodes: ["A", "B", "C"],
        edges: [
          ["A", "B", 4],
          ["A", "C", 10],
          ["B", "C", 2],
        ],
        source: "A",
      },
      "A:0 B:4 C:6",
    ],
    ["subordinates", { parents: [1, 1, 2, 3] }, "4 1 1 0 0"],
    [
      "road-construction",
      {
        cities: 4,
        roads: [
          [1, 2],
          [2, 3],
          [1, 3],
        ],
      },
      "3 2 | 2 3 | 2 3",
    ],
    ["edit-distance", { first: "LOVE", second: "MOVIE" }, "2"],
    ["string-matching", { text: "ABABABA", pattern: "ABA" }, "3"],
    ["chessboard-and-queens", { rows: ["....", "....", "....", "...."] }, "2"],
    ["exponentiation", { base: 3, exponent: 4 }, "81"],
    [
      "polygon-area",
      {
        points: [
          [0, 0],
          [4, 0],
          [4, 3],
          [0, 3],
        ],
      },
      "24",
    ],
  ] as const)("solves %s example", (id, input, expected) => {
    expect(run(id, input)).toBe(expected);
  });

  it("rejects malformed custom inputs for each new family", () => {
    for (const id of [
      "distinct-numbers",
      "sum-of-two-values",
      "sliding-window-sum",
      "factory-machines",
      "static-range-sum",
      "dynamic-range-sum",
      "counting-rooms",
      "shortest-routes-i",
      "subordinates",
      "road-construction",
      "edit-distance",
      "string-matching",
      "chessboard-and-queens",
      "exponentiation",
      "polygon-area",
    ])
      expect(() => run(id, {})).toThrow();
  });

  it("matches brute-force array, window, factory, and query answers", () => {
    const next = random(42);
    for (let trial = 0; trial < 24; trial++) {
      const values = Array.from(
        { length: 2 + Math.floor(next() * 6) },
        () => Math.floor(next() * 11) - 5,
      );
      expect(run("distinct-numbers", { values })).toBe(
        String(new Set(values).size),
      );
      const target = Math.floor(next() * 15) - 7;
      const pair = run("sum-of-two-values", { values, target });
      const exists = values.some((a, i) =>
        values.some((b, j) => i !== j && a + b === target),
      );
      if (!exists) expect(pair).toBe("IMPOSSIBLE");
      else {
        const [a, b] = pair.split(" ").map(Number);
        expect(a).not.toBe(b);
        expect(values[a - 1] + values[b - 1]).toBe(target);
      }
      const window = 1 + Math.floor(next() * values.length);
      const expectedWindows = Array.from(
        { length: values.length - window + 1 },
        (_, i) => values.slice(i, i + window).reduce((a, b) => a + b, 0),
      );
      expect(run("sliding-window-sum", { values, window })).toBe(
        expectedWindows.join(" "),
      );
      const queries = [
        [1, values.length],
        [2, values.length],
      ];
      expect(run("static-range-sum", { values, queries })).toBe(
        queries
          .map(([a, b]) => values.slice(a - 1, b).reduce((x, y) => x + y, 0))
          .join(" "),
      );
      const machines = values.map((v) => Math.abs(v) + 1),
        needed = 1 + Math.floor(next() * 12);
      let time = 1;
      while (
        machines.reduce((sum, speed) => sum + Math.floor(time / speed), 0) <
        needed
      )
        time++;
      expect(
        run("factory-machines", { values: machines, target: needed }),
      ).toBe(String(time));
    }
  });

  it("matches simple independent oracles for DP, graph, strings, geometry, and math", () => {
    const next = random(95);
    for (let trial = 0; trial < 20; trial++) {
      const a = Array.from({ length: 1 + Math.floor(next() * 5) }, () =>
        next() < 0.5 ? "A" : "B",
      ).join("");
      const b = Array.from({ length: 1 + Math.floor(next() * 5) }, () =>
        next() < 0.5 ? "A" : "B",
      ).join("");
      const memo = new Map<string, number>();
      const edit = (i: number, j: number): number => {
        if (!i) return j;
        if (!j) return i;
        const key = `${i}:${j}`;
        if (memo.has(key)) return memo.get(key)!;
        const result = Math.min(
          edit(i - 1, j) + 1,
          edit(i, j - 1) + 1,
          edit(i - 1, j - 1) + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
        memo.set(key, result);
        return result;
      };
      expect(run("edit-distance", { first: a, second: b })).toBe(
        String(edit(a.length, b.length)),
      );
      let matches = 0;
      for (let i = 0; i + b.length <= a.length; i++)
        if (a.slice(i, i + b.length) === b) matches++;
      expect(run("string-matching", { text: a, pattern: b })).toBe(
        String(matches),
      );
      const base = Math.floor(next() * 100),
        exponent = Math.floor(next() * 24);
      expect(run("exponentiation", { base, exponent })).toBe(
        String(BigInt(base) ** BigInt(exponent) % 1000000007n),
      );
      const width = 1 + Math.floor(next() * 12),
        height = 1 + Math.floor(next() * 12);
      expect(
        run("polygon-area", {
          points: [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height],
          ],
        }),
      ).toBe(String(2 * width * height));
      const nodes = ["A", "B", "C", "D"],
        edges: [string, string, number][] = [];
      const distances = Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) => (i === j ? 0 : Infinity)),
      );
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          if (i !== j && next() < 0.4) {
            const weight = 1 + Math.floor(next() * 9);
            edges.push([nodes[i], nodes[j], weight]);
            distances[i][j] = Math.min(distances[i][j], weight);
          }
      for (let k = 0; k < 4; k++)
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++)
            distances[i][j] = Math.min(
              distances[i][j],
              distances[i][k] + distances[k][j],
            );
      expect(run("shortest-routes-i", { nodes, edges, source: "A" })).toBe(
        nodes
          .map(
            (node, i) =>
              `${node}:${Number.isFinite(distances[0][i]) ? distances[0][i] : "∞"}`,
          )
          .join(" "),
      );
    }
  });

  it("counts known nonattacking queen boards", () => {
    for (const [size, count] of [
      [1, 1],
      [2, 0],
      [3, 0],
      [4, 2],
      [5, 10],
      [6, 4],
    ])
      expect(
        run("chessboard-and-queens", {
          rows: Array(size).fill(".".repeat(size)),
        }),
      ).toBe(String(count));
  });

  it("matches brute-force updates, flood fill, subtrees, and road connectivity", () => {
    const next = random(171);
    for (let trial = 0; trial < 16; trial++) {
      const values = Array.from(
        { length: 3 + Math.floor(next() * 5) },
        () => Math.floor(next() * 11) - 5,
      );
      const index = 1 + Math.floor(next() * values.length),
        replacement = Math.floor(next() * 11) - 5;
      const changed = [...values];
      changed[index - 1] = replacement;
      expect(
        run("dynamic-range-sum", {
          values,
          queries: [
            [2, 1, values.length],
            [1, index, replacement],
            [2, 2, values.length],
          ],
        }),
      ).toBe(
        `${values.reduce((a, b) => a + b, 0)} ${changed.slice(1).reduce((a, b) => a + b, 0)}`,
      );

      const rows = Array.from({ length: 4 }, () =>
        Array.from({ length: 5 }, () => (next() < 0.35 ? "#" : ".")).join(""),
      );
      const seen = new Set<string>();
      let roomCount = 0;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 5; c++) {
          const key = `${r}:${c}`;
          if (rows[r][c] !== "." || seen.has(key)) continue;
          roomCount++;
          const queue: [number, number][] = [[r, c]];
          seen.add(key);
          while (queue.length) {
            const [a, b] = queue.shift()!;
            for (const [dr, dc] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const x = a + dr,
                y = b + dc,
                nextKey = `${x}:${y}`;
              if (
                x < 0 ||
                x >= 4 ||
                y < 0 ||
                y >= 5 ||
                rows[x][y] !== "." ||
                seen.has(nextKey)
              )
                continue;
              seen.add(nextKey);
              queue.push([x, y]);
            }
          }
        }
      expect(run("counting-rooms", { rows })).toBe(String(roomCount));

      const parents = Array.from(
        { length: 5 },
        (_, i) => 1 + Math.floor(next() * (i + 1)),
      );
      const expected = Array.from({ length: 6 }, (_, manager) => {
        let count = 0;
        for (let employee = 2; employee <= 6; employee++) {
          let at = employee;
          while (at > 1) {
            at = parents[at - 2];
            if (at === manager + 1) {
              count++;
              break;
            }
          }
        }
        return count;
      });
      expect(run("subordinates", { parents })).toBe(expected.join(" "));

      const roads: [number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const a = 1 + Math.floor(next() * 5);
        let b = 1 + Math.floor(next() * 5);
        if (a === b) b = (b % 5) + 1;
        roads.push([a, b]);
      }
      const added: [number, number][] = [],
        answers: string[] = [];
      for (const road of roads) {
        added.push(road);
        const component = Array.from({ length: 6 }, (_, i) => i);
        const root = (x: number): number => {
          while (component[x] !== x) x = component[x];
          return x;
        };
        for (const [a, b] of added) component[root(a)] = root(b);
        const counts = new Map<number, number>();
        for (let city = 1; city <= 5; city++) {
          const r = root(city);
          counts.set(r, (counts.get(r) ?? 0) + 1);
        }
        answers.push(`${counts.size} ${Math.max(...counts.values())}`);
      }
      expect(run("road-construction", { cities: 5, roads })).toBe(
        answers.join(" | "),
      );
    }
  });

  it("reveals roads only as they are constructed and stores subtree counts separately from depth", () => {
    const roads = getProblem("road-construction")!.run({
      cities: 3,
      roads: [
        [1, 2],
        [2, 3],
      ],
    });
    expect(
      Object.keys(roads.timeline.initialState.entities).filter((id) =>
        id.startsWith("graph:edge:"),
      ),
    ).toHaveLength(0);
    const firstRoad = roads.events.find(
      (event) => event.type === "CREATE_ENTITY",
    )!;
    expect(
      roads.timeline.seek(firstRoad.step).entities["graph:edge:0"].metadata,
    ).toMatchObject({ from: "1", to: "2" });
    expect(
      roads.timeline.seek(firstRoad.step).entities["graph:edge:1"],
    ).toBeUndefined();
    const tree = getProblem("subordinates")!.run({ parents: [1, 1, 2, 3] });
    const root = tree.timeline.seek(tree.timeline.length).entities[
      "tree:node:1"
    ];
    expect(root.metadata?.subtreeSize).toBe(4);
    expect(root.metadata?.depth).toBeUndefined();
  });
});
