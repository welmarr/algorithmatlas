import {
  defineProblem,
  readObject,
  integer,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata, numbers } from "./extended-shared";
import { treeInput, treeState } from "./tree-algorithms";

type Edge = [number, number];
type Step = (node: number, value: number, reason: string) => void;
function pairs(raw: unknown, key: string, nodes: number) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 16)
    throw new InputError(`${key} must contain 1–16 pairs`);
  return value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`${key}[${i}] must be a pair`);
    return [
      integer(item[0], `${key}[${i}][0]`, 1, nodes),
      integer(item[1], `${key}[${i}][1]`, 1, nodes),
    ];
  });
}
function lesson<I extends { nodes: number; edges: Edge[] }>(spec: {
  meta: Parameters<typeof metadata>[0];
  defaultInput: I;
  parse: (raw: unknown) => I;
  solve: (input: I, step?: Step) => string;
  sourceArgs: string;
  helpers?: string;
}) {
  return entry(
    defineProblem({
      metadata: metadata(spec.meta),
      defaultInput: spec.defaultInput,
      parseInput: spec.parse,
      source: `${spec.helpers ?? ""}\nreturn (${spec.solve.toString()})(${spec.sourceArgs});`,
      trace(input) {
        const state = treeState(input.nodes, input.edges),
          events: EventDraft[] = [];
        state.variables = { answer: 0 };
        const step: Step = (node, value, reason) => {
          events.push(
            event("VISIT_TREE_NODE", [`tree:node:${node}`], reason, {}, 1),
          );
          events.push(
            event("ANNOTATE", [], reason, { variable: "answer", value }, 1, {
              schemaVersion: "0.1",
              reason,
            }),
          );
        };
        return { initialState: state, events, output: spec.solve(input, step) };
      },
    }),
  );
}
function ancestors(nodes: number, edges: Edge[]) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const log = Math.ceil(Math.log2(nodes)) + 1,
    up = Array.from({ length: log }, () => Array<number>(nodes + 1).fill(0)),
    depth = Array<number>(nodes + 1).fill(0),
    order = [1];
  for (let i = 0; i < order.length; i++) {
    const node = order[i];
    for (const next of adj[node])
      if (next !== up[0][node]) {
        up[0][next] = node;
        depth[next] = depth[node] + 1;
        order.push(next);
      }
  }
  for (let bit = 1; bit < log; bit++)
    for (let node = 1; node <= nodes; node++)
      up[bit][node] = up[bit - 1][up[bit - 1][node]];
  function lca(a: number, b: number) {
    if (depth[a] < depth[b]) [a, b] = [b, a];
    let delta = depth[a] - depth[b];
    for (let bit = 0; delta; bit++, delta = Math.floor(delta / 2))
      if (delta % 2) a = up[bit][a];
    if (a === b) return a;
    for (let bit = log - 1; bit >= 0; bit--)
      if (up[bit][a] !== up[bit][b]) {
        a = up[bit][a];
        b = up[bit][b];
      }
    return up[0][a];
  }
  return { lca, depth };
}
function companySolve(
  {
    nodes,
    edges,
    queries,
  }: { nodes: number; edges: Edge[]; queries: number[][] },
  step: Step = () => {},
) {
  const { lca } = ancestors(nodes, edges);
  return queries
    .map(([a, b]) => {
      const result = lca(a, b);
      step(
        result,
        result,
        `The lowest shared boss of ${a} and ${b} is ${result}.`,
      );
      return String(result);
    })
    .join(String.fromCharCode(10));
}
const companyQueriesII = lesson({
  meta: {
    id: "company-queries-ii",
    title: "Company Queries II",
    task: "1688",
    category: "Trees",
    renderer: "tree",
    summary: "Find the lowest common boss of two employees.",
    limits: "1–12 employees, 1–16 queries, parent of i is below i",
    tags: ["binary lifting", "LCA", "tree"],
    examples: [
      {
        input: '{"nodes":5,"parents":[1,1,3,3],"queries":[[4,5],[2,5],[1,4]]}',
        output: "3\n1\n1",
      },
    ],
    complexity: { time: "O(n log n+q log n)", space: "O(n log n)" },
    learning: {
      intuition:
        "Jump by powers of two to align depths, then climb until the parents meet.",
      approach: [
        "Precompute each node's 2ᵏ-th ancestor.",
        "Lift the deeper query node to the same depth.",
        "Lift both nodes at the largest powers where their ancestors differ.",
      ],
      explanation:
        "After depth alignment, the first shared ancestor is found by keeping both nodes strictly below it until the final parent step.",
    },
  },
  defaultInput: {
    nodes: 5,
    parents: [1, 1, 3, 3],
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
    queries: [
      [4, 5],
      [2, 5],
      [1, 4],
    ],
  },
  parse(raw) {
    const o = readObject(raw),
      nodes = integer(o.nodes, "nodes", 1, 12),
      parents = numbers(raw, "parents", nodes - 1, nodes - 1, 1, nodes),
      edges: Edge[] = parents.map((parent, i) => {
        if (parent > i + 1)
          throw new InputError("Parent must have a lower employee number");
        return [parent, i + 2];
      });
    const queries = pairs(raw, "queries", nodes);
    return { nodes, parents, edges, queries };
  },
  solve: companySolve,
  sourceArgs: "{nodes,edges:parents.map((p,i)=>[p,i+2]),queries}",
  helpers: ancestors.toString(),
});

