import { defineProblem, InputError } from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";
import { adjacency, graphInput, graphState } from "./graph-foundations";

type Edge = [number, number];
function dagInput(raw: unknown, minNodes = 1) {
  const { nodes, edges } = graphInput(raw, true);
  if (nodes < minNodes)
    throw new InputError(`This task needs at least ${minNodes} cities`);
  const out = adjacency(nodes, edges, true),
    degree = Array<number>(nodes + 1).fill(0);
  for (const [, to] of edges) degree[to]++;
  const queue: number[] = [];
  for (let node = 1; node <= nodes; node++) if (!degree[node]) queue.push(node);
  for (let head = 0; head < queue.length; head++)
    for (const next of out[queue[head]])
      if (--degree[next] === 0) queue.push(next);
  if (queue.length !== nodes)
    throw new InputError("The flight network must be acyclic");
  return { nodes, edges };
}
function topological(nodes: number, edges: Edge[]) {
  const out = adjacency(nodes, edges, true),
    degree = Array<number>(nodes + 1).fill(0),
    queue: number[] = [];
  for (const [, to] of edges) degree[to]++;
  for (let node = 1; node <= nodes; node++) if (!degree[node]) queue.push(node);
  for (let head = 0; head < queue.length; head++)
    for (const next of out[queue[head]])
      if (--degree[next] === 0) queue.push(next);
  return { out, order: queue };
}

