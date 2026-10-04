import { integer, readObject, InputError } from "@sim/problem-sdk";
import { graphInput } from "./graph-foundations";
import {
  graphLesson,
  directedWeighted,
  pairQueries,
  type Edge,
  type Weighted,
  type Step,
} from "./graph-wave-shared";

function roundTripSolve(
  { nodes, edges }: { nodes: number; edges: Edge[] },
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const color = Array<number>(nodes + 1).fill(0),
    parent = Array<number>(nodes + 1).fill(0);
  for (let start = 1; start <= nodes; start++)
    if (!color[start]) {
      color[start] = 1;
      step(start, start, `Begin DFS at city ${start}.`);
      const stack: [number, number][] = [[start, 0]];
      while (stack.length) {
        const frame = stack.at(-1)!,
          node = frame[0];
        if (frame[1] === adj[node].length) {
          color[node] = 2;
          stack.pop();
          continue;
        }
        const next = adj[node][frame[1]++];
        if (next === parent[node]) continue;
        if (!color[next]) {
          parent[next] = node;
          color[next] = 1;
          step(next, next, `Visit city ${next} from ${node}.`);
          stack.push([next, 0]);
        } else if (color[next] === 1) {
          const path = [node];
          while (path.at(-1) !== next) path.push(parent[path.at(-1)!]);
          path.reverse();
          path.push(next);
          step(
            next,
            path.length,
            `The road ${node}–${next} closes a cycle of ${path.length - 1} distinct cities.`,
          );
          return `${path.length}\n${path.join(" ")}`;
        }
      }
    }
  step(
    1,
    0,
    "Every DFS component finished without a back edge; no round trip exists.",
  );
  return "IMPOSSIBLE";
}
const roundTrip = graphLesson({
  meta: {
    id: "round-trip",
    title: "Round Trip",
    task: "1669",
    category: "Graphs",
    renderer: "graph",
    summary: "Find a simple cycle in an undirected road network.",
    limits: "1–10 cities and at most 24 distinct roads",
    tags: ["DFS", "cycle detection", "graph"],
    examples: [
      {
        input: '{"nodes":4,"edges":[[1,2],[2,3],[3,1],[3,4]]}',
        output: "4\n1 2 3 1",
      },
    ],
    complexity: { time: "O(n+m)", space: "O(n+m)" },
    learning: {
      intuition:
        "An edge to an active ancestor closes a cycle; an edge back to the direct parent does not.",
      approach: [
        "Track active and finished DFS nodes and each parent.",
        "On an active nonparent neighbor, follow parent links back to it.",
        "Close and report the cycle, or report IMPOSSIBLE after all components.",
      ],
      explanation:
        "DFS parent links form a simple path; adding the back edge yields a simple cycle.",
    },
  },
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 2],
      [2, 3],
      [3, 1],
      [3, 4],
    ] as Edge[],
  },
  parse: (raw) => graphInput(raw),
  solve: roundTripSolve,
  sourceArgs: "{nodes,edges}",
  directed: false,
});

