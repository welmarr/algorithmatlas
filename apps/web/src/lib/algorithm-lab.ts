import {
  emptyState,
  type RendererKind,
  type SimulationState,
  type TeachingStep,
} from "@sim/domain";
import {
  createEvents,
  type AlgorithmEvent,
  type EventDraft,
  type EventType,
} from "@sim/semantic-events";
import { createTeachingSteps, SimulationTimeline } from "@sim/simulation-core";

export type LabStructure = "array" | "grid" | "graph" | "tree";
export type LabAlgorithm =
  | "insertion-sort"
  | "linear-search"
  | "grid-bfs"
  | "grid-dfs"
  | "graph-bfs"
  | "graph-dfs"
  | "tree-preorder"
  | "tree-level-order";
export type LabInput =
  | { values: number[]; target: number }
  | { rows: string[] }
  | { nodes: string[]; edges: [string, string][]; start: string; goal: string }
  | { parents: number[] };

export interface LabAlgorithmInfo {
  id: LabAlgorithm;
  title: string;
  structure: LabStructure;
  complexity: string;
  source: string;
  description: string;
}
export const labAlgorithms: Record<LabStructure, LabAlgorithmInfo[]> = {
  array: [
    {
      id: "insertion-sort",
      title: "Insertion sort",
      structure: "array",
      complexity: "O(n²) time · O(1) space",
      description: "Insert each value into its sorted prefix.",
      source: `for (let i=1; i<values.length; i++) {\n  let j=i;\n  while (j>0 && values[j-1]>values[j]) {\n    [values[j-1],values[j]]=[values[j],values[j-1]];\n    j--;\n  }\n}\nreturn values;`,
    },
    {
      id: "linear-search",
      title: "Linear search",
      structure: "array",
      complexity: "O(n) time · O(1) space",
      description: "Inspect each value until the target is found.",
      source: `for (let i=0; i<values.length; i++) {\n  if (values[i]===target) return i;\n}\nreturn -1;`,
    },
  ],
  grid: [
    {
      id: "grid-bfs",
      title: "Grid BFS",
      structure: "grid",
      complexity: "O(cells) time · O(cells) space",
      description: "Search by distance layers for a shortest route.",
      source: `const queue=[start], seen=new Set([start]);\nwhile (queue.length) {\n  const cell=queue.shift();\n  for (const next of openNeighbors(cell)) if (!seen.has(next)) {\n    seen.add(next); parent.set(next,cell); queue.push(next);\n  }\n}\nreturn pathToGoal(parent);`,
    },
    {
      id: "grid-dfs",
      title: "Grid DFS",
      structure: "grid",
      complexity: "O(cells) time · O(cells) space",
      description: "Follow a path deeply, then backtrack.",
      source: `const stack=[start], seen=new Set([start]);\nwhile (stack.length) {\n  const cell=stack.pop();\n  for (const next of openNeighbors(cell)) if (!seen.has(next)) {\n    seen.add(next); parent.set(next,cell); stack.push(next);\n  }\n}\nreturn pathToGoal(parent);`,
    },
  ],
  graph: [
    {
      id: "graph-bfs",
      title: "Graph BFS",
      structure: "graph",
      complexity: "O(V + E) time · O(V) space",
      description: "Explore neighbors in layers.",
      source: `const queue=[start], seen=new Set([start]);\nwhile (queue.length) {\n  const node=queue.shift();\n  for (const next of neighbors(node)) if (!seen.has(next)) {\n    seen.add(next); parent.set(next,node); queue.push(next);\n  }\n}\nreturn pathToGoal(parent);`,
    },
    {
      id: "graph-dfs",
      title: "Graph DFS",
      structure: "graph",
      complexity: "O(V + E) time · O(V) space",
      description: "Explore one branch before another.",
      source: `const stack=[start], seen=new Set([start]);\nwhile (stack.length) {\n  const node=stack.pop();\n  for (const next of neighbors(node)) if (!seen.has(next)) {\n    seen.add(next); parent.set(next,node); stack.push(next);\n  }\n}\nreturn pathToGoal(parent);`,
    },
  ],
  tree: [
    {
      id: "tree-preorder",
      title: "Preorder DFS",
      structure: "tree",
      complexity: "O(n) time · O(n) space",
      description: "Visit a parent before its children.",
      source: `const stack=[1], order=[];\nwhile (stack.length) {\n  const node=stack.pop(); order.push(node);\n  for (const child of [...children[node]].reverse()) stack.push(child);\n}\nreturn order;`,
    },
    {
      id: "tree-level-order",
      title: "Level-order BFS",
      structure: "tree",
      complexity: "O(n) time · O(n) space",
      description: "Visit a level before the next one.",
      source: `const queue=[1], order=[];\nwhile (queue.length) {\n  const node=queue.shift(); order.push(node);\n  for (const child of children[node]) queue.push(child);\n}\nreturn order;`,
    },
  ],
};

