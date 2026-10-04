import { InputError } from "@sim/problem-sdk";
import {
  graphLesson,
  directedWeighted,
  requireRoute,
  type Weighted,
  type Step,
} from "./graph-wave-shared";

function shortest(
  nodes: number,
  edges: Weighted[],
  start: number,
  reverse = false,
  step: Step = () => {},
) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as [number, number][]);
  for (const [a, b, w] of edges)
    adj[reverse ? b : a].push([reverse ? a : b, w]);
  const dist = Array<number>(nodes + 1).fill(Infinity),
    heap: [number, number][] = [];
  function push(item: [number, number]) {
    heap.push(item);
    for (let child = heap.length - 1; child > 0;) {
      const parent = Math.floor((child - 1) / 2);
      if (heap[parent][0] <= heap[child][0]) break;
      [heap[parent], heap[child]] = [heap[child], heap[parent]];
      child = parent;
    }
  }
  function pop() {
    const best = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let parent = 0; 2 * parent + 1 < heap.length;) {
        let child = 2 * parent + 1;
        if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0])
          child++;
        if (heap[parent][0] <= heap[child][0]) break;
        [heap[parent], heap[child]] = [heap[child], heap[parent]];
        parent = child;
      }
    }
    return best;
  }
  dist[start] = 0;
  push([0, start]);
  while (heap.length) {
    const [cost, node] = pop();
    if (cost !== dist[node]) continue;
    step(node, cost, `Shortest settled cost to ${node} is ${cost}.`);
    for (const [next, weight] of adj[node])
      if (cost + weight < dist[next]) {
        dist[next] = cost + weight;
        push([dist[next], next]);
      }
  }
  return dist;
}
function discountSolve(
  { nodes, edges }: { nodes: number; edges: Weighted[] },
  step: Step = () => {},
) {
  const forward = shortest(nodes, edges, 1, false, step),
    backward = shortest(nodes, edges, nodes, true),
    best = Math.min(
      ...edges.map(([a, b, w]) => forward[a] + Math.floor(w / 2) + backward[b]),
    );
  step(nodes, best, `One coupon on the best edge yields fare ${best}.`);
  return String(best);
}
const flightDiscount = graphLesson({
  meta: {
    id: "flight-discount",
    title: "Flight Discount",
    task: "1195",
    category: "Graphs",
    renderer: "graph",
    summary: "Use one half-price coupon on the cheapest possible flight route.",
    limits: "2–10 cities, 1–24 directed flights, positive prices 1–100",
    tags: ["Dijkstra", "weighted graph", "shortest path"],
    examples: [
      {
        input: '{"nodes":3,"edges":[[1,2,3],[2,3,1],[1,3,7],[2,1,5]]}',
        output: "2",
      },
    ],
    complexity: { time: "O((n+m) log n)", space: "O(n+m)" },
    learning: {
      intuition:
        "Fix the discounted edge; the route before and after it must each be shortest without discounts.",
      approach: [
        "Find shortest costs from city 1.",
        "Find shortest costs to city n in the reversed graph.",
        "Try every edge as the single discounted flight and take the least total.",
      ],
      explanation:
        "Every valid route has one coupon edge. Replacing either surrounding section by its shortest path cannot raise its price.",
    },
  },
  defaultInput: {
    nodes: 3,
    edges: [
      [1, 2, 3],
      [2, 3, 1],
      [1, 3, 7],
      [2, 1, 5],
    ] as Weighted[],
  },
  parse(raw) {
    const input = directedWeighted(raw);
    if (input.nodes < 2)
      throw new InputError("A flight route needs at least two cities");
    requireRoute(input.nodes, input.edges);
    return input;
  },
  solve: discountSolve,
  sourceArgs: "{nodes,edges}",
  helpers: shortest.toString(),
});

