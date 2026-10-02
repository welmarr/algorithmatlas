import { emptyState } from "@sim/domain";
import {
  defineProblem,
  InputError,
  integer,
  readObject,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";

const countingRooms = defineProblem({
  metadata: metadata({
    id: "counting-rooms",
    title: "Counting Rooms",
    task: "1192",
    category: "Depth-First Search",
    renderer: "grid",
    summary: "Count connected regions of floor cells in a map.",
    limits: "1–10 rows and columns of . and #",
    tags: ["DFS", "flood fill"],
    examples: [{ input: '{"rows":["..#","###","#.."]}', output: "2" }],
    complexity: { time: "O(rows·columns)", space: "O(rows·columns)" },
    learning: {
      intuition: "One DFS consumes exactly one connected room.",
      approach: [
        "Scan for an unvisited floor cell.",
        "Flood fill its four-direction neighbors.",
        "Count each new flood fill.",
      ],
      explanation:
        "Every floor cell belongs to one connected component and is visited once.",
    },
  }),
  defaultInput: {
    rows: ["########", "#..#...#", "####.#.#", "#..#...#", "########"],
  },
  source: `let rooms=0; const seen=new Set();\nfor (let r=0;r<rows.length;r++) for (let c=0;c<rows[0].length;c++) {\n  if (rows[r][c]==='#' || seen.has(r+','+c)) continue;\n  rooms++; seen.add(r+','+c);\n  const stack=[[r,c]];\n  while (stack.length) {\n    const [row,col]=stack.pop();\n    for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nr=row+dr,nc=col+dc; if (rows[nr]?.[nc]==='.' && !seen.has(nr+','+nc)) { seen.add(nr+','+nc); stack.push([nr,nc]); } }\n  }\n}\nreturn rooms;`,
  parseInput(raw) {
    const rows = readObject(raw).rows;
    if (
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > 10 ||
      !rows.every(
        (row) =>
          typeof row === "string" &&
          row.length >= 1 &&
          row.length <= 10 &&
          row.length === rows[0].length &&
          /^[.#]+$/.test(row),
      )
    )
      throw new InputError("rows must form a 1–10 by 1–10 map using . and #");
    return { rows: rows as string[] };
  },
  trace({ rows }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      seen = new Set<string>();
    rows.forEach((row, r) =>
      [...row].forEach((char, c) => {
        const id = `grid:${r}:${c}`;
        state.entities[id] = {
          id,
          kind: "grid",
          label: char,
          status: char === "#" ? "blocked" : "idle",
          metadata: { row: r, col: c },
        };
      }),
    );
    let rooms = 0;
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[0].length; c++) {
        const start = `${r}:${c}`;
        if (rows[r][c] === "#" || seen.has(start)) continue;
        rooms++;
        seen.add(start);
        events.push(
          event(
            "ANNOTATE",
            [],
            `Room ${rooms} starts at row ${r + 1}, column ${c + 1}.`,
            { variable: "rooms", value: rooms },
            4,
          ),
        );
        const stack: [number, number][] = [[r, c]];
        events.push(
          event(
            "DISCOVER_CELL",
            [`grid:${r}:${c}`],
            "Discover room entrance.",
            {},
            5,
          ),
        );
        while (stack.length) {
          const [row, col] = stack.pop()!;
          events.push(
            event(
              "VISIT_CELL",
              [`grid:${row}:${col}`],
              `Explore floor at (${row + 1}, ${col + 1}) in room ${rooms}.`,
              {},
              7,
            ),
          );
          for (const [dr, dc] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nr = row + dr,
              nc = col + dc,
              key = `${nr}:${nc}`;
            if (
              nr < 0 ||
              nr >= rows.length ||
              nc < 0 ||
              nc >= rows[0].length ||
              rows[nr][nc] !== "." ||
              seen.has(key)
            )
              continue;
            seen.add(key);
            stack.push([nr, nc]);
            events.push(
              event(
                "DISCOVER_CELL",
                [`grid:${nr}:${nc}`],
                `Discover adjacent floor (${nr + 1}, ${nc + 1}).`,
                {},
                8,
              ),
            );
          }
        }
      }
    return { initialState: state, events, output: String(rooms) };
  },
});

type WeightedEdge = [string, string, number];
const shortestRoutes = defineProblem({
  metadata: metadata({
    id: "shortest-routes-i",
    title: "Shortest Routes I",
    task: "1671",
    category: "Shortest Path",
    renderer: "graph",
    summary:
      "Find shortest distances from a source in a directed, nonnegative weighted graph.",
    limits: "2–12 nodes, up to 30 directed edges with positive weights",
    tags: ["Dijkstra", "weighted graph"],
    examples: [
      {
        input:
          '{"nodes":["A","B","C"],"edges":[["A","B",4],["A","C",10],["B","C",2]],"source":"A"}',
        output: "A:0 B:4 C:6",
      },
    ],
    complexity: { time: "O(V² + E)", space: "O(V + E)" },
    learning: {
      intuition:
        "The closest unsettled node cannot later receive a shorter nonnegative route.",
      approach: [
        "Give the source distance zero and others infinity.",
        "Settle the nearest reachable node.",
        "Relax each outgoing edge and repeat.",
      ],
      explanation:
        "Once a node is settled, every alternative route through unsettled nodes is at least as long.",
    },
  }),
  defaultInput: {
    nodes: ["A", "B", "C", "D"],
    edges: [
      ["A", "B", 4],
      ["A", "C", 9],
      ["B", "C", 2],
      ["C", "D", 3],
    ] as WeightedEdge[],
    source: "A",
  },
  source: `const distance=new Map(nodes.map(node=>[node,Infinity])), settled=new Set();\ndistance.set(source,0);\nwhile (settled.size<nodes.length) {\n  const node=nodes.filter(n=>!settled.has(n)).sort((a,b)=>distance.get(a)-distance.get(b))[0]; if (!node || !Number.isFinite(distance.get(node))) break; settled.add(node);\n  for (const [from,to,weight] of edges) { if (from!==node || settled.has(to)) continue;\n    const candidate=distance.get(node)+weight; if (candidate<distance.get(to)) distance.set(to,candidate);\n  }\n}\nreturn nodes.map(node=>Number.isFinite(distance.get(node))?distance.get(node):'∞');`,
  parseInput(raw) {
    const obj = readObject(raw),
      nodes = obj.nodes,
      edges = obj.edges;
    if (
      !Array.isArray(nodes) ||
      nodes.length < 2 ||
      nodes.length > 12 ||
      !nodes.every(
        (n) => typeof n === "string" && /^[A-Za-z0-9_-]{1,12}$/.test(n),
      ) ||
      new Set(nodes).size !== nodes.length
    )
      throw new InputError("nodes must be 2–12 unique short IDs");
    if (typeof obj.source !== "string" || !nodes.includes(obj.source))
      throw new InputError("source must be a node ID");
    if (
      !Array.isArray(edges) ||
      edges.length > 30 ||
      !edges.every(
        (e) =>
          Array.isArray(e) &&
          e.length === 3 &&
          nodes.includes(e[0]) &&
          nodes.includes(e[1]) &&
          e[0] !== e[1] &&
          Number.isSafeInteger(e[2]) &&
          e[2] >= 1 &&
          e[2] <= 10000,
      )
    )
      throw new InputError(
        "edges must be up to 30 valid [from,to,weight] entries",
      );
    return {
      nodes: nodes as string[],
      edges: edges as WeightedEdge[],
      source: obj.source,
    };
  },
  trace({ nodes, edges, source }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      dist = new Map(nodes.map((node) => [node, Infinity])),
      done = new Set<string>();
    nodes.forEach((node) => {
      const id = `graph:node:${node}`;
      state.entities[id] = {
        id,
        kind: "graph-node",
        label: node,
        status: "idle",
        metadata: { distance: "∞" },
      };
      state.entities[`heap:item:${node}`] = {
        id: `heap:item:${node}`,
        kind: "heap-item",
        label: node,
        metadata: { priorityOrder: nodes.indexOf(node) },
        value: 1000000000,
        status: "idle",
      };
    });
    edges.forEach(([from, to, weight], i) => {
      const id = `graph:edge:${i}`;
      state.entities[id] = {
        id,
        kind: "graph-edge",
        label: `${from}→${to}`,
        status: "idle",
        metadata: { from, to, weight, directed: true },
      };
    });
    dist.set(source, 0);
    const enqueued = new Set([source]);
    events.push(
      event(
        "HEAP_UPDATE",
        [`heap:item:${source}`],
        "Source enters the priority queue with distance 0.",
        { value: 0 },
        2,
      ),
    );
    events.push(
      event(
        "HEAP_INSERT",
        [`heap:item:${source}`],
        "Insert the source.",
        {},
        2,
      ),
    );
    events.push(
      event(
        "SET_DISTANCE",
        [`graph:node:${source}`],
        `Source ${source} has distance zero.`,
        { value: 0 },
        2,
      ),
    );
    while (done.size < nodes.length) {
      const node = nodes
        .filter((n) => !done.has(n))
        .sort(
          (a, b) =>
            dist.get(a)! - dist.get(b)! || nodes.indexOf(a) - nodes.indexOf(b),
        )[0];
      if (!node || !Number.isFinite(dist.get(node)!)) break;
      done.add(node);
      events.push(
        event(
          "HEAP_EXTRACT",
          [`heap:item:${node}`],
          `Extract minimum distance ${dist.get(node)} for ${node}.`,
          {},
          4,
          {
            schemaVersion: "0.1",
            reason:
              "The minimum unsettled distance is final because edge weights are nonnegative.",
          },
        ),
      );
      events.push(
        event(
          "VISIT_NODE",
          [`graph:node:${node}`],
          `Settle ${node} at distance ${dist.get(node)}.`,
          {},
          4,
        ),
      );
      edges.forEach(([from, to, weight], i) => {
        if (from !== node || done.has(to)) return;
        const candidate = dist.get(node)! + weight;
        events.push(
          event(
            "RELAX_EDGE",
            [`graph:edge:${i}`],
            `Try ${from}→${to}: ${dist.get(node)} + ${weight} = ${candidate}.`,
            { value: candidate },
            6,
            {
              schemaVersion: "0.1",
              equation: `${dist.get(node)} + ${weight} = ${candidate} ${candidate < dist.get(to)! ? "<" : "≥"} ${Number.isFinite(dist.get(to)!) ? dist.get(to) : "∞"}`,
              reason:
                candidate < dist.get(to)!
                  ? "A shorter route was found. Update the distance, predecessor and queue priority."
                  : "This candidate does not improve the known distance. Reject the relaxation.",
              labels: [
                {
                  entityId: `graph:node:${from}`,
                  label: "From",
                  role: "current",
                },
                {
                  entityId: `graph:node:${to}`,
                  label: "Candidate",
                  role: "comparison",
                },
              ],
            },
          ),
        );
        if (candidate < dist.get(to)!) {
          dist.set(to, candidate);
          events.push(
            event(
              "HEAP_UPDATE",
              [`heap:item:${to}`],
              `Priority of ${to} becomes ${candidate}.`,
              { value: candidate },
              6,
            ),
          );
          if (!enqueued.has(to)) {
            enqueued.add(to);
            events.push(
              event(
                "HEAP_INSERT",
                [`heap:item:${to}`],
                `Queue ${to} with candidate distance ${candidate}.`,
                {},
                6,
              ),
            );
          }
          events.push(
            event(
              "SET_DISTANCE",
              [`graph:node:${to}`],
              `Improve ${to} to ${candidate}.`,
              { value: candidate },
              6,
            ),
          );
          events.push(
            event(
              "SET_PARENT",
              [`graph:node:${to}`],
              `${from} is the predecessor of ${to}.`,
              { value: from },
              6,
            ),
          );
        }
      });
    }
    return {
      initialState: state,
      events,
      output: nodes
        .map(
          (node) =>
            `${node}:${Number.isFinite(dist.get(node)!) ? dist.get(node) : "∞"}`,
        )
        .join(" "),
    };
  },
});

const subordinates = defineProblem({
  metadata: metadata({
    id: "subordinates",
    title: "Subordinates",
    task: "1674",
    category: "Tree Traversal",
    renderer: "tree",
    summary: "Count descendants of every employee in a rooted company tree.",
    limits: "1–16 employees; parents for employees 2–n",
    tags: ["DFS", "subtree size"],
    examples: [{ input: '{"parents":[1,1,2,3]}', output: "4 1 1 0 0" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A manager has every direct child and every descendant of each child.",
      approach: [
        "Build children from each parent.",
        "Visit children before their manager.",
        "Sum 1 + child subtree size for each child.",
      ],
      explanation:
        "Postorder traversal makes each child's result available before calculating its parent.",
    },
  }),
  defaultInput: { parents: [1, 1, 2, 3] },
  source: `const n=parents.length+1, children=Array.from({length:n+1},()=>[]), subordinates=Array(n+1).fill(0); parents.forEach((boss,i)=>children[boss].push(i+2));\nfunction size(node) {\n  let total=1;\n  for (const child of children[node]) total+=size(child);\n  subordinates[node]=total-1;\n  return total;\n}\nsize(1);\nreturn subordinates.slice(1);`,
  parseInput(raw) {
    const parents = readObject(raw).parents;
    if (
      !Array.isArray(parents) ||
      parents.length > 15 ||
      !parents.every(
        (parent, i) =>
          Number.isSafeInteger(parent) && parent >= 1 && parent <= i + 1,
      )
    )
      throw new InputError(
        "parents must list a valid rooted tree for up to 16 employees",
      );
    return { parents: parents as number[] };
  },
  trace({ parents }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      n = parents.length + 1,
      children = Array.from({ length: n + 1 }, () => [] as number[]),
      sizes = Array<number>(n + 1).fill(0);
    for (let node = 1; node <= n; node++) {
      const id = `tree:node:${node}`;
      state.entities[id] = {
        id,
        kind: "tree-node",
        label: String(node),
        status: "idle",
        metadata: node > 1 ? { parent: String(parents[node - 2]) } : undefined,
      };
      if (node > 1) children[parents[node - 2]].push(node);
    }
    const visit = (node: number): number => {
      events.push(
        event(
          "MARK",
          [`tree:node:${node}`],
          `Enter employee ${node}'s subtree.`,
          { status: "active" },
          2,
        ),
      );
      let size = 1;
      for (const child of children[node]) size += visit(child);
      sizes[node] = size - 1;
      events.push(
        event(
          "VISIT_TREE_NODE",
          [`tree:node:${node}`],
          `Employee ${node} has ${sizes[node]} subordinates.`,
          {},
          5,
        ),
      );
      events.push(
        event(
          "SET_SUBTREE_SIZE",
          [`tree:node:${node}`],
          `Store subtree count ${sizes[node]}.`,
          { value: sizes[node] },
          5,
        ),
      );
      return size;
    };
    visit(1);
    return { initialState: state, events, output: sizes.slice(1).join(" ") };
  },
});

type Road = [number, number];
const roadConstruction = defineProblem({
  metadata: metadata({
    id: "road-construction",
    title: "Road Construction",
    task: "1676",
    category: "Advanced Structures",
    renderer: "graph",
    summary:
      "Track connected components and the largest component as roads are added.",
    limits: "2–12 cities and 1–24 roads",
    tags: ["disjoint set union", "connectivity"],
    examples: [
      {
        input: '{"cities":4,"roads":[[1,2],[2,3],[1,3]]}',
        output: "3 2 | 2 3 | 2 3",
      },
    ],
    complexity: { time: "O((n+m) α(n))", space: "O(n+m)" },
    learning: {
      intuition: "Only roads joining different components change connectivity.",
      approach: [
        "Start with one component per city.",
        "Find both endpoint roots and union them if different.",
        "Record component count and largest size after each road.",
      ],
      explanation:
        "Path compression and union by size make repeated connectivity checks efficient.",
    },
  }),
  defaultInput: {
    cities: 5,
    roads: [
      [1, 2],
      [3, 4],
      [2, 3],
      [4, 5],
    ] as Road[],
  },
  source: `const parent=Array.from({length:cities+1},(_,i)=>i), size=Array(cities+1).fill(1); let components=cities, largest=1; const answer=[];\nfunction find(x) { return parent[x]===x?x:parent[x]=find(parent[x]); }\nfor (const [a,b] of roads) {\n  let ra=find(a),rb=find(b); if (ra!==rb) { if (size[ra]<size[rb]) [ra,rb]=[rb,ra]; parent[rb]=ra; size[ra]+=size[rb]; components--; largest=Math.max(largest,size[ra]); }\n  answer.push([components,largest]);\n}\nreturn answer;`,
  parseInput(raw) {
    const obj = readObject(raw),
      cities = integer(obj.cities, "cities", 2, 12),
      roads = obj.roads;
    if (
      !Array.isArray(roads) ||
      roads.length < 1 ||
      roads.length > 24 ||
      !roads.every(
        (road) =>
          Array.isArray(road) &&
          road.length === 2 &&
          Number.isSafeInteger(road[0]) &&
          Number.isSafeInteger(road[1]) &&
          road[0] >= 1 &&
          road[0] <= cities &&
          road[1] >= 1 &&
          road[1] <= cities &&
          road[0] !== road[1],
      )
    )
      throw new InputError(
        "roads must contain 1–24 valid pairs of distinct cities",
      );
    return { cities, roads: roads as Road[] };
  },
  trace({ cities, roads }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      parent = Array.from({ length: cities + 1 }, (_, i) => i),
      size = Array<number>(cities + 1).fill(1),
      answers: string[] = [];
    for (let city = 1; city <= cities; city++) {
      const id = `graph:node:${city}`;
      state.entities[id] = {
        id,
        kind: "graph-node",
        label: String(city),
        status: "idle",
      };
    }
    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    let components = cities,
      largest = 1;
    roads.forEach(([a, b], index) => {
      const id = `graph:edge:${index}`;
      events.push(
        event(
          "CREATE_ENTITY",
          [id],
          `Add road ${a}–${b}.`,
          {
            kind: "graph-edge",
            label: `${a}–${b}`,
            from: String(a),
            to: String(b),
          },
          3,
        ),
      );
      let ra = find(a),
        rb = find(b);
      if (ra !== rb) {
        if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
        parent[rb] = ra;
        size[ra] += size[rb];
        components--;
        largest = Math.max(largest, size[ra]);
        events.push(
          event(
            "MARK",
            [id],
            `Merge components of ${a} and ${b}; size ${size[ra]}.`,
            { status: "path" },
            4,
          ),
        );
      } else
        events.push(
          event(
            "MARK",
            [id],
            "This road stays within one component.",
            { status: "visited" },
            4,
          ),
        );
      answers.push(`${components} ${largest}`);
      events.push(
        event(
          "ANNOTATE",
          [],
          `${components} components; largest has ${largest} cities.`,
          { variable: "components", value: components },
          5,
        ),
      );
    });
    return { initialState: state, events, output: answers.join(" | ") };
  },
});

export const graphProblems = [
  entry(countingRooms),
  entry(shortestRoutes),
  entry(subordinates),
  entry(roadConstruction),
];
