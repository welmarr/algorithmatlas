import {
  emptyState,
  type ProblemMetadata,
  type RawTraceEvent,
} from "@sim/domain";
import { runArrayScript } from "@sim/code-runtime";
import {
  defineProblem,
  readObject,
  integer,
  InputError,
  runProblem,
  toProblemEntry,
  type ProblemDefinition,
  type ProblemEntry,
} from "@sim/problem-sdk";
import type { EventDraft, EventType } from "@sim/semantic-events";
import { mapBfsTrace, recordBfs } from "./bfs-mapper";
import { arrayProblems } from "./extended-arrays";
import { graphProblems } from "./extended-graphs";
import { mixedProblems } from "./extended-mixed";
import { introductoryProblems } from "./introductory";
import { sortingSearchingProblems } from "./sorting-searching";
import { dynamicProgrammingProblems } from "./dynamic-programming";
import { graphFoundationProblems } from "./graph-foundations";
import { graphAlgorithmProblems } from "./graph-algorithms";
import { treeAlgorithmProblems } from "./tree-algorithms";
import { rangeAlgorithmProblems } from "./range-algorithms";
import { stringAlgorithmProblems } from "./string-algorithms";
import { dynamicAdvancedProblems } from "./dynamic-advanced";
import { dagRouteProblems } from "./dag-routes";

function meta(
  input: Omit<
    ProblemMetadata,
    "schemaVersion" | "source" | "constraints" | "tags"
  > & {
    constraints?: ProblemMetadata["constraints"];
    tags?: string[];
    sourcePath?: string;
  },
): ProblemMetadata {
  const { sourcePath, ...rest } = input;
  return {
    ...rest,
    schemaVersion: "0.1",
    source: {
      name: "CSES Problem Set",
      url: `https://cses.fi/problemset/task/${sourcePath}`,
    },
    constraints: input.constraints ?? [],
    tags: input.tags ?? [],
  };
}
function draft(
  type: EventType,
  entities: string[],
  explanation: string,
  payload: EventDraft["payload"] = {},
  line?: number,
): EventDraft {
  return {
    type,
    entities,
    explanation,
    payload,
    sourceRef: line ? { file: "solution.ts", line } : undefined,
  };
}
function arrayInput(raw: unknown): { values: number[] } {
  const value = readObject(raw).values;
  if (!Array.isArray(value) || value.length < 1 || value.length > 64)
    throw new InputError("values must contain 1–64 integers");
  return {
    values: value.map((item, i) =>
      integer(item, `values[${i}]`, -100000, 100000),
    ),
  };
}

const increasingArray = defineProblem({
  teachingStrategy: "monotone-array",
  metadata: meta({
    id: "increasing-array",
    title: "Increasing Array",
    category: "Arrays",
    renderer: "array",
    sourcePath: "1094",
    summary: "Make an array nondecreasing using the fewest increments.",
    constraints: [
      { label: "Array size", value: "1–64 in the interactive editor" },
    ],
    tags: ["greedy", "array"],
    examples: [{ input: '{"values":[3,2,5,1,7]}', output: "5" }],
    complexity: { time: "O(n)", space: "O(1)" },
    learning: {
      intuition:
        "Each value must reach at least the value immediately before it.",
      approach: [
        "Keep the largest value required so far.",
        "Raise a smaller value to that threshold.",
        "Count only the increments made.",
      ],
      naive:
        "Repeatedly scan for decreasing neighbors; this revisits elements unnecessarily.",
      explanation:
        "A left-to-right greedy choice is forced: lowering earlier values is not allowed, so each smaller value must be increased.",
    },
  }),
  defaultInput: { values: [3, 2, 5, 1, 7] },
  source: `let required = values[0];
let moves = 0;
for (let i = 1; i < values.length; i++) {
  let current = values[i];
  if (current < required) {
    moves = moves + required - current;
    values[i] = required;
  } else {
    required = current;
  }
}
return moves;`,
  parseInput: arrayInput,
  trace(input) {
    return runArrayScript(input.values, this.source);
  },
});