function investigationSolve(
  { nodes, edges }: { nodes: number; edges: Weighted[] },
  step: Step = () => {},
) {
  const MOD = 1_000_000_007,
    dist = shortest(nodes, edges, 1, false, step),
    ways = Array<number>(nodes + 1).fill(0),
    fewest = Array<number>(nodes + 1).fill(Infinity),
    most = Array<number>(nodes + 1).fill(-Infinity);
  ways[1] = 1;
  fewest[1] = most[1] = 0;
  const order = Array.from({ length: nodes }, (_, i) => i + 1).sort(
    (a, b) => dist[a] - dist[b],
  );
  const adj = Array.from({ length: nodes + 1 }, () => [] as [number, number][]);
  for (const [a, b, w] of edges) adj[a].push([b, w]);
  for (const node of order)
    if (Number.isFinite(dist[node]))
      for (const [next, w] of adj[node])
        if (dist[node] + w === dist[next]) {
          ways[next] = (ways[next] + ways[node]) % MOD;
          fewest[next] = Math.min(fewest[next], fewest[node] + 1);
          most[next] = Math.max(most[next], most[node] + 1);
          step(
            next,
            ways[next],
            `Shortest route to ${next}: ${ways[next]} ways, ${fewest[next]}–${most[next]} flights.`,
          );
        }
  return `${dist[nodes]} ${ways[nodes]} ${fewest[nodes]} ${most[nodes]}`;
}
const investigation = graphLesson({
  meta: {
    id: "investigation",
    title: "Investigation",
    task: "1202",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Find shortest cost, route count, and fewest/most flights among cheapest routes.",
    limits: "1–10 cities, 1–24 directed positive-price flights",
    tags: ["Dijkstra", "weighted graph", "path counting"],
    examples: [
      {
        input: '{"nodes":4,"edges":[[1,4,5],[1,2,4],[2,4,5],[1,3,2],[3,4,3]]}',
        output: "5 2 1 2",
      },
    ],
    complexity: { time: "O((n+m) log n)", space: "O(n+m)" },
    learning: {
      intuition:
        "Positive costs order the shortest-path graph from lower to higher distance.",
      approach: [
        "Run Dijkstra to find each shortest distance.",
        "Process nodes by distance and retain only edges preserving shortest distance.",
        "Propagate route counts and minimum/maximum flight counts over those edges.",
      ],
      explanation:
        "A shortest route ending at v must use an edge u→v with dist(u)+cost=dist(v). Positive edges make this subgraph acyclic by increasing distance.",
    },
  },
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 4, 5],
      [1, 2, 4],
      [2, 4, 5],
      [1, 3, 2],
      [3, 4, 3],
    ] as Weighted[],
  },
  parse(raw) {
    const input = directedWeighted(raw);
    requireRoute(input.nodes, input.edges);
    return input;
  },
  solve: investigationSolve,
  sourceArgs: "{nodes,edges}",
  helpers: shortest.toString(),
});

function highScoreSolve(
  { nodes, edges }: { nodes: number; edges: Weighted[] },
  step: Step = () => {},
) {
  const score = Array<number>(nodes + 1).fill(-Infinity);
  score[1] = 0;
  for (let pass = 1; pass < nodes; pass++) {
    let changed = false;
    for (const [a, b, w] of edges)
      if (score[a] !== -Infinity && score[a] + w > score[b]) {
        score[b] = score[a] + w;
        changed = true;
        step(
          b,
          score[b],
          `Pass ${pass}: tunnel ${a}→${b} raises reachable score to ${score[b]}.`,
        );
      }
    if (!changed) break;
  }
  const reverse = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) reverse[b].push(a);
  const canReach = Array<boolean>(nodes + 1).fill(false),
    queue = [nodes];
  canReach[nodes] = true;
  for (let i = 0; i < queue.length; i++)
    for (const previous of reverse[queue[i]])
      if (!canReach[previous]) {
        canReach[previous] = true;
        queue.push(previous);
      }
  for (const [a, b, w] of edges)
    if (score[a] !== -Infinity && score[a] + w > score[b] && canReach[b]) {
      step(
        b,
        -1,
        `A profitable cycle reachable from room 1 can still reach room ${nodes}; score is unbounded.`,
      );
      return "-1";
    }
  step(
    nodes,
    score[nodes],
    `The maximum finite score to room ${nodes} is ${score[nodes]}.`,
  );
  return String(score[nodes]);
}
const highScore = graphLesson({
  meta: {
    id: "high-score",
    title: "High Score",
    task: "1673",
    category: "Graphs",
    renderer: "graph",
    summary:
      "Maximize a path score and detect profitable cycles on a route to the destination.",
    limits: "1–10 rooms, 1–24 directed tunnels, scores −100…100",
    tags: ["Bellman-Ford", "positive cycle", "longest path"],
    examples: [
      {
        input:
          '{"nodes":4,"edges":[[1,2,3],[2,4,-1],[1,3,-2],[3,4,7],[1,4,4]]}',
        output: "5",
      },
    ],
    complexity: { time: "O(nm)", space: "O(n+m)" },
    learning: {
      intuition:
        "A score that can still improve after n−1 edge rounds comes from a positive cycle.",
      approach: [
        "Max-relax edges from room 1 for n−1 rounds.",
        "Mark rooms that can reach the destination via reverse edges.",
        "If an improving edge reaches that region, answer −1; otherwise report the finite best score.",
      ],
      explanation:
        "Only a positive cycle both reachable from the start and able to reach the finish makes the requested score unbounded.",
    },
  },
  defaultInput: {
    nodes: 4,
    edges: [
      [1, 2, 3],
      [2, 4, -1],
      [1, 3, -2],
      [3, 4, 7],
      [1, 4, 4],
    ] as Weighted[],
  },
  parse(raw) {
    const input = directedWeighted(raw, true);
    requireRoute(input.nodes, input.edges);
    return input;
  },
  solve: highScoreSolve,
  sourceArgs: "{nodes,edges}",
});

export const wave100GraphPathProblems = [
  flightDiscount,
  investigation,
  highScore,
];
