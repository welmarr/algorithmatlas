import Link from "next/link";
import {
  emptyState,
  type RendererKind,
  type SimulationState,
  type VisualEntity,
} from "@sim/domain";
import { Visuals } from "../../../components/Visuals";

function add(state: SimulationState, entity: VisualEntity): void {
  state.entities[entity.id] = entity;
}

function examples(): {
  kind: RendererKind;
  title: string;
  state: SimulationState;
  source?: string;
}[] {
  const array = emptyState();
  [5, 2, 8].forEach((value, index) =>
    add(array, {
      id: `array:${index}`,
      kind: "array",
      label: String(index),
      value,
      status: "idle",
    }),
  );
  array.activeEntities = ["array:1"];
  array.focus = {
    eventId: "example:array",
    kind: "update",
    before: 1,
    after: 2,
  };

  const grid = emptyState();
  ["A.#", "..B"].forEach((row, r) =>
    [...row].forEach((label, c) =>
      add(grid, {
        id: `grid:${r}:${c}`,
        kind: "grid",
        label,
        status:
          label === "#" ? "blocked" : r === 1 && c === 1 ? "path" : "idle",
        metadata: { row: r, col: c },
      }),
    ),
  );
  grid.activeEntities = ["grid:1:1"];
  grid.focus = { eventId: "example:grid", kind: "explore" };

  const graph = emptyState();
  for (const label of ["A", "B", "C"])
    add(graph, {
      id: `graph:node:${label}`,
      kind: "graph-node",
      label,
      status: label === "A" ? "visited" : "discovered",
      metadata: label === "B" ? { distance: 4, parent: "A" } : undefined,
    });
  add(graph, {
    id: "graph:edge:0",
    kind: "graph-edge",
    label: "A-B",
    status: "active",
    metadata: { from: "A", to: "B", directed: true, weight: 4 },
  });
  add(graph, {
    id: "graph:edge:1",
    kind: "graph-edge",
    label: "B-C",
    status: "path",
    metadata: { from: "B", to: "C", directed: true, weight: 2 },
  });
  graph.activeEntities = ["graph:edge:0"];
  graph.focus = { eventId: "example:graph", kind: "update" };

  const tree = emptyState();
  for (const [label, parent] of [
    ["A", ""],
    ["B", "A"],
    ["C", "A"],
    ["D", "B"],
    ["E", "B"],
  ])
    add(tree, {
      id: `tree:node:${label}`,
      kind: "tree-node",
      label,
      status: label === "D" ? "path" : "idle",
      metadata: parent ? { parent } : undefined,
    });
  tree.activeEntities = ["tree:node:D"];
  tree.focus = { eventId: "example:tree", kind: "result" };

  const dp = emptyState();
  [
    [1, 1],
    [1, 2],
    [1, 3],
  ].forEach((row, r) =>
    row.forEach((value, c) =>
      add(dp, {
        id: `dp:${r}:${c}`,
        kind: "dp",
        label: `${r},${c}`,
        value,
        status: "idle",
        metadata: { row: r, col: c },
      }),
    ),
  );
  dp.activeEntities = ["dp:1:2", "dp:0:2", "dp:1:1"];
  dp.focus = { eventId: "example:dp", kind: "update", before: 0, after: 3 };

  const collections = emptyState();
  for (const kind of ["queue", "stack", "heap"] as const) {
    ["A", "B", "C"].forEach((label, index) =>
      add(collections, {
        id: `${kind}:item:${label}`,
        kind: `${kind}-item`,
        label,
        value: kind === "heap" ? [3, 1, 5][index] : undefined,
        status: "idle",
      }),
    );
    collections.collections[kind] =
      kind === "heap"
        ? ["heap:item:B", "heap:item:A", "heap:item:C"]
        : ["A", "B", "C"].map((label) => `${kind}:item:${label}`);
  }
  collections.activeEntities = ["queue:item:A", "stack:item:C", "heap:item:B"];

  const variables = emptyState();
  variables.variables = { index: 2, total: 17 };
  variables.focus = {
    eventId: "example:variables",
    kind: "update",
    variable: "total",
    before: 9,
    after: 17,
  };

  return [
    { kind: "array", title: "Array", state: array },
    { kind: "grid", title: "Grid", state: grid },
    { kind: "graph", title: "Directed weighted graph", state: graph },
    { kind: "tree", title: "Hierarchical tree", state: tree },
    { kind: "dp", title: "2D DP table", state: dp },
    { kind: "queue", title: "Queue", state: collections },
    { kind: "stack", title: "Stack", state: collections },
    { kind: "heap", title: "Priority queue", state: collections },
    { kind: "variables", title: "Variables", state: variables },
    {
      kind: "code",
      title: "Code",
      state: emptyState(),
      source: "let total = 0;\ntotal = total + 1;\nreturn total;",
    },
  ];
}

export default function RendererGallery() {
  return (
    <main className="workspace renderer-gallery">
      <Link className="back-link" href="/lab">
        ← Algorithm Lab
      </Link>
      <div className="eyebrow">RENDERER FOUNDATION</div>
      <h1>Structure gallery</h1>
      <p>Examples of the visual language used by algorithm simulations.</p>
      <div className="renderer-gallery-grid">
        {examples().map(({ kind, title, state, source }) => (
          <section
            className="panel renderer-gallery-card"
            key={kind}
            data-renderer-kind={kind}
          >
            <h2>{title}</h2>
            <Visuals
              kind={kind}
              state={state}
              source={source}
              activeLine={kind === "code" ? 2 : undefined}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
