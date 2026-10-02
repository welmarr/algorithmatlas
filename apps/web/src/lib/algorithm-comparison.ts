import type { AlgorithmEvent } from "@sim/semantic-events";
import {
  runLab,
  type LabAlgorithm,
  type LabInput,
  type LabRun,
  type LabStructure,
} from "./algorithm-lab";

export type ComparisonId = "graph-search" | "grid-search" | "tree-traversal";
export interface ComparisonDefinition {
  id: ComparisonId;
  title: string;
  structure: LabStructure;
  algorithms: readonly [LabAlgorithm, LabAlgorithm];
  question: string;
  input: LabInput;
}

export const comparisonDefinitions: Record<ComparisonId, ComparisonDefinition> =
  {
    "graph-search": {
      id: "graph-search",
      title: "Graph: BFS vs DFS",
      structure: "graph",
      algorithms: ["graph-bfs", "graph-dfs"],
      question: "How does visit order affect the route found?",
      input: {
        nodes: ["A", "B", "C", "D", "E", "F"],
        edges: [
          ["A", "B"],
          ["A", "C"],
          ["B", "D"],
          ["D", "E"],
          ["E", "F"],
          ["C", "F"],
        ],
        start: "A",
        goal: "F",
      },
    },
    "grid-search": {
      id: "grid-search",
      title: "Grid: BFS vs DFS",
      structure: "grid",
      algorithms: ["grid-bfs", "grid-dfs"],
      question: "Which route reaches B in fewer steps?",
      input: { rows: ["A....", ".##..", "...#.", ".#...", "....B"] },
    },
    "tree-traversal": {
      id: "tree-traversal",
      title: "Tree: preorder vs level order",
      structure: "tree",
      algorithms: ["tree-preorder", "tree-level-order"],
      question: "How does the collection change visit order?",
      input: { parents: [1, 1, 2, 2, 3, 3] },
    },
  };

export interface ComparisonMetrics {
  events: number;
  visited: number;
  discovered: number;
  collectionOperations: number;
  byType: Record<string, number>;
}

/** These are semantic trace counts, never wall-clock benchmarks. */
export function comparisonMetrics(events: AlgorithmEvent[]): ComparisonMetrics {
  const visited = new Set<string>();
  const discovered = new Set<string>();
  const byType: Record<string, number> = {};
  let collectionOperations = 0;
  for (const event of events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    if (["VISIT_NODE", "VISIT_CELL", "VISIT_TREE_NODE"].includes(event.type))
      for (const id of event.entities) visited.add(id);
    if (["DISCOVER_NODE", "DISCOVER_CELL"].includes(event.type))
      for (const id of event.entities) discovered.add(id);
    if (/^(QUEUE|STACK|HEAP)_(PUSH|POP)$/.test(event.type))
      collectionOperations++;
  }
  return {
    events: events.length,
    visited: visited.size,
    discovered: discovered.size,
    collectionOperations,
    byType,
  };
}

function route(run: LabRun): string[] {
  return run.events
    .filter((event) => event.type === "MARK")
    .map((event) => event.entities[0])
    .filter((id): id is string => Boolean(id));
}

function validRoute(
  structure: "graph" | "grid",
  input: LabInput,
  path: string[],
): boolean {
  if (structure === "graph") {
    const graph = input as {
      nodes: string[];
      edges: [string, string][];
      start: string;
      goal: string;
    };
    if (
      path[0] !== `graph:node:${graph.start}` ||
      path.at(-1) !== `graph:node:${graph.goal}`
    )
      return false;
    return path.slice(1).every((node, index) => {
      const previous = path[index].slice("graph:node:".length);
      const next = node.slice("graph:node:".length);
      return graph.edges.some(
        ([a, b]) =>
          (a === previous && b === next) || (b === previous && a === next),
      );
    });
  }
  const grid = input as { rows: string[] };
  const cells = grid.rows.flatMap((row, r) =>
    [...row].map((value, c) => ({ r, c, value })),
  );
  const start = cells.find((cell) => cell.value === "A")!;
  const goal = cells.find((cell) => cell.value === "B")!;
  const coordinates = path.map((id) => {
    const parts = id.split(":");
    return { r: Number(parts[1]), c: Number(parts[2]) };
  });
  if (
    coordinates[0]?.r !== start.r ||
    coordinates[0]?.c !== start.c ||
    coordinates.at(-1)?.r !== goal.r ||
    coordinates.at(-1)?.c !== goal.c
  )
    return false;
  return coordinates.every((cell, index) => {
    if (
      grid.rows[cell.r]?.[cell.c] === undefined ||
      grid.rows[cell.r][cell.c] === "#"
    )
      return false;
    const previous = coordinates[index - 1];
    return (
      !previous ||
      Math.abs(previous.r - cell.r) + Math.abs(previous.c - cell.c) === 1
    );
  });
}

