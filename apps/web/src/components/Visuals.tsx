"use client";
import type {
  RendererKind,
  SimulationState,
  StepFocusKind,
  VisualEntity,
} from "@sim/domain";

const cueLabels: Record<StepFocusKind, string> = {
  inspect: "READ",
  update: "CHANGE",
  explore: "EXPLORE",
  result: "RESULT",
};

export const rendererLegends: Record<
  RendererKind,
  { label: string; cue: string }[]
> = {
  array: [
    { label: "Current value", cue: "active" },
    { label: "Value changed", cue: "update" },
  ],
  grid: [
    { label: "Current cell", cue: "active" },
    { label: "Explored", cue: "discovered" },
    { label: "Final path", cue: "path" },
    { label: "Wall", cue: "blocked" },
  ],
  graph: [
    { label: "Current node", cue: "active" },
    { label: "Discovered", cue: "discovered" },
    { label: "Visited", cue: "visited" },
    { label: "Shortest path", cue: "path" },
  ],
  tree: [
    { label: "Current node", cue: "active" },
    { label: "Visited", cue: "visited" },
    { label: "Diameter path", cue: "path" },
  ],
  dp: [
    { label: "Current cell", cue: "active" },
    { label: "Updated value", cue: "update" },
  ],
};

function isCurrent(entity: VisualEntity, state: SimulationState): boolean {
  return state.activeEntities.includes(entity.id);
}

function className(entity: VisualEntity, state: SimulationState): string {
  return `visual-entity status-${entity.status}${isCurrent(entity, state) ? ` is-active cue-${state.focus?.kind ?? "inspect"}` : ""}`;
}