interface GridInput {
  rows: string[];
}
function gridInput(raw: unknown): GridInput {
  const rows = readObject(raw).rows;
  if (
    !Array.isArray(rows) ||
    rows.length < 2 ||
    rows.length > 16 ||
    !rows.every(
      (row) =>
        typeof row === "string" &&
        /^[.#AB]+$/.test(row) &&
        row.length === rows[0].length &&
        row.length >= 2 &&
        row.length <= 24,
    )
  )
    throw new InputError(
      "rows must be a rectangular grid of ., #, A and B (2–16 rows, 2–24 columns)",
    );
  const cells = rows.join("");
  if (cells.split("A").length !== 2 || cells.split("B").length !== 2)
    throw new InputError("Grid needs exactly one A and one B");
  return { rows };
}
const labyrinth = defineProblem({
  metadata: meta({
    id: "labyrinth",
    title: "Labyrinth",
    category: "Grids",
    renderer: "grid",
    sourcePath: "1193",
    summary: "Find a shortest walk from A to B through open cells.",
    constraints: [
      {
        label: "Interactive grid",
        value: "2–16 rows and 2–24 columns; exactly one A and B",
      },
    ],
    tags: ["BFS", "grid"],
    examples: [{ input: '{"rows":["A..",".#.","..B"]}', output: "4" }],
    complexity: { time: "O(rows × columns)", space: "O(rows × columns)" },
    learning: {
      intuition:
        "Breadth-first search explores all cells at distance d before distance d + 1.",
      approach: [
        "Enqueue the start.",
        "Discover each open neighbor once.",
        "Record parent cells and reconstruct the path.",
      ],
      explanation:
        "The first discovery of B gives a shortest path because every move has equal cost.",
    },
  }),
  defaultInput: { rows: ["A....", ".##..", "...#.", "...#B", "....."] },
  source: `const queue = [start];\nseen.add(start);\nwhile (queue.length) {\n  const cell = queue.shift()!;\n  if (cell === target) break;\n  for (const next of neighbors(cell)) {\n    if (open(next) && !seen.has(next)) {\n      seen.add(next); parent[next] = cell;\n      queue.push(next);\n    }\n  }\n}\nreturn reconstruct(parent, target);`,
  parseInput: gridInput,
  trace(input) {
    const state = emptyState();
    const rawTrace: RawTraceEvent[] = [];
    const rows = input.rows;
    const h = rows.length,
      w = rows[0].length;
    let start = "",
      target = "";
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        const id = `grid:${r}:${c}`,
          cell = rows[r][c];
        state.entities[id] = {
          id,
          kind: "grid",
          label: cell,
          status: cell === "#" ? "blocked" : "idle",
          metadata: { row: r, col: c },
        };
        if (cell === "A") start = id;
        if (cell === "B") target = id;
      }
    const q = [start],
      seen = new Set([start]),
      parent = new Map<string, string>(),
      distance = new Map([[start, 0]]);
    recordBfs(rawTrace, "discover", start, "Start at A.", {}, 2);
    recordBfs(rawTrace, "queue-push", start, "Put A in the queue.", {}, 1);
    while (q.length) {
      const id = q.shift()!;
      recordBfs(rawTrace, "queue-pop", id, `Process ${id}.`, {}, 4);
      recordBfs(rawTrace, "visit", id, `Visit ${id}.`, {}, 4);
      if (id === target) break;
      const [, rs, cs] = id.split(":");
      const r = Number(rs),
        c = Number(cs);
      for (const [dr, dc] of [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ]) {
        const nr = r + dr,
          nc = c + dc,
          next = `grid:${nr}:${nc}`;
        if (
          nr < 0 ||
          nr >= h ||
          nc < 0 ||
          nc >= w ||
          rows[nr][nc] === "#" ||
          seen.has(next)
        )
          continue;
        seen.add(next);
        parent.set(next, id);
        distance.set(next, distance.get(id)! + 1);
        q.push(next);
        recordBfs(
          rawTrace,
          "discover",
          next,
          `Discover ${next} from ${id}.`,
          {},
          8,
        );
        recordBfs(
          rawTrace,
          "set-distance",
          next,
          `Distance to ${next} is ${distance.get(next)}.`,
          { value: distance.get(next)! },
          8,
        );
        recordBfs(rawTrace, "queue-push", next, `Enqueue ${next}.`, {}, 9);
      }
    }
    if (seen.has(target)) {
      for (let at = target; at !== start; at = parent.get(at)!)
        recordBfs(
          rawTrace,
          "mark-path",
          at,
          `${at} belongs to the shortest path.`,
          { status: "path" },
          13,
        );
      recordBfs(
        rawTrace,
        "mark-path",
        start,
        "The path begins at A.",
        { status: "path" },
        13,
      );
    }
    return {
      initialState: state,
      rawTrace,
      events: mapBfsTrace(rawTrace, "grid"),
      output: seen.has(target) ? `${distance.get(target)} steps` : "No path",
    };
  },
});

