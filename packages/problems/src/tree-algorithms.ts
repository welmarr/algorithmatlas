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

function treeInput(raw: unknown) {
  const object = readObject(raw),
    nodes = integer(object.nodes, "nodes", 1, 12),
    value = object.edges;
  if (!Array.isArray(value) || value.length !== nodes - 1)
    throw new InputError("A tree needs exactly nodes−1 edges");
  const edges: Edge[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`edges[${i}] must be a pair`);
    const a = integer(item[0], `edges[${i}][0]`, 1, nodes),
      b = integer(item[1], `edges[${i}][1]`, 1, nodes);
    if (a === b) throw new InputError("A tree edge cannot loop to itself");
    return [a, b];
  });
  const keys = edges.map(([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`);
  if (new Set(keys).size !== edges.length)
    throw new InputError("Tree edges must be distinct");
  const adj = adjacency(nodes, edges),
    seen = new Set([1]),
    pending = [1];
  while (pending.length)
    for (const next of adj[pending.shift()!])
      if (!seen.has(next)) {
        seen.add(next);
        pending.push(next);
      }
  if (seen.size !== nodes)
    throw new InputError("Tree edges must connect every node");
  return { nodes, edges };
}

function adjacency(nodes: number, edges: Edge[]) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

function treeState(nodes: number, edges: Edge[]) {
  const state = emptyState(),
    adj = adjacency(nodes, edges),
    seen = new Set([1]),
    queue = [1];
  for (let node = 1; node <= nodes; node++) {
    const id = `tree:node:${node}`;
    state.entities[id] = {
      id,
      kind: "tree-node",
      label: String(node),
      status: "idle",
    };
  }
  while (queue.length) {
    const at = queue.shift()!;
    for (const next of adj[at])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
        state.entities[`tree:node:${next}`].metadata = { parent: String(at) };
      }
  }
  return state;
}

function farthest(
  nodes: number,
  adj: number[][],
  start: number,
  events: EventDraft[] | null,
  pass: number,
) {
  const dist = Array<number>(nodes + 1).fill(-1),
    queue = [start];
  dist[start] = 0;
  let best = start;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    if (dist[at] > dist[best]) best = at;
    events?.push(
      event(
        "VISIT_TREE_NODE",
        [`tree:node:${at}`],
        `Pass ${pass}: city ${at} is ${dist[at]} edges from ${start}.`,
        {},
        1,
      ),
    );
    for (const next of adj[at])
      if (dist[next] < 0) {
        dist[next] = dist[at] + 1;
        queue.push(next);
      }
  }
  return { best, dist };
}

const treeDistancesI = defineProblem({
  metadata: metadata({
    id: "tree-distances-i",
    title: "Tree Distances I",
    task: "1132",
    category: "Trees",
    renderer: "tree",
    summary: "Find each node's greatest distance to any other node in a tree.",
    limits: "1–12 nodes and exactly n−1 distinct connected edges",
    tags: ["tree diameter", "BFS", "eccentricity"],
    examples: [
      {
        input: '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]]}',
        output: "2 3 2 3 3",
      },
    ],
    complexity: { time: "O(V)", space: "O(V)" },
    learning: {
      intuition:
        "One endpoint of a diameter is far enough to expose every node's worst distance, together with the other endpoint.",
      approach: [
        "Find a diameter endpoint by searching from any node.",
        "Search from that endpoint to find the other endpoint and distances.",
        "Search from the other endpoint; take the larger of the two distances at each node.",
      ],
      explanation:
        "For a tree diameter with endpoints a and b, a farthest node from any v is one of a or b, so max(dist(v,a),dist(v,b)) is v's eccentricity.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges){adj[a].push(b);adj[b].push(a);}function bfs(start){const d=Array(nodes+1).fill(-1),q=[start];d[start]=0;let far=start;for(let h=0;h<q.length;h++){const at=q[h];if(d[at]>d[far])far=at;for(const next of adj[at])if(d[next]<0){d[next]=d[at]+1;q.push(next);}}return {far,d};}const a=bfs(1).far,first=bfs(a),second=bfs(first.far);return Array.from({length:nodes},(_,i)=>Math.max(first.d[i+1],second.d[i+1])).join(' ');`,
  parseInput: treeInput,
  trace({ nodes, edges }) {
    const state = treeState(nodes, edges),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges);
    const a = farthest(nodes, adj, 1, events, 1).best;
    const fromA = farthest(nodes, adj, a, events, 2);
    const fromB = farthest(nodes, adj, fromA.best, events, 3);
    const values = Array.from({ length: nodes }, (_, i) =>
      Math.max(fromA.dist[i + 1], fromB.dist[i + 1]),
    );
    events.push(
      event(
        "ANNOTATE",
        [],
        `Take the larger endpoint distance for each node: ${values.join(", ")}.`,
        {},
        1,
      ),
    );
    return { initialState: state, events, output: values.join(" ") };
  },
});

