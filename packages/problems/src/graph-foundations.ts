import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";

type Edge = [number, number];
type Weighted = [number, number, number];
export function graphInput(raw: unknown, directed = false) {
  const object = readObject(raw),
    nodes = integer(object.nodes, "nodes", 1, 10),
    value = object.edges;
  if (!Array.isArray(value) || value.length > 24)
    throw new InputError("edges must contain at most 24 pairs");
  const edges: Edge[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`edges[${i}] must be a pair`);
    const a = integer(item[0], `edges[${i}][0]`, 1, nodes),
      b = integer(item[1], `edges[${i}][1]`, 1, nodes);
    if (a === b)
      throw new InputError(
        "Self-loops are not supported in the interactive graph",
      );
    return [a, b];
  });
  const keys = edges.map(([a, b]) =>
    directed ? `${a}:${b}` : `${Math.min(a, b)}:${Math.max(a, b)}`,
  );
  if (new Set(keys).size !== keys.length)
    throw new InputError("Duplicate edges are not supported");
  return { nodes, edges };
}
export function weightedInput(raw: unknown) {
  const object = readObject(raw),
    nodes = integer(object.nodes, "nodes", 1, 10),
    value = object.edges;
  if (!Array.isArray(value) || value.length > 24)
    throw new InputError("edges must contain at most 24 weighted roads");
  const edges: Weighted[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3)
      throw new InputError(`edges[${i}] must have two cities and a cost`);
    const a = integer(item[0], `edges[${i}][0]`, 1, nodes),
      b = integer(item[1], `edges[${i}][1]`, 1, nodes),
      cost = integer(item[2], `edges[${i}][2]`, 1, 100_000);
    if (a === b) throw new InputError("Road endpoints must differ");
    return [a, b, cost];
  });
  const keys = edges.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`);
  if (new Set(keys).size !== keys.length)
    throw new InputError("Duplicate roads are not supported");
  return { nodes, edges };
}
export function graphState(
  nodes: number,
  edges: readonly (Edge | Weighted)[],
  directed = false,
) {
  const state = emptyState();
  for (let node = 1; node <= nodes; node++) {
    const id = `graph:node:${node}`;
    state.entities[id] = {
      id,
      kind: "graph-node",
      label: String(node),
      status: "idle",
    };
  }
  edges.forEach(([from, to, weight], i) => {
    const id = `graph:edge:${i}`;
    state.entities[id] = {
      id,
      kind: "graph-edge",
      label: `${from}${directed ? "→" : "–"}${to}`,
      status: "idle",
      metadata: {
        from: String(from),
        to: String(to),
        directed,
        ...(weight === undefined ? {} : { weight }),
      },
    };
  });
  return state;
}
export function adjacency(nodes: number, edges: Edge[], directed = false) {
  const result = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    result[a].push(b);
    if (!directed) result[b].push(a);
  }
  return result;
}

const buildingRoads = defineProblem({
  metadata: metadata({
    id: "building-roads",
    title: "Building Roads",
    task: "1666",
    category: "Graphs",
    renderer: "graph",
    summary: "Join disconnected city groups using the fewest new roads.",
    limits: "1–10 cities, at most 24 distinct undirected roads",
    tags: ["DFS", "connected components"],
    examples: [
      { input: '{"nodes":4,"edges":[[1,2],[3,4]]}', output: "1\n1 3" },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition:
        "One road can join two components, so c components need exactly c−1 roads.",
      approach: [
        "Explore each connected component and remember one representative.",
        "Join consecutive representatives.",
        "The added roads connect all components with the minimum count.",
      ],
      explanation:
        "Each new road lowers the component count by at most one; linking representatives achieves that bound.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [3, 4],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]); for(const [a,b] of edges){adj[a].push(b);adj[b].push(a);}\nconst seen=Array(nodes+1).fill(false),leaders=[];\nfor(let start=1;start<=nodes;start++)if(!seen[start]){leaders.push(start);seen[start]=true;const stack=[start];while(stack.length){const node=stack.pop();for(const next of adj[node])if(!seen[next]){seen[next]=true;stack.push(next);}}}\nconst roads=[];for(let i=1;i<leaders.length;i++)roads.push(leaders[i-1]+' '+leaders[i]);\nreturn [roads.length,...roads].join('\\n');`,
  parseInput(raw) {
    return graphInput(raw);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges),
      seen = Array<boolean>(nodes + 1).fill(false),
      leaders: number[] = [];
    for (let start = 1; start <= nodes; start++)
      if (!seen[start]) {
        leaders.push(start);
        seen[start] = true;
        events.push(
          event(
            "DISCOVER_NODE",
            [`graph:node:${start}`],
            `Start component ${leaders.length} at city ${start}.`,
            {},
            1,
          ),
        );
        const stack = [start];
        while (stack.length) {
          const node = stack.pop()!;
          events.push(
            event(
              "VISIT_NODE",
              [`graph:node:${node}`],
              `Explore city ${node} in this component.`,
              {},
              2,
            ),
          );
          for (const next of adj[node])
            if (!seen[next]) {
              seen[next] = true;
              stack.push(next);
              events.push(
                event(
                  "DISCOVER_NODE",
                  [`graph:node:${next}`],
                  `Road from ${node} reaches city ${next}.`,
                  {},
                  2,
                ),
              );
            }
        }
      }
    const roads: string[] = [];
    for (let i = 1; i < leaders.length; i++) {
      const a = leaders[i - 1],
        b = leaders[i];
      roads.push(`${a} ${b}`);
      events.push(
        event(
          "CREATE_ENTITY",
          [`graph:edge:new${i}`],
          `Build a road between component leaders ${a} and ${b}.`,
          {
            kind: "graph-edge",
            label: `${a}–${b}`,
            from: String(a),
            to: String(b),
          },
          3,
          {
            schemaVersion: "0.1",
            reason: "One bridge reduces the number of components by one.",
          },
        ),
      );
    }
    return {
      initialState: state,
      events,
      output: [roads.length, ...roads].join("\n"),
    };
  },
});