interface GraphInput {
  nodes: string[];
  edges: [string, string][];
  source: string;
  target: string;
}
function graphInput(raw: unknown): GraphInput {
  const obj = readObject(raw),
    nodes = obj.nodes,
    edges = obj.edges;
  if (
    !Array.isArray(nodes) ||
    nodes.length < 2 ||
    nodes.length > 16 ||
    !nodes.every(
      (n) => typeof n === "string" && /^[A-Za-z0-9_-]{1,12}$/.test(n),
    ) ||
    new Set(nodes).size !== nodes.length
  )
    throw new InputError("nodes must have 2–16 unique short IDs");
  if (
    !Array.isArray(edges) ||
    edges.length > 40 ||
    !edges.every(
      (edge) =>
        Array.isArray(edge) &&
        edge.length === 2 &&
        edge.every((n) => nodes.includes(n)) &&
        edge[0] !== edge[1],
    )
  )
    throw new InputError("edges must connect existing distinct nodes");
  if (
    typeof obj.source !== "string" ||
    !nodes.includes(obj.source) ||
    typeof obj.target !== "string" ||
    !nodes.includes(obj.target)
  )
    throw new InputError("source and target must be node IDs");
  return {
    nodes,
    edges: edges as [string, string][],
    source: obj.source,
    target: obj.target,
  };
}
const messageRoute = defineProblem({
  metadata: meta({
    id: "message-route",
    title: "Message Route",
    category: "Graphs",
    renderer: "graph",
    sourcePath: "1667",
    summary: "Find a route with the fewest edges between two nodes.",
    constraints: [
      { label: "Interactive graph", value: "2–16 nodes and up to 40 edges" },
    ],
    tags: ["BFS", "shortest path"],
    examples: [
      {
        input:
          '{"nodes":["A","B","C"],"edges":[["A","B"],["B","C"]],"source":"A","target":"C"}',
        output: "A → B → C",
      },
    ],
    complexity: { time: "O(V + E)", space: "O(V + E)" },
    learning: {
      intuition: "Each BFS layer represents routes with one more edge.",
      approach: [
        "Start at the source node.",
        "Discover unseen neighbors and remember their parents.",
        "Follow parents backward from the target.",
      ],
      explanation:
        "BFS finds a shortest unweighted route because the queue processes nodes in distance order.",
    },
  }),
  defaultInput: {
    nodes: ["A", "B", "C", "D", "E", "F"],
    edges: [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "E"],
      ["D", "F"],
      ["E", "F"],
    ] as [string, string][],
    source: "A",
    target: "F",
  },
  source: `const queue = [source];\nconst parent = new Map();\nwhile (queue.length) {\n  const node = queue.shift()!;\n  if (node === target) break;\n  for (const next of neighbors(node)) {\n    if (!parent.has(next)) {\n      parent.set(next, node);\n      queue.push(next);\n    }\n  }\n}\nreturn route(parent, target);`,
  parseInput: graphInput,
  trace(input) {
    const state = emptyState(),
      rawTrace: RawTraceEvent[] = [],
      adjacency = new Map(input.nodes.map((node) => [node, [] as string[]]));
    input.nodes.forEach((node) => {
      const id = `graph:node:${node}`;
      state.entities[id] = {
        id,
        kind: "graph-node",
        label: node,
        status: "idle",
      };
    });
    input.edges.forEach(([a, b], i) => {
      adjacency.get(a)!.push(b);
      adjacency.get(b)!.push(a);
      const id = `graph:edge:${i}`;
      state.entities[id] = {
        id,
        kind: "graph-edge",
        label: `${a}–${b}`,
        status: "idle",
        metadata: { from: a, to: b },
      };
    });
    const seen = new Set([input.source]),
      parent = new Map<string, string>(),
      distance = new Map([[input.source, 0]]),
      q = [input.source];
    recordBfs(
      rawTrace,
      "discover",
      `graph:node:${input.source}`,
      `Start at ${input.source}.`,
      {},
      1,
    );
    recordBfs(
      rawTrace,
      "queue-push",
      `graph:node:${input.source}`,
      `Enqueue ${input.source}.`,
      {},
      1,
    );
    while (q.length) {
      const node = q.shift()!;
      recordBfs(
        rawTrace,
        "queue-pop",
        `graph:node:${node}`,
        `Take ${node} from the queue.`,
        {},
        4,
      );
      recordBfs(
        rawTrace,
        "visit",
        `graph:node:${node}`,
        `Visit ${node}.`,
        {},
        4,
      );
      if (node === input.target) break;
      for (const next of adjacency.get(node)!) {
        if (seen.has(next)) continue;
        seen.add(next);
        parent.set(next, node);
        distance.set(next, distance.get(node)! + 1);
        q.push(next);
        recordBfs(
          rawTrace,
          "discover",
          `graph:node:${next}`,
          `Discover ${next} from ${node}.`,
          {},
          8,
        );
        recordBfs(
          rawTrace,
          "set-parent",
          `graph:node:${next}`,
          `Set parent of ${next} to ${node}.`,
          { value: node },
          8,
        );
        recordBfs(
          rawTrace,
          "set-distance",
          `graph:node:${next}`,
          `Distance to ${next} is ${distance.get(next)}.`,
          { value: distance.get(next)! },
          8,
        );
        recordBfs(
          rawTrace,
          "queue-push",
          `graph:node:${next}`,
          `Enqueue ${next}.`,
          {},
          9,
        );
      }
    }
    const path: string[] = [];
    if (seen.has(input.target)) {
      for (let at = input.target; at !== input.source; at = parent.get(at)!)
        path.push(at);
      path.push(input.source);
      path.reverse();
      path.forEach((node) =>
        recordBfs(
          rawTrace,
          "mark-path",
          `graph:node:${node}`,
          `${node} is on the route.`,
          { status: "path" },
          13,
        ),
      );
    }
    return {
      initialState: state,
      rawTrace,
      events: mapBfsTrace(rawTrace, "graph"),
      output: path.length ? path.join(" → ") : "No route",
    };
  },
});