function planetsSolve(
  {
    nodes,
    next,
    queries,
  }: { nodes: number; next: number[]; queries: number[][] },
  step: Step = () => {},
) {
  const log = 31,
    up = Array.from({ length: log }, () => Array<number>(nodes + 1).fill(0));
  for (let node = 1; node <= nodes; node++) up[0][node] = next[node - 1];
  for (let bit = 1; bit < log; bit++)
    for (let node = 1; node <= nodes; node++)
      up[bit][node] = up[bit - 1][up[bit - 1][node]];
  return queries
    .map(([start, k]) => {
      let at = start,
        remaining = k,
        bit = 0;
      while (remaining) {
        if (remaining % 2) at = up[bit][at];
        remaining = Math.floor(remaining / 2);
        bit++;
      }
      step(
        at,
        at,
        `From planet ${start}, ${k} teleports lead to planet ${at}.`,
      );
      return String(at);
    })
    .join(String.fromCharCode(10));
}
const planetsQueriesI = graphLesson({
  meta: {
    id: "planets-queries-i",
    title: "Planets Queries I",
    task: "1750",
    category: "Graphs",
    renderer: "graph",
    summary: "Jump through a functional graph by a large number of teleports.",
    limits: "1–10 planets, 1–16 queries, up to 1,000,000,000 jumps",
    tags: ["binary lifting", "functional graph", "graph"],
    examples: [
      {
        input: '{"next":[2,1,1,4],"queries":[[1,2],[3,4],[4,1]]}',
        output: "1\n2\n4",
      },
    ],
    complexity: { time: "O((n+q) log K)", space: "O(n log K)" },
    learning: {
      intuition:
        "A jump count is a sum of powers of two, and every node's 2ᵏ destination can be precomputed.",
      approach: [
        "Record the immediate teleporter as jump level zero.",
        "Double each jump table level from the previous level.",
        "Follow the levels corresponding to set bits of each requested count.",
      ],
      explanation:
        "Jump composition gives exactly 2ᵏ steps at level k, so the selected binary levels sum to the requested journey length.",
    },
  },
  defaultInput: {
    nodes: 4,
    next: [2, 1, 1, 4],
    edges: [
      [1, 2],
      [2, 1],
      [3, 1],
      [4, 4],
    ] as Edge[],
    queries: [
      [1, 2],
      [3, 4],
      [4, 1],
    ],
  },
  parse(raw) {
    const o = readObject(raw),
      next = o.next;
    if (!Array.isArray(next) || next.length < 1 || next.length > 10)
      throw new InputError("next must contain 1–10 destinations");
    const nodes = next.length,
      destinations = next.map((value, i) =>
        integer(value, `next[${i}]`, 1, nodes),
      ),
      queries = pairQueries(raw, "queries", nodes, 1_000_000_000),
      edges: Edge[] = destinations.map((to, i) => [i + 1, to]);
    return { nodes, next: destinations, queries, edges };
  },
  solve: planetsSolve,
  sourceArgs: "{nodes:next.length,next,queries}",
});

function kingdomsSolve(
  { nodes, edges }: { nodes: number; edges: Edge[] },
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]),
    rev = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    rev[b].push(a);
  }
  const seen = Array<boolean>(nodes + 1).fill(false),
    order: number[] = [];
  for (let start = 1; start <= nodes; start++)
    if (!seen[start]) {
      seen[start] = true;
      const stack: [number, number][] = [[start, 0]];
      while (stack.length) {
        const frame = stack.at(-1)!;
        if (frame[1] === adj[frame[0]].length) {
          order.push(frame[0]);
          stack.pop();
          continue;
        }
        const next = adj[frame[0]][frame[1]++];
        if (!seen[next]) {
          seen[next] = true;
          stack.push([next, 0]);
        }
      }
    }
  const group = Array<number>(nodes + 1).fill(0);
  let count = 0;
  for (const start of order.reverse())
    if (!group[start]) {
      count++;
      group[start] = count;
      const stack = [start];
      while (stack.length) {
        const node = stack.pop()!;
        step(
          node,
          count,
          `Planet ${node} belongs to strongly connected kingdom ${count}.`,
        );
        for (const next of rev[node])
          if (!group[next]) {
            group[next] = count;
            stack.push(next);
          }
      }
    }
  return `${count}\n${group.slice(1).join(" ")}`;
}
const planetsAndKingdoms = graphLesson({
  meta: {
    id: "planets-and-kingdoms",
    title: "Planets and Kingdoms",
    task: "1683",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Partition planets into mutually reachable strongly connected kingdoms.",
    limits: "1–10 planets and at most 24 distinct directed teleporters",
    tags: ["SCC", "Kosaraju", "DFS"],
    examples: [
      {
        input: '{"nodes":5,"edges":[[1,2],[2,3],[3,1],[3,4],[4,5],[5,4]]}',
        output: "2\n1 1 1 2 2",
      },
    ],
    complexity: { time: "O(n+m)", space: "O(n+m)" },
    learning: {
      intuition:
        "Reverse finishing order reveals components one at a time in the reversed graph.",
      approach: [
        "Record DFS finishing order in the original graph.",
        "Reverse all edges.",
        "Explore unassigned nodes in reverse finish order; each exploration is one kingdom.",
      ],
      explanation:
        "The condensation graph is acyclic. Reverse finishing order chooses a component whose reverse reachability cannot spill into an unassigned component.",
    },
  },
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [2, 3],
      [3, 1],
      [3, 4],
      [4, 5],
      [5, 4],
    ] as Edge[],
  },
  parse: (raw) => graphInput(raw, true),
  solve: kingdomsSolve,
  sourceArgs: "{nodes,edges}",
});