function distanceSolve(
  {
    nodes,
    edges,
    queries,
  }: { nodes: number; edges: Edge[]; queries: number[][] },
  step: Step = () => {},
) {
  const { lca, depth } = ancestors(nodes, edges);
  return queries
    .map(([a, b]) => {
      const root = lca(a, b),
        distance = depth[a] + depth[b] - 2 * depth[root];
      step(
        root,
        distance,
        `Path ${a}→${b} meets at ${root}; length ${distance}.`,
      );
      return String(distance);
    })
    .join(String.fromCharCode(10));
}
const distanceQueries = lesson({
  meta: {
    id: "distance-queries",
    title: "Distance Queries",
    task: "1135",
    category: "Trees",
    renderer: "tree",
    summary: "Answer edge distances along unique tree paths.",
    limits: "1–12 nodes, 1–16 node-pair queries",
    tags: ["binary lifting", "LCA", "tree distance"],
    examples: [
      {
        input:
          '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]],"queries":[[1,3],[2,5],[1,4]]}',
        output: "1\n3\n2",
      },
    ],
    complexity: { time: "O(n log n+q log n)", space: "O(n log n)" },
    learning: {
      intuition:
        "Subtract the shared root-to-LCA prefix from both endpoint depths.",
      approach: [
        "Root the tree and precompute binary ancestors and depths.",
        "Find the lowest common ancestor for each pair.",
        "Compute depth(a)+depth(b)−2 depth(LCA).",
      ],
      explanation:
        "Both endpoint-to-root paths overlap exactly along root-to-LCA; subtracting it twice leaves the unique path length.",
    },
  },
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
    queries: [
      [1, 3],
      [2, 5],
      [1, 4],
    ],
  },
  parse(raw) {
    const tree = treeInput(raw);
    return { ...tree, queries: pairs(raw, "queries", tree.nodes) };
  },
  solve: distanceSolve,
  sourceArgs: "{nodes,edges,queries}",
  helpers: ancestors.toString(),
});

