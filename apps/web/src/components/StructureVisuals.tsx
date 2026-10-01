"use client";
import type { SimulationState, StepFocusKind } from "@sim/domain";

export type CollectionKind = "queue" | "stack" | "heap";

function itemLabel(state: SimulationState, id: string): string {
  const item = state.entities[id];
  if (!item) return id;
  return item.value === undefined ? item.label : `${item.label}: ${item.value}`;
}

export function CollectionVisual({
  state,
  kind,
}: {
  state: SimulationState;
  kind: CollectionKind;
}) {
  const values = state.collections[kind] ?? [];
  const ordered = kind === "stack" ? [...values].reverse() : values;
  const title =
    kind === "heap" ? "Priority queue" : kind === "queue" ? "Queue" : "Stack";
  return (
    <section className={`collection-visual ${kind}-visual`} aria-label={title}>
      <div className="collection-labels" aria-hidden="true">
        <span>
          {kind === "queue" ? "FRONT" : kind === "stack" ? "TOP" : "MINIMUM"}
        </span>
        <span>
          {kind === "queue"
            ? "BACK"
            : kind === "stack"
              ? "BOTTOM"
              : "LOWER PRIORITY →"}
        </span>
      </div>
      {values.length ? (
        <ol role="list" aria-label={`${title} items`}>
          {ordered.map((id, index) => (
            <li
              key={`${id}:${index}`}
              role="listitem"
              className={state.activeEntities.includes(id) ? "is-active" : ""}
              aria-label={`${itemLabel(state, id)}${index === 0 ? (kind === "stack" ? ", top" : kind === "heap" ? ", minimum" : ", front") : ""}`}
            >
              <span className="collection-position">
                {kind === "heap" ? index + 1 : index}
              </span>
              <strong>{itemLabel(state, id)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Empty {title.toLowerCase()}</p>
      )}
    </section>
  );
}

export function VariablesVisual({ state }: { state: SimulationState }) {
  const variables = Object.entries(state.variables);
  return variables.length ? (
    <dl className="variables-visual" aria-label="Variables">
      {variables.map(([key, value]) => (
        <div
          key={key}
          className={
            state.focus?.variable === key &&
            state.focus.before !== state.focus.after
              ? "variable-row is-changing"
              : "variable-row"
          }
        >
          <dt>{key}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className="muted">No variables yet.</p>
  );
}

export function CodeVisual({
  source,
  activeLine,
  focusKind,
  label = "Code",
}: {
  source: string;
  activeLine?: number;
  focusKind?: StepFocusKind;
  label?: string;
}) {
  return (
    <div className="code-lines" role="list" aria-label={label}>
      {source.split("\n").map((line, index) => (
        <div
          role="listitem"
          key={index}
          className={
            activeLine === index + 1
              ? `code-line active cue-${focusKind ?? "inspect"}`
              : "code-line"
          }
        >
          <span>{index + 1}</span>
          <code>{line || " "}</code>
        </div>
      ))}
    </div>
  );
}