function cycleFindingSolve(
  { nodes, edges }: { nodes: number; edges: Weighted[] },
  step: Step = () => {},
) {
  const dist = Array<number>(nodes + 1).fill(0),
    parent = Array<number>(nodes + 1).fill(0);
  let changed = 0;
  for (let pass = 1; pass <= nodes; pass++) {
    changed = 0;
    for (const [a, b, w] of edges)
      if (dist[a] + w < dist[b]) {
        dist[b] = dist[a] + w;
        parent[b] = a;
        changed = b;
        step(
          b,
          dist[b],
          `Pass ${pass}: edge ${a}→${b} lowers the candidate distance to ${dist[b]}.`,
        );
      }
    if (!changed) break;
  }
  if (!changed) {
    step(
      1,
      0,
      "No relaxation survives the final pass; no negative cycle exists.",
    );
    return "NO";
  }
  let at = changed;
  for (let i = 0; i < nodes; i++) at = parent[at];
  const cycle = [at];
  for (let node = parent[at]; node !== at; node = parent[node])
    cycle.push(node);
  cycle.push(at);
  cycle.reverse();
  step(
    at,
    cycle.length,
    `A relaxation on pass ${nodes} exposes the negative cycle ${cycle.join("→")}.`,
  );
  return `YES\n${cycle.join(" ")}`;
}
const cycleFinding = graphLesson({
  meta: {
    id: "cycle-finding",
    title: "Cycle Finding",
    task: "1197",
    category: "Graphs",
    renderer: "graph",
    summary: "Detect and reconstruct any negative-cost directed cycle.",
    limits: "1–10 nodes and 1–24 weighted directed edges, costs −100…100",
    tags: ["Bellman-Ford", "negative cycle", "graph"],
    examples: [
      {
        input: '{"nodes":3,"edges":[[1,2,1],[2,3,-3],[3,1,1]]}',
        output: "YES\n1 2 3 1",
      },
    ],
    complexity: { time: "O(nm)", space: "O(n)" },
    learning: {
      intuition:
        "A shortest path can improve on the n-th relaxation round only if it contains a negative cycle.",
      approach: [
        "Give every node zero initial distance to search all components.",
        "Relax every edge for up to n rounds, remembering predecessor edges.",
        "If the final round changes a node, follow predecessors n steps and reconstruct the cycle.",
      ],
      explanation:
        "Any path of n edges repeats a vertex. A strict improvement beyond n−1 edges therefore witnesses a negative cycle, and n predecessor jumps enter it.",
    },
  },
  defaultInput: {
    nodes: 3,
    edges: [
      [1, 2, 1],
      [2, 3, -3],
      [3, 1, 1],
    ] as Weighted[],
  },
  parse: (raw) => directedWeighted(raw, true),
  solve: cycleFindingSolve,
  sourceArgs: "{nodes,edges}",
});

export const wave100GraphCoreProblems = [
  roundTrip,
  planetsQueriesI,
  planetsAndKingdoms,
  cycleFinding,
];