const treeDistancesII = defineProblem({
  metadata: metadata({
    id: "tree-distances-ii",
    title: "Tree Distances II",
    task: "1133",
    category: "Trees",
    renderer: "tree",
    summary: "Sum the distances from every node to all other nodes.",
    limits: "1–12 nodes and exactly n−1 distinct connected edges",
    tags: ["rerooting", "tree DP", "subtree sizes"],
    examples: [
      {
        input: '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]]}',
        output: "6 9 5 8 8",
      },
    ],
    complexity: { time: "O(V)", space: "O(V)" },
    learning: {
      intuition:
        "Moving the root across an edge makes one subtree one step closer and all other nodes one step farther.",
      approach: [
        "Root at node 1 and compute depths and subtree sizes.",
        "The first sum is the sum of depths from root 1.",
        "Reroot across each parent-child edge using total[child] = total[parent] + n − 2·size[child].",
      ],
      explanation:
        "The child subtree contributes −size[child], while the remaining n−size[child] nodes contribute +1 each.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges){adj[a].push(b);adj[b].push(a);}const parent=Array(nodes+1).fill(0),depth=Array(nodes+1).fill(0),order=[1];for(let h=0;h<order.length;h++){const at=order[h];for(const next of adj[at])if(next!==parent[at]){parent[next]=at;depth[next]=depth[at]+1;order.push(next);}}const size=Array(nodes+1).fill(1),total=Array(nodes+1).fill(0);total[1]=depth.slice(1).reduce((a,b)=>a+b,0);for(let i=order.length-1;i>0;i--)size[parent[order[i]]]+=size[order[i]];for(const at of order.slice(1))total[at]=total[parent[at]]+nodes-2*size[at];return total.slice(1).join(' ');`,
  parseInput: treeInput,
  trace({ nodes, edges }) {
    const state = treeState(nodes, edges),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges),
      parent = Array<number>(nodes + 1).fill(0),
      depth = Array<number>(nodes + 1).fill(0),
      order = [1];
    for (let head = 0; head < order.length; head++) {
      const at = order[head];
      events.push(
        event(
          "VISIT_TREE_NODE",
          [`tree:node:${at}`],
          `Rooted traversal reaches node ${at} at depth ${depth[at]}.`,
          {},
          1,
        ),
      );
      for (const next of adj[at])
        if (next !== parent[at]) {
          parent[next] = at;
          depth[next] = depth[at] + 1;
          order.push(next);
        }
    }
    const size = Array<number>(nodes + 1).fill(1),
      total = Array<number>(nodes + 1).fill(0);
    total[1] = depth.slice(1).reduce((a, b) => a + b, 0);
    for (let i = order.length - 1; i > 0; i--)
      size[parent[order[i]]] += size[order[i]];
    events.push(
      event("ANNOTATE", [], `Distance sum from root 1 is ${total[1]}.`, {}, 1),
    );
    for (const at of order.slice(1)) {
      total[at] = total[parent[at]] + nodes - 2 * size[at];
      events.push(
        event(
          "VISIT_TREE_NODE",
          [`tree:node:${at}`],
          `Reroot at ${at}: subtree size ${size[at]}, distance sum ${total[at]}.`,
          {},
          1,
          {
            schemaVersion: "0.1",
            equation: `${total[parent[at]]} + ${nodes} − 2·${size[at]} = ${total[at]}`,
            reason:
              "Nodes inside the child subtree get closer; the others get farther.",
          },
        ),
      );
    }
    return { initialState: state, events, output: total.slice(1).join(" ") };
  },
});

const treeMatching = defineProblem({
  metadata: metadata({
    id: "tree-matching",
    title: "Tree Matching",
    task: "1130",
    category: "Trees",
    renderer: "tree",
    summary: "Choose as many tree edges as possible without sharing endpoints.",
    limits: "1–12 nodes and exactly n−1 distinct connected edges",
    tags: ["tree DP", "matching", "postorder"],
    examples: [
      { input: '{"nodes":5,"edges":[[1,2],[1,3],[3,4],[3,5]]}', output: "2" },
    ],
    complexity: { time: "O(V)", space: "O(V)" },
    learning: {
      intuition:
        "At each node, either match it to one child or leave it unmatched among its children.",
      approach: [
        "Process children before their parent.",
        "Store the best subtree matching when the node is free or already paired to its parent.",
        "Try each child as the unique edge paired to the current node.",
      ],
      explanation:
        "A matching can use at most one incident child edge at a node. Considering none and each possible child covers all legal choices.",
    },
  }),
  defaultInput: {
    nodes: 5,
    edges: [
      [1, 2],
      [1, 3],
      [3, 4],
      [3, 5],
    ] as Edge[],
  },
  source: `const adj=Array.from({length:nodes+1},()=>[]);for(const [a,b] of edges){adj[a].push(b);adj[b].push(a);}function solve(at,parent){let base=0,best=0;const children=[];for(const next of adj[at])if(next!==parent){const [free,blocked]=solve(next,at);children.push([free,blocked]);base+=free;}best=base;for(const [free,blocked] of children)best=Math.max(best,base-free+blocked+1);return [best,base];}return solve(1,0)[0];`,
  parseInput: treeInput,
  trace({ nodes, edges }) {
    const state = treeState(nodes, edges),
      events: EventDraft[] = [],
      adj = adjacency(nodes, edges);
    function solve(at: number, parent: number): [number, number] {
      const children: [number, number][] = [];
      let base = 0;
      for (const next of adj[at])
        if (next !== parent) {
          const pair = solve(next, at);
          children.push(pair);
          base += pair[0];
        }
      let best = base;
      for (const [free, blocked] of children)
        best = Math.max(best, base - free + blocked + 1);
      events.push(
        event(
          "VISIT_TREE_NODE",
          [`tree:node:${at}`],
          `At node ${at}, best free matching ${best}; if paired to parent, ${base}.`,
          {},
          1,
          {
            schemaVersion: "0.1",
            equation: `free(${at}) = ${best}`,
            reason: "Try no child edge and each one-child matching choice.",
          },
        ),
      );
      return [best, base];
    }
    const best = solve(1, 0)[0];
    return { initialState: state, events, output: String(best) };
  },
});

function companyInput(raw: unknown) {
  const object = readObject(raw),
    nodes = integer(object.nodes, "nodes", 1, 12),
    value = object.parents,
    q = object.queries;
  if (!Array.isArray(value) || value.length !== nodes - 1)
    throw new InputError("parents must contain one boss for each employee 2…n");
  const parents = value.map((item, i) =>
    integer(item, `parents[${i}]`, 1, i + 1),
  );
  if (!Array.isArray(q) || q.length < 1 || q.length > 20)
    throw new InputError("queries must contain 1–20 employee/level pairs");
  const queries: Edge[] = q.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`queries[${i}] must be a pair`);
    return [
      integer(item[0], `queries[${i}][0]`, 1, nodes),
      integer(item[1], `queries[${i}][1]`, 1, nodes),
    ];
  });
  return { nodes, parents, queries };
}