function centroidSolve(
  { nodes, edges }: { nodes: number; edges: Edge[] },
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const parent = Array<number>(nodes + 1).fill(0),
    order = [1];
  for (let i = 0; i < order.length; i++)
    for (const next of adj[order[i]])
      if (next !== parent[order[i]]) {
        parent[next] = order[i];
        order.push(next);
      }
  const size = Array<number>(nodes + 1).fill(1);
  for (const node of [...order].reverse())
    if (parent[node]) size[parent[node]] += size[node];
  for (let node = 1; node <= nodes; node++) {
    let largest = nodes - size[node];
    for (const child of adj[node])
      if (parent[child] === node) largest = Math.max(largest, size[child]);
    step(
      node,
      largest,
      `Removing node ${node} leaves a largest component of ${largest}.`,
    );
    if (largest <= Math.floor(nodes / 2)) return String(node);
  }
  throw new Error("Every tree has a centroid");
}
const findingCentroid = lesson({
  meta: {
    id: "finding-a-centroid",
    title: "Finding a Centroid",
    task: "2079",
    category: "Trees",
    renderer: "tree",
    summary:
      "Find a node whose removal leaves no component larger than half the tree.",
    limits: "1–12 connected tree nodes",
    tags: ["tree traversal", "subtree size", "centroid"],
    examples: [
      { input: '{"nodes":5,"edges":[[1,2],[2,3],[3,4],[3,5]]}', output: "3" },
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "For each candidate, the components are its child subtrees and everything above it.",
      approach: [
        "Compute subtree sizes in reverse traversal order.",
        "For each node, find the largest child subtree and the complement n−size(node).",
        "Choose a node whose largest resulting part is at most half.",
      ],
      explanation:
        "Those parts are exactly the connected components formed when the candidate is removed.",
    },
  },
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
  },
  parse: treeInput,
  solve: centroidSolve,
  sourceArgs: "{nodes,edges}",
});

function subtreeSolve(
  {
    nodes,
    edges,
    values,
    queries,
  }: { nodes: number; edges: Edge[]; values: number[]; queries: number[][] },
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const tin = Array<number>(nodes + 1).fill(0),
    tout = Array<number>(nodes + 1).fill(0),
    parent = Array<number>(nodes + 1).fill(0),
    stack: [number, boolean][] = [[1, false]];
  let timer = 0;
  while (stack.length) {
    const [node, exit] = stack.pop()!;
    if (exit) {
      tout[node] = timer;
      continue;
    }
    tin[node] = ++timer;
    stack.push([node, true]);
    for (const next of [...adj[node]].reverse())
      if (next !== parent[node]) {
        parent[next] = node;
        stack.push([next, false]);
      }
  }
  const bit = Array<number>(nodes + 1).fill(0),
    current = [...values],
    answers: number[] = [];
  function add(index: number, delta: number) {
    for (let i = index; i <= nodes; i += i & -i) bit[i] += delta;
  }
  function prefix(index: number) {
    let sum = 0;
    for (let i = index; i > 0; i -= i & -i) sum += bit[i];
    return sum;
  }
  for (let node = 1; node <= nodes; node++) add(tin[node], current[node - 1]);
  for (const [type, node, value] of queries)
    if (type === 1) {
      add(tin[node], value - current[node - 1]);
      current[node - 1] = value;
      step(
        node,
        value,
        `Set node ${node} to ${value} at Euler position ${tin[node]}.`,
      );
    } else {
      const sum = prefix(tout[node]) - prefix(tin[node] - 1);
      answers.push(sum);
      step(
        node,
        sum,
        `Subtree ${node} occupies Euler positions ${tin[node]}…${tout[node]} and sums to ${sum}.`,
      );
    }
  return answers.join(String.fromCharCode(10));
}
const subtreeQueries = lesson({
  meta: {
    id: "subtree-queries",
    title: "Subtree Queries",
    task: "1137",
    category: "Trees",
    renderer: "tree",
    summary: "Update node values and sum rooted subtrees.",
    limits: "1–12 nodes, positive values 1–100, 1–20 operations",
    tags: ["Euler tour", "Fenwick tree", "subtree aggregation"],
    examples: [
      {
        input:
          '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]],"values":[4,2,5,2,1],"queries":[[2,3],[1,5,3],[2,3]]}',
        output: "8\n10",
      },
    ],
    complexity: { time: "O((n+q) log n)", space: "O(n)" },
    learning: {
      intuition:
        "A rooted subtree becomes one contiguous interval in preorder.",
      approach: [
        "Assign entry and exit positions with an Euler tour.",
        "Store values by entry position in a Fenwick tree.",
        "Use point changes and interval prefix differences.",
      ],
      explanation:
        "Every descendant of a node appears between its entry time and subtree exit time, with no unrelated node inside that interval.",
    },
  },
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
    values: [4, 2, 5, 2, 1],
    queries: [
      [2, 3],
      [1, 5, 3],
      [2, 3],
    ],
  },
  parse(raw) {
    const tree = treeInput(raw),
      values = numbers(raw, "values", tree.nodes, tree.nodes, 1, 100),
      q = readObject(raw).queries;
    if (!Array.isArray(q) || q.length < 1 || q.length > 20)
      throw new InputError("queries must contain 1–20 operations");
    const queries = q.map((item, i) => {
      if (!Array.isArray(item) || (item.length !== 2 && item.length !== 3))
        throw new InputError(`queries[${i}] must be [type,node,(value)]`);
      const type = integer(item[0], "type", 1, 2),
        node = integer(item[1], "node", 1, tree.nodes),
        value = type === 1 ? integer(item[2], "value", 1, 100) : 0;
      return [type, node, value];
    });
    return { ...tree, values, queries };
  },
  solve: subtreeSolve,
  sourceArgs: "{nodes,edges,values,queries}",
});