function shortestDistance(
  structure: "graph" | "grid",
  input: LabInput,
): number | null {
  let start: string;
  let goal: string;
  const neighbors = new Map<string, string[]>();
  if (structure === "graph") {
    const graph = input as {
      nodes: string[];
      edges: [string, string][];
      start: string;
      goal: string;
    };
    start = graph.start;
    goal = graph.goal;
    for (const node of graph.nodes) neighbors.set(node, []);
    for (const [a, b] of graph.edges) {
      neighbors.get(a)!.push(b);
      neighbors.get(b)!.push(a);
    }
  } else {
    const grid = input as { rows: string[] };
    start = "";
    goal = "";
    for (let r = 0; r < grid.rows.length; r++)
      for (let c = 0; c < grid.rows[r].length; c++) {
        if (grid.rows[r][c] === "#") continue;
        const id = `${r},${c}`;
        neighbors.set(id, []);
        if (grid.rows[r][c] === "A") start = id;
        if (grid.rows[r][c] === "B") goal = id;
      }
    for (const id of neighbors.keys()) {
      const [r, c] = id.split(",").map(Number);
      for (const next of [
        `${r - 1},${c}`,
        `${r + 1},${c}`,
        `${r},${c - 1}`,
        `${r},${c + 1}`,
      ])
        if (neighbors.has(next)) neighbors.get(id)!.push(next);
    }
  }
  const queue = [start];
  const distance = new Map([[start, 0]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === goal) return distance.get(current)!;
    for (const next of neighbors.get(current) ?? [])
      if (!distance.has(next)) {
        distance.set(next, distance.get(current)! + 1);
        queue.push(next);
      }
  }
  return null;
}

export interface ComparisonResult {
  left: LabRun;
  right: LabRun;
  conclusion: string;
  correctness: readonly [boolean, boolean];
  input: LabInput;
}

export function runComparison(
  id: ComparisonId,
  raw: unknown,
): ComparisonResult {
  const definition = comparisonDefinitions[id];
  const left = runLab(definition.structure, definition.algorithms[0], raw);
  let right: LabRun;
  try {
    right = runLab(definition.structure, definition.algorithms[1], raw);
  } catch (cause) {
    left.timeline.dispose();
    throw cause;
  }
  const input = left.input;
  if (definition.structure === "tree") {
    const count = (input as { parents: number[] }).parents.length + 1;
    const correct = (run: LabRun) => {
      const visits = run.events
        .filter((event) => event.type === "VISIT_TREE_NODE")
        .map((event) => event.entities[0]);
      return (
        visits.length === count &&
        new Set(visits).size === count &&
        Array.from(
          { length: count },
          (_, index) => `tree:node:${index + 1}`,
        ).every((id) => visits.includes(id))
      );
    };
    const correctness = [correct(left), correct(right)] as const;
    return {
      left,
      right,
      input,
      correctness,
      conclusion: correctness.some((value) => !value)
        ? "At least one traversal failed independent result validation."
        : left.output === right.output
          ? "Both traversals visit all nodes in the same order on this input."
          : "Both traversals visit every node once; their visit order differs.",
    };
  }
  const structure = definition.structure as "graph" | "grid";
  const distance = shortestDistance(structure, input);
  const first = route(left);
  const second = route(right);
  const correct = (path: string[]) =>
    distance === null ? path.length === 0 : validRoute(structure, input, path);
  const correctness = [
    correct(first) && (distance === null || first.length - 1 === distance),
    correct(second),
  ] as const;
  const conclusion = correctness.some((value) => !value)
    ? "At least one route failed independent result validation."
    : distance === null
      ? "No route exists. Both searches correctly report that the goal is unreachable."
      : `Shortest route: ${distance} edge${distance === 1 ? "" : "s"}. BFS found ${first.length - 1}; DFS found ${second.length - 1}. DFS follows its discovery order and may take a longer route.`;
  return {
    left,
    right,
    input,
    correctness,
    conclusion,
  };
}