const companyQueriesI = defineProblem({
  metadata: metadata({
    id: "company-queries-i",
    title: "Company Queries I",
    task: "1687",
    category: "Trees",
    renderer: "tree",
    summary: "Find the boss a given number of levels above an employee.",
    limits: "1–12 employees, boss of i must be < i, 1–20 queries",
    tags: ["binary lifting", "ancestors", "tree queries"],
    examples: [
      {
        input: '{"nodes":5,"parents":[1,1,3,3],"queries":[[4,1],[4,2],[4,3]]}',
        output: "3\n1\n-1",
      },
    ],
    complexity: { time: "O(V log V + Q log V)", space: "O(V log V)" },
    learning: {
      intuition:
        "A jump of k levels can be assembled from jumps of powers of two.",
      approach: [
        "Store each employee's immediate boss.",
        "Build boss[power][employee] by composing two half-size jumps.",
        "For each query, follow the jumps indicated by set bits of k.",
      ],
      explanation:
        "Binary decomposition gives at most log n jumps, and the doubling table gives each power-of-two ancestor exactly.",
    },
  }),
  defaultInput: {
    nodes: 5,
    parents: [1, 1, 3, 3],
    queries: [
      [4, 1],
      [4, 2],
      [4, 3],
    ] as Edge[],
  },
  source: `const up=Array.from({length:20},()=>Array(nodes+1).fill(0));for(let i=2;i<=nodes;i++)up[0][i]=parents[i-2];for(let p=1;p<20;p++)for(let i=1;i<=nodes;i++)up[p][i]=up[p-1][up[p-1][i]];return queries.map(([employee,k])=>{let at=employee;for(let bit=0;bit<20;bit++)if(k&(1<<bit))at=up[bit][at];return at||-1;}).join('\\n');`,
  parseInput: companyInput,
  trace({ nodes, parents, queries }) {
    const edges = parents.map((boss, index) => [boss, index + 2] as Edge),
      state = treeState(nodes, edges),
      events: EventDraft[] = [];
    const up = Array.from({ length: 20 }, () =>
      Array<number>(nodes + 1).fill(0),
    );
    for (let employee = 2; employee <= nodes; employee++)
      up[0][employee] = parents[employee - 2];
    for (let power = 1; power < 20; power++)
      for (let employee = 1; employee <= nodes; employee++)
        up[power][employee] = up[power - 1][up[power - 1][employee]];
    const answers: string[] = [];
    for (const [employee, levels] of queries) {
      let at = employee;
      events.push(
        event(
          "VISIT_TREE_NODE",
          [`tree:node:${employee}`],
          `Start ${levels}-level ancestor query at employee ${employee}.`,
          {},
          1,
        ),
      );
      for (let bit = 0; bit < 20; bit++)
        if (levels & (1 << bit)) {
          at = up[bit][at];
          events.push(
            event(
              "ANNOTATE",
              [],
              `Jump ${2 ** bit} levels ${at ? `to employee ${at}` : "beyond the director"}.`,
              {},
              1,
            ),
          );
        }
      answers.push(String(at || -1));
    }
    return { initialState: state, events, output: answers.join("\n") };
  },
});

export const treeAlgorithmProblems = [
  entry(treeDistancesI),
  entry(treeDistancesII),
  entry(treeMatching),
  entry(companyQueriesI),
];