function distinctSolve(
  { nodes, edges, colors }: { nodes: number; edges: Edge[]; colors: number[] },
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const tin = Array<number>(nodes + 1).fill(0),
    tout = Array<number>(nodes + 1).fill(0),
    at = Array<number>(nodes + 1).fill(0),
    parent = Array<number>(nodes + 1).fill(0),
    stack: [number, boolean][] = [[1, false]];
  let timer = 0;
  while (stack.length) {
    const [node, exit] = stack.pop()!;
    if (exit) {
      tout[node] = timer;
      continue;
    }
    tin[node] = ++timer;
    at[timer] = node;
    stack.push([node, true]);
    for (const next of [...adj[node]].reverse())
      if (next !== parent[node]) {
        parent[next] = node;
        stack.push([next, false]);
      }
  }
  const bit = Array<number>(nodes + 1).fill(0),
    last = new Map<number, number>(),
    answer = Array<number>(nodes + 1).fill(0),
    byStart = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (let node = 1; node <= nodes; node++) byStart[tin[node]].push(node);
  function add(index: number, delta: number) {
    for (let i = index; i <= nodes; i += i & -i) bit[i] += delta;
  }
  function prefix(index: number) {
    let sum = 0;
    for (let i = index; i > 0; i -= i & -i) sum += bit[i];
    return sum;
  }
  for (let i = nodes; i >= 1; i--) {
    const color = colors[at[i] - 1];
    if (last.has(color)) add(last.get(color)!, -1);
    add(i, 1);
    last.set(color, i);
    for (const node of byStart[i]) {
      answer[node] = prefix(tout[node]) - prefix(i - 1);
      step(
        node,
        answer[node],
        `Subtree ${node} contains ${answer[node]} distinct colors.`,
      );
    }
  }
  return answer.slice(1).join(" ");
}
const distinctColors = lesson({
  meta: {
    id: "distinct-colors",
    title: "Distinct Colors",
    task: "1139",
    category: "Trees",
    renderer: "tree",
    summary: "Count unique colors inside every rooted subtree.",
    limits: "1–12 nodes and colors 1–100",
    tags: ["Euler tour", "Fenwick tree", "distinct range"],
    examples: [
      {
        input:
          '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]],"colors":[2,3,2,2,1]}',
        output: "3 1 2 1 1",
      },
    ],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "A subtree is an Euler interval; count one active occurrence per color in that interval.",
      approach: [
        "Flatten the tree into contiguous subtree intervals.",
        "Sweep Euler positions backward, leaving only each color's latest active position.",
        "Query each subtree interval with a Fenwick tree when reaching its start.",
      ],
      explanation:
        "At any sweep position, the active marks are exactly the first occurrence of each color in the remaining suffix. Their count inside a subtree interval is its number of distinct colors.",
    },
  },
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
    colors: [2, 3, 2, 2, 1],
  },
  parse(raw) {
    const tree = treeInput(raw),
      colors = numbers(raw, "colors", tree.nodes, tree.nodes, 1, 100);
    return { ...tree, colors };
  },
  solve: distinctSolve,
  sourceArgs: "{nodes,edges,colors}",
});

export const wave100TreeProblems = [
  companyQueriesII,
  distanceQueries,
  findingCentroid,
  subtreeQueries,
  distinctColors,
];