const courseSchedule = defineProblem({
  metadata: metadata({
    id: "course-schedule",
    title: "Course Schedule",
    task: "1679",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Order courses so every prerequisite appears before its dependent course.",
    limits: "1–10 courses, at most 24 distinct directed requirements",
    tags: ["topological sort", "DAG", "indegree"],
    examples: [
      { input: '{"nodes":5,"edges":[[1,2],[3,1],[4,5]]}', output: "3 4 1 5 2" },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition:
        "A course with no unmet prerequisites is safe to schedule now.",
      approach: [
        "Count incoming requirements for every course.",
        "Queue courses with zero indegree.",
        "Remove a course, lower its dependents' counts, and queue newly ready courses.",
      ],
      explanation:
        "Every output course has all prerequisites already removed. If fewer than n courses are removed, a directed cycle blocks completion.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [3, 1],
      [4, 5],
    ] as Edge[],
  },
  source: `const out=Array.from({length:nodes+1},()=>[]),degree=Array(nodes+1).fill(0);for(const [a,b] of edges){out[a].push(b);degree[b]++;}\nconst queue=[];for(let i=1;i<=nodes;i++)if(!degree[i])queue.push(i);const order=[];\nfor(let head=0;head<queue.length;head++){const node=queue[head];order.push(node);for(const next of out[node])if(--degree[next]===0)queue.push(next);}\nreturn order.length===nodes?order.join(' '):'IMPOSSIBLE';`,
  parseInput(raw) {
    return graphInput(raw, true);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges, true),
      events: EventDraft[] = [],
      out = adjacency(nodes, edges, true),
      degree = Array<number>(nodes + 1).fill(0);
    for (const [, to] of edges) degree[to]++;
    const queue: number[] = [],
      order: number[] = [];
    for (let node = 1; node <= nodes; node++)
      if (!degree[node]) {
        queue.push(node);
        events.push(
          event(
            "DISCOVER_NODE",
            [`graph:node:${node}`],
            `Course ${node} has no remaining prerequisite.`,
            {},
            1,
          ),
        );
      }
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head];
      order.push(node);
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${node}`],
          `Take course ${node} as item ${order.length} in the order.`,
          {},
          2,
        ),
      );
      for (const next of out[node]) {
        degree[next]--;
        events.push(
          event(
            "ANNOTATE",
            [],
            `Completing ${node} leaves ${degree[next]} requirements for ${next}.`,
            {},
            3,
          ),
        );
        if (!degree[next]) {
          queue.push(next);
          events.push(
            event(
              "DISCOVER_NODE",
              [`graph:node:${next}`],
              `Course ${next} is now ready.`,
              {},
              3,
            ),
          );
        }
      }
    }
    if (order.length < nodes)
      events.push(
        event(
          "ANNOTATE",
          [],
          "A cycle leaves courses with unmet prerequisites.",
          {},
          4,
        ),
      );
    return {
      initialState: state,
      events,
      output: order.length === nodes ? order.join(" ") : "IMPOSSIBLE",
    };
  },
});

const roadReparation = defineProblem({
  metadata: metadata({
    id: "road-reparation",
    title: "Road Reparation",
    task: "1675",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Repair a minimum-cost set of undirected roads that connects every city.",
    limits: "1–10 cities, at most 24 distinct roads with costs 1–100,000",
    tags: ["MST", "DSU", "Kruskal"],
    examples: [
      {
        input:
          '{"nodes":5,"edges":[[1,2,3],[2,3,5],[2,4,2],[3,4,8],[5,1,7],[5,4,4]]}',
        output: "14",
      },
    ],
    complexity: { time: "O(E log E + E α(V))", space: "O(V+E)" },
    learning: {
      intuition:
        "A cheap road is useful only if it joins two groups not already connected.",
      approach: [
        "Sort roads by repair cost.",
        "Use disjoint-set union to accept only roads between different groups.",
        "Stop after n−1 roads or report that connection is impossible.",
      ],
      explanation:
        "Kruskal's cut property permits the cheapest available edge between components without losing an optimal spanning tree.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2, 3],
      [2, 3, 5],
      [2, 4, 2],
      [3, 4, 8],
      [5, 1, 7],
      [5, 4, 4],
    ] as Weighted[],
  },
  source: `const parent=Array.from({length:nodes+1},(_,i)=>i),size=Array(nodes+1).fill(1);function find(x){while(parent[x]!==x)x=parent[x]=parent[parent[x]];return x;}\nlet cost=0,chosen=0;for(const [a,b,w] of [...edges].sort((x,y)=>x[2]-y[2]||x[0]-y[0]||x[1]-y[1])){let ra=find(a),rb=find(b);if(ra===rb)continue;if(size[ra]<size[rb])[ra,rb]=[rb,ra];parent[rb]=ra;size[ra]+=size[rb];cost+=w;chosen++;}\nreturn chosen===nodes-1?cost:'IMPOSSIBLE';`,
  parseInput: weightedInput,
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges),
      events: EventDraft[] = [],
      parent = Array.from({ length: nodes + 1 }, (_, i) => i),
      size = Array<number>(nodes + 1).fill(1);
    function find(x: number): number {
      while (parent[x] !== x) x = parent[x] = parent[parent[x]];
      return x;
    }
    const sorted = edges
      .map((edge, i) => ({ edge, i }))
      .sort(
        (x, y) =>
          x.edge[2] - y.edge[2] ||
          x.edge[0] - y.edge[0] ||
          x.edge[1] - y.edge[1],
      );
    let cost = 0,
      chosen = 0;
    for (const {
      edge: [a, b, weight],
      i,
    } of sorted) {
      let ra = find(a),
        rb = find(b);
      events.push(
        event(
          "ANNOTATE",
          [],
          `Consider road ${a}–${b} costing ${weight}.`,
          {},
          2,
        ),
      );
      if (ra === rb) {
        events.push(
          event(
            "UNMARK",
            [`graph:edge:${i}`],
            `Reject ${a}–${b}; it would close a cycle.`,
            {},
            3,
          ),
        );
        continue;
      }
      if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
      parent[rb] = ra;
      size[ra] += size[rb];
      cost += weight;
      chosen++;
      events.push(
        event(
          "MARK",
          [`graph:edge:${i}`],
          `Repair ${a}–${b}; ${chosen} roads chosen, total cost ${cost}.`,
          { status: "path" },
          3,
          {
            schemaVersion: "0.1",
            equation: `total + ${weight} = ${cost}`,
            reason: "This cheapest available road bridges two components.",
          },
        ),
      );
    }
    if (chosen < nodes - 1)
      events.push(
        event(
          "ANNOTATE",
          [],
          "The supplied roads cannot connect every city.",
          {},
          4,
        ),
      );
    if (!events.length)
      events.push(
        event("ANNOTATE", [], "One city needs no repaired road.", {}, 1),
      );
    return {
      initialState: state,
      events,
      output: chosen === nodes - 1 ? String(cost) : "IMPOSSIBLE",
    };
  },
});

const flightRoutesCheck = defineProblem({
  metadata: metadata({
    id: "flight-routes-check",
    title: "Flight Routes Check",
    task: "1682",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Check whether every city can reach every other through directed flights.",
    limits: "1–10 cities, at most 24 distinct directed flights",
    tags: ["DFS", "strong connectivity"],
    examples: [
      {
        input: '{"nodes":4,"edges":[[1,2],[2,3],[3,1],[1,4],[3,4]]}',
        output: "NO\n4 1",
      },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition:
        "Strong connectivity requires city 1 to reach all cities and all cities to reach city 1.",
      approach: [
        "Traverse the original graph from city 1.",
        "Traverse the reversed graph from city 1.",
        "Return a concrete unreachable pair when either traversal misses a city.",
      ],
      explanation:
        "The two traversals establish paths 1→v and v→1 for every v; concatenating them gives a path between any ordered pair.",
    },
  }),
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 2],
      [2, 3],
      [3, 1],
      [1, 4],
      [3, 4],
    ] as Edge[],
  },
  source: `function reach(reverse){const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges)adj[reverse?b:a].push(reverse?a:b);const seen=Array(nodes+1).fill(false),stack=[1];seen[1]=true;while(stack.length)for(const next of adj[stack.pop()])if(!seen[next]){seen[next]=true;stack.push(next);}return seen;}\nconst forward=reach(false);for(let city=1;city<=nodes;city++)if(!forward[city])return 'NO\\n1 '+city;const backward=reach(true);for(let city=1;city<=nodes;city++)if(!backward[city])return 'NO\\n'+city+' 1';return 'YES';`,
  parseInput(raw) {
    return graphInput(raw, true);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges, true),
      events: EventDraft[] = [];
    function reach(reverse: boolean) {
      const adj = adjacency(
          nodes,
          edges.map(([a, b]) =>
            reverse ? ([b, a] as Edge) : ([a, b] as Edge),
          ),
          true,
        ),
        seen = Array<boolean>(nodes + 1).fill(false),
        stack = [1];
      seen[1] = true;
      events.push(
        event(
          "DISCOVER_NODE",
          ["graph:node:1"],
          reverse
            ? "Start in the reversed flight graph."
            : "Start from city 1 in the original flight graph.",
          {},
          1,
        ),
      );
      while (stack.length) {
        const node = stack.pop()!;
        events.push(
          event(
            "VISIT_NODE",
            [`graph:node:${node}`],
            `${reverse ? "Reverse" : "Forward"} traversal reaches city ${node}.`,
            {},
            2,
          ),
        );
        for (const next of adj[node])
          if (!seen[next]) {
            seen[next] = true;
            stack.push(next);
            events.push(
              event(
                "DISCOVER_NODE",
                [`graph:node:${next}`],
                `Discover ${next} through ${reverse ? "a reversed" : "a forward"} flight.`,
                {},
                2,
              ),
            );
          }
      }
      return seen;
    }
    const forward = reach(false);
    for (let city = 1; city <= nodes; city++)
      if (!forward[city]) {
        events.push(
          event("ANNOTATE", [], `City 1 cannot reach ${city}.`, {}, 3),
        );
        return { initialState: state, events, output: `NO\n1 ${city}` };
      }
    for (let city = 1; city <= nodes; city++)
      events.push(
        event(
          "UNMARK",
          [`graph:node:${city}`],
          "Clear forward highlights before the reverse traversal.",
          {},
          3,
        ),
      );
    const backward = reach(true);
    for (let city = 1; city <= nodes; city++)
      if (!backward[city]) {
        events.push(
          event("ANNOTATE", [], `City ${city} cannot reach city 1.`, {}, 4),
        );
        return { initialState: state, events, output: `NO\n${city} 1` };
      }
    events.push(
      event(
        "ANNOTATE",
        [],
        "Every city reaches and is reached by city 1.",
        {},
        4,
      ),
    );
    return { initialState: state, events, output: "YES" };
  },
});

export const graphFoundationProblems = [
  entry(buildingRoads),
  entry(courseSchedule),
  entry(roadReparation),
  entry(flightRoutesCheck),
];
