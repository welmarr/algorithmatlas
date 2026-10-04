import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";
import {
  adjacency,
  graphInput,
  graphState,
  weightedInput,
} from "./graph-foundations";

type Edge = [number, number];

const buildingTeams = defineProblem({
  metadata: metadata({
    id: "building-teams",
    title: "Building Teams",
    task: "1668",
    category: "Graphs",
    renderer: "graph",
    summary: "Split pupils into two teams so no pair of friends shares a team.",
    limits: "1–10 pupils, at most 24 distinct friendship pairs",
    tags: ["BFS", "bipartite graph", "two-coloring"],
    examples: [
      { input: '{"nodes":5,"edges":[[1,2],[1,3],[4,5]]}', output: "1 2 2 1 2" },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition: "Every friendship forces opposite team assignments.",
      approach: [
        "Begin each unassigned component with team 1.",
        "Give each neighbor the opposite team during breadth-first search.",
        "An edge with equal teams proves the split impossible.",
      ],
      explanation:
        "The alternating assignment satisfies every examined edge. A same-team edge creates an odd cycle, which no two-team assignment can satisfy.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [4, 5],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges){adj[a].push(b);adj[b].push(a);}const team=Array(nodes+1).fill(0);for(let start=1;start<=nodes;start++)if(!team[start]){team[start]=1;const queue=[start];for(let head=0;head<queue.length;head++){const at=queue[head];for(const next of adj[at]){if(!team[next]){team[next]=3-team[at];queue.push(next);}else if(team[next]===team[at])return 'IMPOSSIBLE';}}}return team.slice(1).join(' ');`,
  parseInput(raw) {
    return graphInput(raw);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges),
      team = Array<number>(nodes + 1).fill(0);
    for (let start = 1; start <= nodes; start++)
      if (!team[start]) {
        team[start] = 1;
        const queue = [start];
        events.push(
          event(
            "DISCOVER_NODE",
            [`graph:node:${start}`],
            `Start a new component by placing pupil ${start} in team 1.`,
            {},
            1,
          ),
        );
        for (let head = 0; head < queue.length; head++) {
          const at = queue[head];
          events.push(
            event(
              "VISIT_NODE",
              [`graph:node:${at}`],
              `Check friendships of pupil ${at} in team ${team[at]}.`,
              {},
              1,
            ),
          );
          for (const next of adj[at]) {
            if (!team[next]) {
              team[next] = 3 - team[at];
              queue.push(next);
              events.push(
                event(
                  "DISCOVER_NODE",
                  [`graph:node:${next}`],
                  `Assign pupil ${next} to the opposite team ${team[next]}.`,
                  {},
                  1,
                ),
              );
            } else if (team[next] === team[at]) {
              events.push(
                event(
                  "ANNOTATE",
                  [],
                  `Friends ${at} and ${next} would have the same team; this component is not bipartite.`,
                  {},
                  1,
                ),
              );
              return { initialState: state, events, output: "IMPOSSIBLE" };
            }
          }
        }
      }
    return { initialState: state, events, output: team.slice(1).join(" ") };
  },
});

const roundTripII = defineProblem({
  metadata: metadata({
    id: "round-trip-ii",
    title: "Round Trip II",
    task: "1678",
    category: "Graphs",
    renderer: "graph",
    summary: "Find a directed flight cycle with distinct intermediate cities.",
    limits: "1–10 cities, at most 24 distinct directed flights",
    tags: ["DFS", "directed cycle", "recursion stack"],
    examples: [
      {
        input: '{"nodes":4,"edges":[[1,3],[2,1],[2,4],[3,2],[3,4]]}',
        output: "4\n1 3 2 1",
      },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition: "A flight back to an active ancestor closes a directed cycle.",
      approach: [
        "Run depth-first search and distinguish active nodes from finished nodes.",
        "When an edge reaches an active node, follow parent links to reconstruct the cycle.",
        "If all searches finish without such an edge, no cycle exists.",
      ],
      explanation:
        "Only active ancestors are on the current DFS path, so a back edge yields a valid directed cycle; finished nodes cannot close that path.",
    },
  }),
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 3],
      [2, 1],
      [2, 4],
      [3, 2],
      [3, 4],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges)adj[a].push(b);const color=Array(nodes+1).fill(0),parent=Array(nodes+1).fill(0);let cycle=null;function dfs(at){color[at]=1;for(const next of adj[at]){if(color[next]===0){parent[next]=at;if(dfs(next))return true;}else if(color[next]===1){const path=[at];while(path[path.length-1]!==next)path.push(parent[path[path.length-1]]);path.reverse();cycle=[...path,next];return true;}}color[at]=2;return false;}for(let i=1;i<=nodes&&!cycle;i++)if(!color[i])dfs(i);return cycle?cycle.length+'\\n'+cycle.join(' '):'IMPOSSIBLE';`,
  parseInput(raw) {
    return graphInput(raw, true);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges, true),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges, true),
      color = Array<number>(nodes + 1).fill(0),
      parent = Array<number>(nodes + 1).fill(0);
    let cycle: number[] | null = null;
    function dfs(at: number): boolean {
      color[at] = 1;
      events.push(
        event(
          "DISCOVER_NODE",
          [`graph:node:${at}`],
          `Enter city ${at}; it is active on the DFS path.`,
          {},
          1,
        ),
      );
      for (const next of adj[at]) {
        if (!color[next]) {
          parent[next] = at;
          if (dfs(next)) return true;
        } else if (color[next] === 1) {
          const path = [at];
          while (path[path.length - 1] !== next)
            path.push(parent[path[path.length - 1]]);
          path.reverse();
          cycle = [...path, next];
          events.push(
            event(
              "ANNOTATE",
              [],
              `Flight ${at}→${next} returns to an active ancestor and closes a cycle.`,
              {},
              1,
            ),
          );
          return true;
        }
      }
      color[at] = 2;
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${at}`],
          `Finish city ${at}; it is no longer on the active path.`,
          {},
          1,
        ),
      );
      return false;
    }
    for (let node = 1; node <= nodes && !cycle; node++)
      if (!color[node]) dfs(node);
    if (!cycle)
      events.push(
        event("ANNOTATE", [], "No edge returns to an active ancestor.", {}, 1),
      );
    const found = cycle as number[] | null;
    return {
      initialState: state,
      events,
      output: found ? `${found.length}\n${found.join(" ")}` : "IMPOSSIBLE",
    };
  },
});