interface TreeInput {
  nodes: string[];
  edges: [string, string][];
}
function treeInput(raw: unknown): TreeInput {
  const obj = readObject(raw);
  const nodes = obj.nodes,
    edges = obj.edges;
  if (
    !Array.isArray(nodes) ||
    nodes.length < 2 ||
    nodes.length > 16 ||
    !nodes.every(
      (n) => typeof n === "string" && /^[A-Za-z0-9_-]{1,12}$/.test(n),
    ) ||
    new Set(nodes).size !== nodes.length
  )
    throw new InputError("nodes must have 2–16 unique short IDs");
  if (
    !Array.isArray(edges) ||
    edges.length !== nodes.length - 1 ||
    !edges.every(
      (edge) =>
        Array.isArray(edge) &&
        edge.length === 2 &&
        edge.every((n) => nodes.includes(n)) &&
        edge[0] !== edge[1],
    )
  )
    throw new InputError("A tree needs exactly n − 1 valid edges");
  const adjacency = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const [a, b] of edges as [string, string][]) {
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  }
  const seen = new Set<string>(),
    pending = [nodes[0] as string];
  while (pending.length) {
    const node = pending.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    pending.push(...adjacency.get(node)!);
  }
  if (seen.size !== nodes.length)
    throw new InputError("Tree edges must connect every node");
  return { nodes, edges: edges as [string, string][] };
}
const treeDiameter = defineProblem({
  metadata: meta({
    id: "tree-diameter",
    title: "Tree Diameter",
    category: "Trees",
    renderer: "tree",
    sourcePath: "1131",
    summary: "Find the longest simple path in a tree.",
    constraints: [{ label: "Interactive tree", value: "2–16 connected nodes" }],
    tags: ["tree", "BFS"],
    examples: [
      {
        input: '{"nodes":["A","B","C"],"edges":[["A","B"],["B","C"]]}',
        output: "2 edges",
      },
    ],
    complexity: { time: "O(V)", space: "O(V)" },
    learning: {
      intuition: "A farthest node from any start is an endpoint of a diameter.",
      approach: [
        "Traverse from any node to find endpoint u.",
        "Traverse from u to find the farthest node v.",
        "The distance from u to v is the diameter.",
      ],
      explanation:
        "In a tree each pair has a unique path, and two farthest-point traversals locate a longest path.",
    },
  }),
  defaultInput: {
    nodes: ["A", "B", "C", "D", "E", "F"],
    edges: [
      ["A", "B"],
      ["B", "C"],
      ["B", "D"],
      ["D", "E"],
      ["E", "F"],
    ] as [string, string][],
  },
  source: `function farthest(start) {\n  const queue = [start], distance = new Map([[start, 0]]);\n  while (queue.length) {\n    const node = queue.shift()!;\n    for (const next of neighbors(node)) {\n      if (!distance.has(next)) {\n        distance.set(next, distance.get(node)! + 1);\n        queue.push(next);\n      }\n    }\n  }\n  return maxDistance(distance);\n}\nconst u = farthest(nodes[0]);\nreturn farthest(u);`,
  parseInput: treeInput,
  trace(input) {
    const state = emptyState(),
      events: EventDraft[] = [],
      adjacency = new Map(input.nodes.map((node) => [node, [] as string[]]));
    input.nodes.forEach((node) => {
      const id = `tree:node:${node}`;
      state.entities[id] = {
        id,
        kind: "tree-node",
        label: node,
        status: "idle",
      };
    });
    input.edges.forEach(([a, b]) => {
      adjacency.get(a)!.push(b);
      adjacency.get(b)!.push(a);
    });
    const layoutSeen = new Set([input.nodes[0]]),
      layoutQueue = [input.nodes[0]];
    while (layoutQueue.length) {
      const node = layoutQueue.shift()!;
      for (const next of adjacency.get(node)!)
        if (!layoutSeen.has(next)) {
          layoutSeen.add(next);
          layoutQueue.push(next);
          state.entities[`tree:node:${next}`].metadata = { parent: node };
        }
    }
    function farthest(
      start: string,
      pass: number,
    ): { node: string; distance: number; parent: Map<string, string> } {
      const q = [start],
        distance = new Map([[start, 0]]),
        parent = new Map<string, string>();
      let last = start;
      events.push(
        draft(
          "ANNOTATE",
          [],
          `Pass ${pass}: search from ${start}.`,
          { variable: "pass", value: pass },
          13,
        ),
      );
      while (q.length) {
        const node = q.shift()!;
        last = node;
        events.push(
          draft(
            "VISIT_TREE_NODE",
            [`tree:node:${node}`],
            `Pass ${pass}: visit ${node}, depth ${distance.get(node)}.`,
            {},
            4,
          ),
        );
        events.push(
          draft(
            "SET_DEPTH",
            [`tree:node:${node}`],
            `Depth of ${node} is ${distance.get(node)}.`,
            { value: distance.get(node)! },
            6,
          ),
        );
        for (const next of adjacency.get(node)!)
          if (!distance.has(next)) {
            distance.set(next, distance.get(node)! + 1);
            parent.set(next, node);
            q.push(next);
          }
      }
      return { node: last, distance: distance.get(last)!, parent };
    }
    const first = farthest(input.nodes[0], 1),
      second = farthest(first.node, 2);
    for (let at = second.node; at !== first.node; at = second.parent.get(at)!)
      events.push(
        draft(
          "MARK",
          [`tree:node:${at}`],
          `${at} is on a diameter.`,
          { status: "path" },
          14,
        ),
      );
    events.push(
      draft(
        "MARK",
        [`tree:node:${first.node}`],
        `${first.node} is a diameter endpoint.`,
        { status: "path" },
        14,
      ),
    );
    return { initialState: state, events, output: `${second.distance} edges` };
  },
});