function focusKey(entity: VisualEntity, state: SimulationState): string {
  return isCurrent(entity, state)
    ? `${entity.id}:${state.focus?.eventId}`
    : entity.id;
}
function ArrayVisual({ state }: { state: SimulationState }) {
  const items = Object.values(state.entities)
    .filter((entity) => entity.kind === "array")
    .sort((a, b) => Number(a.label) - Number(b.label));
  return (
    <div className="array-visual" role="list" aria-label="Array values">
      {items.map((item) => (
        <div
          role="listitem"
          key={focusKey(item, state)}
          className={className(item, state)}
          aria-label={`Index ${item.label}: ${item.value}, ${item.status}${isCurrent(item, state) ? `, current ${state.focus?.kind}` : ""}`}
        >
          {isCurrent(item, state) && (
            <span className="cell-cue" aria-hidden="true">
              {cueLabels[state.focus?.kind ?? "inspect"]}
            </span>
          )}
          <strong>{item.value}</strong>
          <small>{item.label}</small>
          {isCurrent(item, state) &&
            state.focus?.kind === "update" &&
            state.focus.before !== undefined &&
            state.focus.after !== undefined &&
            state.focus.before !== state.focus.after && (
              <span
                className="value-change"
                aria-label={`Changed from ${state.focus.before} to ${state.focus.after}`}
              >
                {String(state.focus.before)} → {String(state.focus.after)}
              </span>
            )}
        </div>
      ))}
    </div>
  );
}
function GridVisual({ state }: { state: SimulationState }) {
  const cells = Object.values(state.entities).filter(
    (entity) => entity.kind === "grid",
  );
  const width = Math.max(
    ...cells.map((cell) => Number(cell.metadata?.col) + 1),
  );
  return (
    <div
      className="grid-visual"
      role="grid"
      aria-label="Labyrinth grid"
      style={{ gridTemplateColumns: `repeat(${width}, minmax(30px, 1fr))` }}
    >
      {cells.map((cell) => (
        <div
          role="gridcell"
          key={focusKey(cell, state)}
          className={className(cell, state)}
          aria-label={`Row ${cell.metadata?.row}, column ${cell.metadata?.col}: ${cell.label === "#" ? "wall" : cell.label === "." ? "open" : cell.label}, ${cell.status}${isCurrent(cell, state) ? `, current ${state.focus?.kind}` : ""}`}
        >
          <span>
            {cell.label === "."
              ? cell.status === "path"
                ? "•"
                : ""
              : cell.label === "#"
                ? ""
                : cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}
function GraphVisual({
  state,
  tree,
}: {
  state: SimulationState;
  tree?: boolean;
}) {
  const nodes = Object.values(state.entities).filter((entity) =>
    tree ? entity.kind === "tree-node" : entity.kind === "graph-node",
  );
  const edges = Object.values(state.entities).filter(
    (entity) => entity.kind === "graph-edge",
  );
  const count = nodes.length;
  const positions = new Map(
    nodes.map((node, index) => [
      node.label,
      tree
        ? { x: 85 + (index % 4) * 130, y: 65 + Math.floor(index / 4) * 110 }
        : {
            x:
              300 + Math.cos((index / count) * Math.PI * 2 - Math.PI / 2) * 215,
            y:
              180 + Math.sin((index / count) * Math.PI * 2 - Math.PI / 2) * 125,
          },
    ]),
  );
  const treeEdges = tree
    ? Object.values(state.entities)
        .filter(
          (entity) =>
            entity.kind === "tree-node" &&
            typeof entity.metadata?.parent === "string",
        )
        .map((entity) => ({
          id: entity.id,
          from: entity.metadata!.parent as string,
          to: entity.label,
        }))
    : [];
  return (
    <div className="graph-wrap">
      <svg
        viewBox="0 0 600 360"
        role="img"
        aria-label={
          tree
            ? "Tree nodes and traversal state"
            : "Graph nodes, edges and traversal state"
        }
      >
        {tree
          ? treeEdges.map((edge) => {
              const a = positions.get(edge.from),
                b = positions.get(edge.to);
              return a && b ? (
                <line
                  key={edge.id}
                  className="graph-edge"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              ) : null;
            })
          : edges.map((edge) => {
              const a = positions.get(String(edge.metadata?.from)),
                b = positions.get(String(edge.metadata?.to));
              return a && b ? (
                <line
                  key={edge.id}
                  className="graph-edge"
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              ) : null;
            })}
        {nodes.map((node) => {
          const point = positions.get(node.label)!;
          return (
            <g key={focusKey(node, state)} className={className(node, state)}>
              <circle cx={point.x} cy={point.y} r="25" />
              {isCurrent(node, state) && (
                <text
                  className="graph-cue"
                  x={point.x}
                  y={point.y - 38}
                  textAnchor="middle"
                >
                  {cueLabels[state.focus?.kind ?? "inspect"]}
                </text>
              )}
              <text x={point.x} y={point.y + 5} textAnchor="middle">
                {node.label}
              </text>
              {node.metadata?.distance !== undefined ||
              node.metadata?.depth !== undefined ? (
                <text
                  className="node-meta"
                  x={point.x}
                  y={point.y + 43}
                  textAnchor="middle"
                >
                  {node.metadata.distance !== undefined
                    ? `d=${node.metadata.distance}`
                    : `depth=${node.metadata.depth}`}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {nodes.map((node) => (
          <li key={node.id}>
            {node.label}: {node.status}
            {node.metadata?.distance !== undefined
              ? `, distance ${node.metadata.distance}`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
function DPVisual({ state }: { state: SimulationState }) {
  const cells = Object.values(state.entities).filter(
    (entity) => entity.kind === "dp",
  );
  return (
    <div
      className="dp-visual"
      role="table"
      aria-label="Dynamic programming values"
    >
      <div className="dp-row" role="row">
        {cells.map((cell) => (
          <div key={cell.id} role="columnheader">
            {cell.label}
          </div>
        ))}
      </div>
      <div className="dp-row" role="row">
        {cells.map((cell) => (
          <div
            key={focusKey(cell, state)}
            role="cell"
            className={className(cell, state)}
            aria-label={`dp ${cell.label} equals ${cell.value}${isCurrent(cell, state) ? `, current ${state.focus?.kind}` : ""}`}
          >
            {cell.value}
          </div>
        ))}
      </div>
    </div>
  );
}
export function Visuals({
  kind,
  state,
}: {
  kind: RendererKind;
  state: SimulationState;
}) {
  switch (kind) {
    case "array":
      return <ArrayVisual state={state} />;
    case "grid":
      return <GridVisual state={state} />;
    case "graph":
      return <GraphVisual state={state} />;
    case "tree":
      return <GraphVisual state={state} tree />;
    case "dp":
      return <DPVisual state={state} />;
  }
}