const gameRoutes = defineProblem({
  metadata: metadata({
    id: "game-routes",
    title: "Game Routes",
    task: "1681",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Count directed routes from the first level to the last in an acyclic network.",
    limits: "1–10 levels, at most 24 distinct directed teleporters, no cycles",
    tags: ["topological sort", "DAG", "path counting"],
    examples: [
      {
        input: '{"nodes":4,"edges":[[1,2],[2,4],[1,3],[3,4],[1,4]]}',
        output: "3",
      },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition:
        "Each route into a level can be extended through each outgoing teleporter.",
      approach: [
        "Order the DAG so every predecessor comes before its successors.",
        "Start with one way to be at level 1.",
        "Pass each node's count along outgoing teleporters, modulo 10⁹+7.",
      ],
      explanation:
        "Every route to a successor has one final incoming edge, and topological order ensures its predecessor count is complete before transfer.",
    },
  }),
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 2],
      [2, 4],
      [1, 3],
      [3, 4],
      [1, 4],
    ] as Edge[],
  },
  source: `const out=Array.from({length:nodes+1},()=>[]),degree=Array(nodes+1).fill(0);for(const [a,b] of edges){out[a].push(b);degree[b]++;}const queue=[];for(let i=1;i<=nodes;i++)if(!degree[i])queue.push(i);const ways=Array(nodes+1).fill(0);ways[1]=1;for(let h=0;h<queue.length;h++){const at=queue[h];for(const next of out[at]){ways[next]=(ways[next]+ways[at])%1000000007;if(--degree[next]===0)queue.push(next);}}return ways[nodes];`,
  parseInput(raw) {
    return dagInput(raw);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges, true),
      events: EventDraft[] = [],
      { out, order } = topological(nodes, edges),
      ways = Array<number>(nodes + 1).fill(0);
    ways[1] = 1;
    events.push(
      event(
        "DISCOVER_NODE",
        ["graph:node:1"],
        "The start level has one empty route to itself.",
        {},
        1,
      ),
    );
    for (const at of order) {
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${at}`],
          `Process level ${at} with ${ways[at]} routes from level 1.`,
          {},
          1,
        ),
      );
      for (const next of out[at]) {
        ways[next] = (ways[next] + ways[at]) % 1_000_000_007;
        events.push(
          event(
            "ANNOTATE",
            [],
            `Teleporter ${at}→${next} raises the route count at ${next} to ${ways[next]}.`,
            { variable: "routes", value: ways[next] },
            1,
            {
              schemaVersion: "0.1",
              equation: `ways[${next}] = ${ways[next]}`,
              reason:
                "Every route to the predecessor extends through this edge.",
            },
          ),
        );
      }
    }
    return { initialState: state, events, output: String(ways[nodes]) };
  },
});

const longestFlightRoute = defineProblem({
  metadata: metadata({
    id: "longest-flight-route",
    title: "Longest Flight Route",
    task: "1680",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Find a route with the most cities from city 1 to city n in a DAG.",
    limits: "2–10 cities, at most 24 distinct directed flights, no cycles",
    tags: ["topological sort", "DAG", "longest path"],
    examples: [
      {
        input: '{"nodes":5,"edges":[[1,2],[2,5],[1,3],[3,4],[4,5]]}',
        output: "4\n1 3 4 5",
      },
    ],
    complexity: { time: "O(V+E)", space: "O(V+E)" },
    learning: {
      intuition:
        "Acyclic order lets us keep the best route into each city before moving onward.",
      approach: [
        "Build a topological order of cities.",
        "Relax each outgoing flight if it makes the destination route longer.",
        "Follow recorded predecessors backward from city n to reconstruct the best route.",
      ],
      explanation:
        "Every path into a city ends with one predecessor edge. The predecessor's optimal route is already known in topological order, so each relaxation is final when all incoming edges have been examined.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [2, 5],
      [1, 3],
      [3, 4],
      [4, 5],
    ] as Edge[],
  },
  source: `const out=Array.from({length:nodes+1},()=>[]),degree=Array(nodes+1).fill(0);for(const [a,b] of edges){out[a].push(b);degree[b]++;}const queue=[];for(let i=1;i<=nodes;i++)if(!degree[i])queue.push(i);const length=Array(nodes+1).fill(-Infinity),parent=Array(nodes+1).fill(0);length[1]=1;for(let h=0;h<queue.length;h++){const at=queue[h];for(const next of out[at]){if(length[at]+1>length[next]){length[next]=length[at]+1;parent[next]=at;}if(--degree[next]===0)queue.push(next);}}if(!Number.isFinite(length[nodes]))return 'IMPOSSIBLE';const path=[];for(let at=nodes;at;at=parent[at])path.push(at);path.reverse();return path.length+'\\n'+path.join(' ');`,
  parseInput(raw) {
    return dagInput(raw, 2);
  },
  trace({ nodes, edges }) {
    const state = graphState(nodes, edges, true),
      events: EventDraft[] = [],
      { out, order } = topological(nodes, edges),
      length = Array<number>(nodes + 1).fill(-Infinity),
      parent = Array<number>(nodes + 1).fill(0);
    length[1] = 1;
    for (const at of order) {
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${at}`],
          Number.isFinite(length[at])
            ? `Best route to city ${at} contains ${length[at]} cities.`
            : `City ${at} is unreachable from city 1.`,
          {},
          1,
        ),
      );
      for (const next of out[at])
        if (length[at] + 1 > length[next]) {
          length[next] = length[at] + 1;
          parent[next] = at;
          events.push(
            event(
              "ANNOTATE",
              [],
              `Flight ${at}→${next} improves the longest route to ${next} to ${length[next]} cities.`,
              { variable: "routeLength", value: length[next] },
              1,
            ),
          );
        }
    }
    if (!Number.isFinite(length[nodes])) {
      events.push(
        event(
          "ANNOTATE",
          [],
          `City ${nodes} cannot be reached from city 1.`,
          {},
          1,
        ),
      );
      return { initialState: state, events, output: "IMPOSSIBLE" };
    }
    const path: number[] = [];
    for (let at = nodes; at; at = parent[at]) path.push(at);
    path.reverse();
    for (const city of path)
      events.push(
        event(
          "MARK",
          [`graph:node:${city}`],
          `City ${city} belongs to a maximum-length route.`,
          { status: "path" },
          1,
        ),
      );
    return {
      initialState: state,
      events,
      output: `${path.length}\n${path.join(" ")}`,
    };
  },
});

export const dagRouteProblems = [entry(gameRoutes), entry(longestFlightRoute)];