function shortestRoutesInput(raw: unknown) {
  const { nodes, edges } = weightedInput(raw);
  const value = readObject(raw).queries;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new InputError("queries must contain 1–20 city pairs");
  const queries: Edge[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`queries[${i}] must be a city pair`);
    return [
      integer(item[0], `queries[${i}][0]`, 1, nodes),
      integer(item[1], `queries[${i}][1]`, 1, nodes),
    ];
  });
  return { nodes, edges, queries };
}

const shortestRoutesII = defineProblem({
  metadata: metadata({
    id: "shortest-routes-ii",
    title: "Shortest Routes II",
    task: "1672",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Answer many shortest-route queries in an undirected road network.",
    limits: "1–10 cities, at most 24 distinct weighted roads, 1–20 queries",
    tags: [
      "Floyd-Warshall",
      "all-pairs shortest paths",
      "weighted graph",
      "dynamic programming",
    ],
    examples: [
      {
        input:
          '{"nodes":4,"edges":[[1,2,5],[1,3,9],[2,3,3]],"queries":[[1,2],[2,1],[1,3],[1,4],[3,2]]}',
        output: "5\n5\n8\n-1\n3",
      },
    ],
    complexity: { time: "O(V³ + Q)", space: "O(V²)" },
    learning: {
      intuition:
        "A route from a to b may become shorter when one more city is allowed as a midpoint.",
      approach: [
        "Initialize direct road distances and zero self-distance.",
        "For each midpoint k, compare current a→b with a→k→b for every pair.",
        "Read each query from the completed distance table.",
      ],
      explanation:
        "After midpoint k, each table entry is the shortest path whose internal cities are among 1…k; the recurrence considers paths that use k and paths that do not.",
    },
  }),
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 2, 5],
      [1, 3, 9],
      [2, 3, 3],
    ] as [number, number, number][],
    queries: [
      [1, 2],
      [2, 1],
      [1, 3],
      [1, 4],
      [3, 2],
    ] as Edge[],
  },
  source: `const distance=Array.from({length:nodes+1},(_,a)=>Array.from({length:nodes+1},(_,b)=>a===b?0:Infinity));for(const [a,b,w] of edges){distance[a][b]=Math.min(distance[a][b],w);distance[b][a]=Math.min(distance[b][a],w);}for(let k=1;k<=nodes;k++)for(let a=1;a<=nodes;a++)for(let b=1;b<=nodes;b++)distance[a][b]=Math.min(distance[a][b],distance[a][k]+distance[k][b]);return queries.map(([a,b])=>Number.isFinite(distance[a][b])?distance[a][b]:-1).join('\\n');`,
  parseInput: shortestRoutesInput,
  trace({ nodes, edges, queries }) {
    const state = graphState(nodes, edges),
      events: EventDraft[] = [];
    const distance = Array.from({ length: nodes + 1 }, (_, a) =>
      Array.from({ length: nodes + 1 }, (_, b) => (a === b ? 0 : Infinity)),
    );
    for (const [a, b, cost] of edges)
      distance[a][b] = distance[b][a] = Math.min(distance[a][b], cost);
    for (let midpoint = 1; midpoint <= nodes; midpoint++) {
      events.push(
        event(
          "DISCOVER_NODE",
          [`graph:node:${midpoint}`],
          `Allow city ${midpoint} as an intermediate stop.`,
          {},
          1,
        ),
      );
      for (let a = 1; a <= nodes; a++)
        for (let b = 1; b <= nodes; b++) {
          const candidate = distance[a][midpoint] + distance[midpoint][b];
          if (candidate < distance[a][b]) {
            distance[a][b] = candidate;
            events.push(
              event(
                "ANNOTATE",
                [],
                `Route ${a}→${b} improves to ${candidate} through ${midpoint}.`,
                {},
                1,
                {
                  schemaVersion: "0.1",
                  equation: `d(${a},${b}) = ${candidate}`,
                  reason:
                    "The newly permitted midpoint yields a shorter route.",
                },
              ),
            );
          }
        }
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${midpoint}`],
          `All routes through city ${midpoint} have been checked.`,
          {},
          1,
        ),
      );
    }
    return {
      initialState: state,
      events,
      output: queries
        .map(([a, b]) =>
          Number.isFinite(distance[a][b]) ? String(distance[a][b]) : "-1",
        )
        .join("\n"),
    };
  },
});

export const graphAlgorithmProblems = [
  entry(buildingTeams),
  entry(roundTripII),
  entry(shortestRoutesII),
];