export class LabInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabInputError";
  }
}
export interface LabRun {
  timeline: SimulationTimeline;
  events: AlgorithmEvent[];
  teachingSteps: TeachingStep[];
  output: string;
  info: LabAlgorithmInfo;
  input: LabInput;
}
function event(
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
    sourceRef: line ? { file: "algorithm.ts", line } : undefined,
  };
}
function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    throw new LabInputError(
      `${label} must be an integer from ${min} to ${max}`,
    );
  return value as number;
}
function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new LabInputError("Input must be an object");
  return raw as Record<string, unknown>;
}
function validate(structure: LabStructure, raw: unknown): LabInput {
  const obj = record(raw);
  if (structure === "array") {
    const values = obj.values;
    if (!Array.isArray(values) || values.length < 1 || values.length > 20)
      throw new LabInputError("Array needs 1–20 values");
    return {
      values: values.map((v, i) => integer(v, `values[${i}]`, -999, 999)),
      target: integer(obj.target, "target", -999, 999),
    };
  }
  if (structure === "grid") {
    const rows = obj.rows;
    if (
      !Array.isArray(rows) ||
      rows.length < 2 ||
      rows.length > 8 ||
      !rows.every(
        (row) =>
          typeof row === "string" &&
          row.length === rows[0].length &&
          row.length >= 2 &&
          row.length <= 8 &&
          /^[.#AB]+$/.test(row),
      ) ||
      rows.join("").split("A").length !== 2 ||
      rows.join("").split("B").length !== 2
    )
      throw new LabInputError(
        "Grid needs 2–8 rows and columns, one A and one B, using . and #",
      );
    return { rows: rows as string[] };
  }
  if (structure === "graph") {
    const nodes = obj.nodes,
      edges = obj.edges;
    if (
      !Array.isArray(nodes) ||
      nodes.length < 2 ||
      nodes.length > 10 ||
      !nodes.every(
        (node) =>
          typeof node === "string" && /^[A-Za-z0-9_-]{1,12}$/.test(node),
      ) ||
      new Set(nodes).size !== nodes.length
    )
      throw new LabInputError("Graph needs 2–10 unique short node IDs");
    if (
      !Array.isArray(edges) ||
      edges.length > 24 ||
      !edges.every(
        (edge) =>
          Array.isArray(edge) &&
          edge.length === 2 &&
          nodes.includes(edge[0]) &&
          nodes.includes(edge[1]) &&
          edge[0] !== edge[1],
      )
    )
      throw new LabInputError("Graph edges must connect distinct listed nodes");
    if (
      typeof obj.start !== "string" ||
      !nodes.includes(obj.start) ||
      typeof obj.goal !== "string" ||
      !nodes.includes(obj.goal)
    )
      throw new LabInputError("Start and goal must be listed nodes");
    return {
      nodes: nodes as string[],
      edges: edges as [string, string][],
      start: obj.start,
      goal: obj.goal,
    };
  }
  const parents = obj.parents;
  if (
    !Array.isArray(parents) ||
    parents.length > 9 ||
    !parents.every(
      (parent, i) =>
        Number.isSafeInteger(parent) && parent >= 1 && parent <= i + 1,
    )
  )
    throw new LabInputError("Tree needs 1–10 nodes with valid parent IDs");
  return { parents: parents as number[] };
}

function arrayTrace(
  input: { values: number[]; target: number },
  algorithm: LabAlgorithm,
) {
  const state = emptyState(),
    events: EventDraft[] = [],
    values = [...input.values];
  values.forEach((value, i) => {
    const id = `array:${i}`;
    state.entities[id] = {
      id,
      kind: "array",
      label: String(i),
      value,
      status: "idle",
    };
  });
  if (algorithm === "linear-search") {
    let found = -1;
    for (let i = 0; i < values.length; i++) {
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Inspect index ${i}: ${values[i]}.`,
          { value: values[i] },
          1,
        ),
      );
      if (values[i] === input.target) {
        found = i;
        events.push(
          event(
            "MARK",
            [`array:${i}`],
            `Found ${input.target} at index ${i}.`,
            { status: "path" },
            2,
          ),
        );
        break;
      }
    }
    return { state, events, output: String(found) };
  }
  for (let i = 1; i < values.length; i++) {
    let j = i;
    events.push(
      event(
        "MARK",
        [`array:${i}`],
        `Insert ${values[i]} into the sorted prefix.`,
        { status: "active" },
        1,
      ),
    );
    while (j > 0 && values[j - 1] > values[j]) {
      const left = values[j - 1],
        right = values[j];
      [values[j - 1], values[j]] = [right, left];
      events.push(
        event(
          "SWAP",
          [`array:${j - 1}`, `array:${j}`],
          `Swap ${left} and ${right}; smaller value moves left.`,
          {},
          4,
        ),
      );
      j--;
    }
    events.push(
      event("UNMARK", [`array:${i}`], `Prefix through ${i} is sorted.`, {}, 5),
    );
  }
  return { state, events, output: values.join(" ") };
}

interface TraversalSetup {
  state: SimulationState;
  ids: string[];
  adjacency: Map<string, string[]>;
  start: string;
  goal: string;
  structure: "grid" | "graph";
}
function gridSetup(input: { rows: string[] }): TraversalSetup {
  const state = emptyState(),
    ids: string[] = [],
    adjacency = new Map<string, string[]>();
  let start = "",
    goal = "";
  input.rows.forEach((row, r) =>
    [...row].forEach((char, c) => {
      const id = `grid:${r}:${c}`;
      state.entities[id] = {
        id,
        kind: "grid",
        label: char,
        status: char === "#" ? "blocked" : "idle",
        metadata: { row: r, col: c },
      };
      if (char !== "#") {
        ids.push(id);
        adjacency.set(id, []);
      }
      if (char === "A") start = id;
      if (char === "B") goal = id;
    }),
  );
  for (const id of ids) {
    const [, row, col] = id.split(":").map(Number);
    for (const [dr, dc] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next = `grid:${row + dr}:${col + dc}`;
      if (adjacency.has(next)) adjacency.get(id)!.push(next);
    }
  }
  return { state, ids, adjacency, start, goal, structure: "grid" };
}
function graphSetup(input: {
  nodes: string[];
  edges: [string, string][];
  start: string;
  goal: string;
}): TraversalSetup {
  const state = emptyState(),
    ids = input.nodes.map((node) => `graph:node:${node}`),
    adjacency = new Map(ids.map((id) => [id, [] as string[]]));
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
    adjacency.get(`graph:node:${a}`)!.push(`graph:node:${b}`);
    adjacency.get(`graph:node:${b}`)!.push(`graph:node:${a}`);
    const id = `graph:edge:${i}`;
    state.entities[id] = {
      id,
      kind: "graph-edge",
      label: `${a}–${b}`,
      status: "idle",
      metadata: { from: a, to: b },
    };
  });
  return {
    state,
    ids,
    adjacency,
    start: `graph:node:${input.start}`,
    goal: `graph:node:${input.goal}`,
    structure: "graph",
  };
}
function traversalTrace(setup: TraversalSetup, depthFirst: boolean) {
  const { state, ids, adjacency, start, goal, structure } = setup,
    events: EventDraft[] = [],
    seen = new Set([start]),
    parent = new Map<string, string>(),
    pending = [start],
    visited: string[] = [];
  const discovery: EventType =
      structure === "grid" ? "DISCOVER_CELL" : "DISCOVER_NODE",
    visit: EventType = structure === "grid" ? "VISIT_CELL" : "VISIT_NODE";
  const item = new Map(ids.map((id, i) => [id, `stack:item:${i}`]));
  if (depthFirst)
    ids.forEach((id, i) => {
      const stackId = `stack:item:${i}`;
      state.entities[stackId] = {
        id: stackId,
        kind: "stack-item",
        label: state.entities[id].label,
        status: "idle",
      };
    });
  const push = (id: string) =>
    events.push(
      event(
        depthFirst ? "STACK_PUSH" : "QUEUE_PUSH",
        [depthFirst ? item.get(id)! : id],
        `Add ${state.entities[id].label} to the ${depthFirst ? "stack" : "queue"}.`,
        {},
        1,
      ),
    );
  const pop = (id: string) =>
    events.push(
      event(
        depthFirst ? "STACK_POP" : "QUEUE_POP",
        [depthFirst ? item.get(id)! : id],
        `Take ${state.entities[id].label} from the ${depthFirst ? "stack" : "queue"}.`,
        {},
        3,
      ),
    );
  events.push(
    event(
      discovery,
      [start],
      `Discover start ${state.entities[start].label}.`,
      {},
      1,
    ),
  );
  push(start);
  while (pending.length) {
    const current = depthFirst ? pending.pop()! : pending.shift()!;
    pop(current);
    visited.push(current);
    events.push(
      event(
        visit,
        [current],
        `Visit ${state.entities[current].label}; ${visited.length} explored.`,
        {},
        3,
      ),
    );
    events.push(
      event(
        "ANNOTATE",
        [],
        `${visited.length} cells or nodes explored.`,
        { variable: "visited", value: visited.length },
        3,
      ),
    );
    if (current === goal) break;
    const neighbors = depthFirst
      ? [...adjacency.get(current)!].reverse()
      : adjacency.get(current)!;
    for (const next of neighbors) {
      if (seen.has(next)) continue;
      seen.add(next);
      parent.set(next, current);
      pending.push(next);
      events.push(
        event(
          discovery,
          [next],
          `Discover ${state.entities[next].label} from ${state.entities[current].label}.`,
          {},
          5,
        ),
      );
      if (structure === "graph")
        events.push(
          event(
            "SET_PARENT",
            [next],
            `${state.entities[current].label} is parent of ${state.entities[next].label}.`,
            { value: state.entities[current].label },
            5,
          ),
        );
      push(next);
    }
  }
  const found = visited.includes(goal),
    path: string[] = [];
  if (found) {
    for (let at = goal; at !== start; at = parent.get(at)!) path.push(at);
    path.push(start);
    path.reverse();
    for (const id of path)
      events.push(
        event(
          "MARK",
          [id],
          `${state.entities[id].label} is on the route.`,
          { status: "path" },
          8,
        ),
      );
  }
  const output = !found
    ? "No route"
    : structure === "grid"
      ? `${path.length - 1} steps`
      : path.map((id) => state.entities[id].label).join(" → ");
  return { state, events, output };
}

function treeTrace(input: { parents: number[] }, depthFirst: boolean) {
  const state = emptyState(),
    events: EventDraft[] = [],
    count = input.parents.length + 1,
    children = Array.from({ length: count + 1 }, () => [] as number[]);
  for (let node = 1; node <= count; node++) {
    const id = `tree:node:${node}`;
    state.entities[id] = {
      id,
      kind: "tree-node",
      label: String(node),
      status: "idle",
      metadata:
        node > 1 ? { parent: String(input.parents[node - 2]) } : undefined,
    };
    if (node > 1) children[input.parents[node - 2]].push(node);
    if (depthFirst) {
      const stackId = `stack:item:${node}`;
      state.entities[stackId] = {
        id: stackId,
        kind: "stack-item",
        label: String(node),
        status: "idle",
      };
    }
  }
  const pending = [1],
    order: number[] = [];
  const push = (node: number) =>
    events.push(
      event(
        depthFirst ? "STACK_PUSH" : "QUEUE_PUSH",
        [depthFirst ? `stack:item:${node}` : `tree:node:${node}`],
        `Add ${node} to the ${depthFirst ? "stack" : "queue"}.`,
        {},
        1,
      ),
    );
  const pop = (node: number) =>
    events.push(
      event(
        depthFirst ? "STACK_POP" : "QUEUE_POP",
        [depthFirst ? `stack:item:${node}` : `tree:node:${node}`],
        `Take ${node} from the ${depthFirst ? "stack" : "queue"}.`,
        {},
        3,
      ),
    );
  push(1);
  while (pending.length) {
    const node = depthFirst ? pending.pop()! : pending.shift()!;
    pop(node);
    order.push(node);
    events.push(
      event(
        "VISIT_TREE_NODE",
        [`tree:node:${node}`],
        `Visit node ${node} in position ${order.length}.`,
        {},
        3,
      ),
    );
    const next = depthFirst ? [...children[node]].reverse() : children[node];
    for (const child of next) {
      pending.push(child);
      push(child);
    }
  }
  return { state, events, output: order.join(" → ") };
}

export function runLab(
  structure: LabStructure,
  algorithm: LabAlgorithm,
  raw: unknown,
): LabRun {
  const info = labAlgorithms[structure].find((item) => item.id === algorithm);
  if (!info)
    throw new LabInputError(`${algorithm} is not available for ${structure}`);
  const input = validate(structure, raw);
  const trace =
    structure === "array"
      ? arrayTrace(input as { values: number[]; target: number }, algorithm)
      : structure === "grid"
        ? traversalTrace(
            gridSetup(input as { rows: string[] }),
            algorithm === "grid-dfs",
          )
        : structure === "graph"
          ? traversalTrace(
              graphSetup(
                input as {
                  nodes: string[];
                  edges: [string, string][];
                  start: string;
                  goal: string;
                },
              ),
              algorithm === "graph-dfs",
            )
          : treeTrace(
              input as { parents: number[] },
              algorithm === "tree-preorder",
            );
  const events = createEvents(trace.events, `lab:${algorithm}:v0.1`);
  const timeline = new SimulationTimeline(trace.state, events, {
    metadata: { problemId: `lab:${algorithm}`, algorithmVersion: "0.1" },
  });
  return {
    timeline,
    events,
    teachingSteps: createTeachingSteps(
      timeline,
      structure as RendererKind,
      trace.output,
    ),
    output: trace.output,
    info,
    input,
  };
}
