"use client";
import { BUILT_IN_RENDERER_KINDS } from "@sim/domain";
import type {
  BuiltInRendererKind,
  RendererKind,
  SimulationState,
  StepFocusKind,
  VisualEntity,
} from "@sim/domain";
import {
  RendererRegistry,
  rendererStateIssues,
  type RendererDescriptor,
} from "@sim/renderer-sdk";
import type { ComponentType } from "react";
import { layoutDp, layoutTree } from "./renderer-layout";
import {
  CodeVisual,
  CollectionVisual,
  VariablesVisual,
} from "./StructureVisuals";

const cueLabels: Record<StepFocusKind, string> = {
  inspect: "READ",
  update: "CHANGE",
  explore: "EXPLORE",
  result: "RESULT",
};

export const rendererLegends: Record<
  BuiltInRendererKind,
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
    { label: "Relaxing edge", cue: "update" },
    { label: "Predecessor link", cue: "inspect" },
    { label: "Shortest path", cue: "path" },
  ],
  tree: [
    { label: "Current node", cue: "active" },
    { label: "Visited", cue: "visited" },
    { label: "Diameter path", cue: "path" },
  ],
  dp: [
    { label: "Current cell", cue: "active" },
    { label: "Dependency", cue: "inspect" },
    { label: "Updated value", cue: "update" },
  ],
  queue: [{ label: "Current item", cue: "active" }],
  stack: [{ label: "Current item", cue: "active" }],
  heap: [{ label: "Minimum priority", cue: "active" }],
  variables: [{ label: "Changed variable", cue: "update" }],
  code: [{ label: "Current line", cue: "inspect" }],
};

type VisualRenderer = ComponentType<{
  state: SimulationState;
  source?: string;
  activeLine?: number;
}>;
const contributorRenderers = new RendererRegistry<VisualRenderer>();

/** Registration is for explicitly reviewed local code; no module is loaded from a pack manifest. */
export function registerVisualRenderer(
  descriptor: RendererDescriptor,
  component: VisualRenderer,
): void {
  if (BUILT_IN_RENDERER_KINDS.includes(descriptor.id as BuiltInRendererKind))
    throw new Error(`Cannot replace built-in renderer ${descriptor.id}`);
  contributorRenderers.register(descriptor, component);
}