function diceInput(raw: unknown): { target: number } {
  return { target: integer(readObject(raw).target, "target", 0, 48) };
}
const diceCombinations = defineProblem({
  metadata: meta({
    id: "dice-combinations",
    title: "Dice Combinations",
    category: "Dynamic Programming",
    renderer: "dp",
    sourcePath: "1633",
    summary: "Count ordered dice rolls that add up to a target.",
    constraints: [{ label: "Interactive target", value: "0–48" }],
    tags: ["DP", "counting"],
    examples: [{ input: '{"target":3}', output: "4" }],
    complexity: { time: "O(6n)", space: "O(n)" },
    learning: {
      intuition: "The final roll can be any value from 1 to 6.",
      approach: [
        "Set dp[0] = 1 for the empty sequence.",
        "For each sum, add counts for all valid prior sums.",
        "Read dp[target].",
      ],
      explanation:
        "Each ordered sequence has a unique last roll, so the six predecessor counts form a disjoint sum.",
    },
  }),
  defaultInput: { target: 10 },
  source: `const dp = Array(target + 1).fill(0);\ndp[0] = 1;\nfor (let sum = 1; sum <= target; sum++) {\n  for (let die = 1; die <= 6; die++) {\n    if (sum >= die) dp[sum] += dp[sum - die];\n  }\n}\nreturn dp[target];`,
  parseInput: diceInput,
  trace(input) {
    const state = emptyState(),
      events: EventDraft[] = [],
      dp = Array<number>(input.target + 1).fill(0);
    dp.forEach((_, i) => {
      const id = `dp:${i}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: String(i),
        value: 0,
        status: "idle",
      };
    });
    dp[0] = 1;
    events.push(
      draft(
        "DP_BASE_CASE",
        ["dp:0"],
        "There is one way to make zero: roll nothing.",
        { value: 1 },
        2,
      ),
    );
    for (let sum = 1; sum <= input.target; sum++) {
      for (let die = 1; die <= 6 && die <= sum; die++) {
        events.push(
          draft(
            "DP_READ",
            [`dp:${sum - die}`],
            `A last roll of ${die} uses dp[${sum - die}] = ${dp[sum - die]}.`,
            { variable: "die", value: die },
            5,
          ),
        );
        dp[sum] += dp[sum - die];
        events.push(
          draft(
            "DP_UPDATE",
            [`dp:${sum}`, `dp:${sum - die}`],
            `dp[${sum}] = ${dp[sum] - dp[sum - die]} + dp[${sum - die}] (${dp[sum - die]}) = ${dp[sum]}; choose ${die} as the last roll.`,
            { value: dp[sum], variable: "sum" },
            5,
          ),
        );
      }
    }
    return { initialState: state, events, output: String(dp[input.target]) };
  },
});

export type { ProblemEntry } from "@sim/problem-sdk";
function entry<T>(problem: ProblemDefinition<T>): ProblemEntry {
  return toProblemEntry(problem);
}
export const problems: ProblemEntry[] = [
  {
    ...entry(increasingArray),
    runCode: (raw, source) =>
      runProblem(
        {
          ...increasingArray,
          source,
          teachingStrategy:
            source === increasingArray.source ? "monotone-array" : undefined,
        },
        raw,
      ),
  },
  entry(labyrinth),
  entry(messageRoute),
  entry(treeDiameter),
  entry(diceCombinations),
  ...arrayProblems,
  ...graphProblems,
  ...mixedProblems,
  ...introductoryProblems,
  ...sortingSearchingProblems,
  ...dynamicProgrammingProblems,
  ...graphFoundationProblems,
  ...graphAlgorithmProblems,
  ...treeAlgorithmProblems,
  ...rangeAlgorithmProblems,
  ...stringAlgorithmProblems,
  ...dynamicAdvancedProblems,
  ...dagRouteProblems,
];
export function getProblem(id: string): ProblemEntry | undefined {
  return problems.find((problem) => problem.metadata.id === id);
}