export function getRendererLegend(
  id: RendererKind,
): { label: string; cue: string }[] {
  if (BUILT_IN_RENDERER_KINDS.includes(id as BuiltInRendererKind))
    return rendererLegends[id as BuiltInRendererKind];
  return (
    contributorRenderers.get(id)?.descriptor.legend.map((item) => ({
      label: `${item.label} · ${item.textCue}`,
      cue: item.cue,
    })) ?? []
  );
}

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
    1,
    ...cells.map((cell) => Number(cell.metadata?.col) + 1),
  );
  return (
    <div
      className="grid-visual"
      role="grid"
      aria-label="Grid cells"
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
export function GraphVisual({
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
  const treeLayout = tree ? layoutTree(nodes) : undefined;
  const count = nodes.length;
  const positions =
    treeLayout?.positions ??
    new Map(
      nodes.map((node, index) => [
        node.label,
        {
          x:
            300 +
            Math.cos((index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2) *
              215,
          y:
            180 +
            Math.sin((index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2) *
              125,
        },
      ]),
    );
  const treeEdges = treeLayout?.edges ?? [];
  return (
    <div className="graph-wrap">
      <svg
        viewBox={`0 0 ${treeLayout?.width ?? 600} ${treeLayout?.height ?? 360}`}
        role="img"
        aria-label={
          tree
            ? "Tree nodes and traversal state"
            : "Graph nodes, edges and traversal state"
        }
      >
        <defs>
          <marker
            id="graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="graph-arrow" />
          </marker>
        </defs>
        {tree
          ? treeEdges.map((edge) => {
              const a = positions.get(edge.from),
                b = positions.get(edge.to);
              return a && b ? (
                <line
                  key={`${edge.from}:${edge.to}`}
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
              const directed = edge.metadata?.directed === true;
              const weight = edge.metadata?.weight;
              const dx = a && b ? b.x - a.x : 0;
              const dy = a && b ? b.y - a.y : 0;
              const distance = Math.hypot(dx, dy) || 1;
              return a && b ? (
                <g key={edge.id}>
                  <line
                    className={`graph-edge status-${edge.status}${isCurrent(edge, state) ? " is-active" : ""}`}
                    x1={a.x}
                    y1={a.y}
                    x2={directed ? b.x - (dx / distance) * 29 : b.x}
                    y2={directed ? b.y - (dy / distance) * 29 : b.y}
                    markerEnd={directed ? "url(#graph-arrow)" : undefined}
                  />
                  {typeof weight === "number" && (
                    <text
                      className="graph-weight"
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 8}
                      textAnchor="middle"
                    >
                      {weight}
                    </text>
                  )}
                </g>
              ) : null;
            })}
        {!tree &&
          nodes.map((node) => {
            const parent = node.metadata?.parent;
            const a =
              typeof parent === "string" ? positions.get(parent) : undefined;
            const b = positions.get(node.label);
            return a && b ? (
              <line
                key={`parent:${node.id}`}
                className="parent-link"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            ) : null;
          })}
        {nodes.map((node) => {
          const point = positions.get(node.label)!;
          const details = [
            node.metadata?.distance !== undefined
              ? `d=${node.metadata.distance}`
              : undefined,
            node.metadata?.depth !== undefined
              ? `depth=${node.metadata.depth}`
              : undefined,
            node.metadata?.subtreeSize !== undefined
              ? `below=${node.metadata.subtreeSize}`
              : undefined,
            node.metadata?.parent !== undefined
              ? `p=${node.metadata.parent}`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ");
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
              {details ? (
                <text
                  className="node-meta"
                  x={point.x}
                  y={point.y + 43}
                  textAnchor="middle"
                >
                  {details}
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
            {node.metadata?.parent !== undefined
              ? `, parent ${node.metadata.parent}`
              : ""}
          </li>
        ))}
        {!tree &&
          edges.map((edge) => (
            <li key={edge.id}>
              {edge.metadata?.from} {edge.metadata?.directed ? "to" : "and"}{" "}
              {edge.metadata?.to}
              {edge.metadata?.weight !== undefined
                ? `, weight ${edge.metadata.weight}`
                : ""}
              {`, ${edge.status}`}
            </li>
          ))}
      </ul>
    </div>
  );
}
function DpCell({
  cell,
  state,
  row,
  col,
}: {
  cell?: VisualEntity;
  state: SimulationState;
  row: number;
  col: number;
}) {
  if (!cell)
    return (
      <div role="cell" aria-label={`dp row ${row}, column ${col}: empty`}>
        —
      </div>
    );
  const focusIndex = state.activeEntities.indexOf(cell.id);
  const dependency = focusIndex > 0;
  return (
    <div
      key={focusKey(cell, state)}
      role="cell"
      className={`${className(cell, state)}${dependency ? " is-dependency" : ""}`}
      aria-label={`dp row ${row}, column ${col} equals ${cell.value}${dependency ? ", dependency" : focusIndex === 0 ? ", current target" : ""}`}
    >
      {cell.value}
      {dependency && <small aria-hidden="true">USED</small>}
      {focusIndex === 0 && state.focus?.kind === "update" && (
        <small aria-hidden="true">UPDATE</small>
      )}
    </div>
  );
}

export function DPVisual({ state }: { state: SimulationState }) {
  const cells = Object.values(state.entities).filter(
    (entity) => entity.kind === "dp",
  );
  const layout = layoutDp(cells);
  return (
    <div
      className="dp-visual"
      role="table"
      aria-label="Dynamic programming values"
    >
      <div className="dp-row" role="row">
        {layout.twoDimensional && (
          <div role="columnheader" aria-label="Row and column labels" />
        )}
        {Array.from({ length: layout.columnCount }, (_, col) => (
          <div key={col} role="columnheader">
            {layout.twoDimensional ? col : (layout.rows[0][col]?.label ?? col)}
          </div>
        ))}
      </div>
      {layout.rows.map((row, rowIndex) => (
        <div className="dp-row" role="row" key={rowIndex}>
          {layout.twoDimensional && <div role="rowheader">{rowIndex}</div>}
          {row.map((cell, col) => (
            <DpCell
              key={cell?.id ?? `empty:${rowIndex}:${col}`}
              cell={cell}
              state={state}
              row={rowIndex}
              col={col}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
export function Visuals({
  kind,
  state,
  source = "",
  activeLine,
}: {
  kind: RendererKind;
  state: SimulationState;
  source?: string;
  activeLine?: number;
}) {
  const contributor = contributorRenderers.get(kind);
  if (contributor) {
    const issues = rendererStateIssues(contributor.descriptor, state);
    if (issues.length)
      return (
        <p role="alert">
          Renderer {kind} cannot display this state: {issues.join("; ")}.
        </p>
      );
    const Component = contributor.render;
    return (
      <div
        role={contributor.descriptor.accessibility.role}
        aria-label={contributor.descriptor.accessibility.label}
      >
        <Component state={state} source={source} activeLine={activeLine} />
      </div>
    );
  }
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
    case "queue":
    case "stack":
    case "heap":
      return (
        <CollectionVisual
          state={state}
          kind={kind as "queue" | "stack" | "heap"}
        />
      );
    case "variables":
      return <VariablesVisual state={state} />;
    case "code":
      return (
        <CodeVisual
          source={source}
          activeLine={activeLine}
          focusKind={state.focus?.kind}
        />
      );
    default:
      return <p role="alert">Renderer {kind} is not registered.</p>;
  }
}
