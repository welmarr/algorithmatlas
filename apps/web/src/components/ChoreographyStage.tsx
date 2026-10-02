"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RendererKind, SimulationState, TeachingStep } from "@sim/domain";
import type { SimulationTimeline } from "@sim/simulation-core";
import {
  createChoreography,
  presentationState,
  type ChoreographyPlan,
} from "@sim/visual-choreography";
import { Visuals, DPVisual } from "./Visuals";
import { PresentationContext } from "./PresentationContext";

function Geometry({ state }: { state: SimulationState }) {
  const points = Object.values(state.entities).filter(
    (entity) =>
      typeof entity.metadata?.x === "number" &&
      typeof entity.metadata?.y === "number",
  );
  if (!points.length) return null;
  const xs = points.map((point) => Number(point.metadata!.x)),
    ys = points.map((point) => Number(point.metadata!.y));
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    span = Math.max(1, Math.max(...xs) - minX, Math.max(...ys) - minY);
  const project = (index: number) => ({
    x: 55 + ((xs[index] - minX) / span) * 370,
    y: 310 - ((ys[index] - minY) / span) * 260,
  });
  return (
    <svg
      className="geometry-diagram"
      viewBox="0 0 500 370"
      role="img"
      aria-label="Polygon and directed edge contributions"
    >
      <polygon
        points={points
          .map((_, index) => `${project(index).x},${project(index).y}`)
          .join(" ")}
      />
      {points.map((point, index) => {
        const a = project(index),
          b = project((index + 1) % points.length);
        return (
          <g
            key={point.id}
            className={
              state.activeEntities.includes(point.id) ? "geometry-current" : ""
            }
          >
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <circle cx={a.x} cy={a.y} r="5" />
            <text x={a.x} y={a.y + 23} textAnchor="middle">
              ({xs[index]}, {ys[index]})
            </text>
            {state.activeEntities.includes(point.id) && (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 12}
                textAnchor="middle"
              >
                edge {index + 1} → {((index + 1) % points.length) + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Frame({
  plan,
  timeline,
  state,
  source,
  activeLine,
  playing,
  speed,
}: {
  plan: ChoreographyPlan;
  timeline: SimulationTimeline;
  state: SimulationState;
  source?: string;
  activeLine?: number;
  playing: boolean;
  speed: number;
}) {
  const [reduced, setReduced] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const wasPlaying = useRef(playing);
  const previousSlots = useMemo(
    () =>
      Object.fromEntries(
        Object.values(timeline.stateAt(plan.beforePosition).entities)
          .filter((entity) => entity.metadata?.itemId)
          .map((entity) => [String(entity.metadata!.itemId), entity.label]),
      ),
    [timeline, plan.beforePosition],
  );
  useEffect(() => {
    if (wasPlaying.current && !playing) {
      setReplaying(false);
      setMotionPaused(true);
    }
    if (playing) setMotionPaused(false);
    wasPlaying.current = playing;
  }, [playing]);
  const [phase, setPhase] = useState(playing ? 0 : plan.phases.length - 1);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      if (media.matches) setPhase(plan.phases.length - 1);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [plan]);
  useEffect(() => {
    if (reduced || (!playing && !replaying) || phase >= plan.phases.length - 1)
      return;
    const timer = setTimeout(
      () => setPhase((index) => index + 1),
      plan.phases[phase].durationMs / speed,
    );
    return () => clearTimeout(timer);
  }, [plan, phase, playing, replaying, reduced, speed]);
  const frame = plan.phases[phase];
  const projected = presentationState(
    frame.state === "before" ? timeline.stateAt(plan.beforePosition) : state,
    plan,
  );
  const actions = plan.reducedMotion.actions;
  const labels = actions.filter((action) => action.type === "FOCUS");
  return (
    <div
      className={`choreography-stage strategy-${plan.strategy}`}
      data-phase={frame.purpose}
      data-position={
        frame.state === "before" ? plan.beforePosition : plan.afterPosition
      }
    >
      <div className="reasoning-toolbar">
        <span className="eyebrow">
          {plan.strategy.replaceAll("-", " ").toUpperCase()} ·{" "}
          {frame.purpose.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={() => {
            setPhase(reduced ? plan.phases.length - 1 : 0);
            setReplaying(true);
            setMotionPaused(false);
          }}
        >
          Animate reasoning
        </button>
        {replaying && phase < plan.phases.length - 1 && (
          <button
            type="button"
            onClick={() => {
              setReplaying(false);
              setMotionPaused(true);
            }}
          >
            Pause reasoning
          </button>
        )}
      </div>
      <div
        className="reasoning-phases"
        role="group"
        aria-label="Reasoning phases"
      >
        {plan.phases.map((item, index) => (
          <button
            key={item.purpose}
            type="button"
            aria-pressed={index === phase}
            onClick={() => {
              setReplaying(false);
              setMotionPaused(false);
              setPhase(index);
            }}
          >
            {item.purpose}
          </button>
        ))}
      </div>
      <div className="reasoning-facts" aria-live="polite">
        {actions.map((action, index) =>
          action.type === "SHOW_EQUATION" ? (
            <div className="reasoning-equation" key={index}>
              {action.text}
            </div>
          ) : action.type === "SHOW_REASON" ? (
            <p key={index}>{action.text}</p>
          ) : null,
        )}
      </div>
      {actions.map((action, index) => {
        if (action.type === "SHOW_RANGE") {
          const r = action.range,
            min = r.previousLow ?? r.low,
            max = r.previousHigh ?? r.high,
            span = Math.max(1, max - min);
          return (
            <div className="reasoning-range" key={index}>
              <strong>
                {r.label}: {r.low} … {r.high}
                {r.mid !== undefined ? ` · midpoint ${r.mid}` : ""}
              </strong>
              <div className="range-track">
                <span
                  style={{
                    left: `${((r.low - min) / span) * 100}%`,
                    width: `${((r.high - r.low) / span) * 100}%`,
                  }}
                />
                {r.mid !== undefined && (
                  <b style={{ left: `${((r.mid - min) / span) * 100}%` }}>▼</b>
                )}
              </div>
              {r.previousLow !== undefined && (
                <small>
                  Discarded outside [{r.low}, {r.high}] from [{r.previousLow},{" "}
                  {r.previousHigh}].
                </small>
              )}
            </div>
          );
        }
        if (action.type === "SHOW_ALIGNMENT")
          return (
            <div
              className="string-alignment"
              key={index}
              aria-label="Text and pattern alignment"
            >
              <pre>
                {action.alignment.text}
                {"\n"}
                {" ".repeat(Math.max(0, action.alignment.offset))}
                {action.alignment.pattern}
              </pre>
              <small>
                Matched prefix: {action.alignment.matched}; pattern starts at
                offset {action.alignment.offset}.
              </small>
            </div>
          );
        if (action.type === "SHOW_FRONTIER")
          return (
            <div className="reasoning-frontier" key={index}>
              <strong>
                {action.collection === "stack"
                  ? "Stack · next at right"
                  : action.collection === "heap"
                    ? "Priority queue · minimum first"
                    : "Queue · next at left"}
              </strong>
              <span>
                {action.items
                  .map(
                    (id) =>
                      `${state.entities[id]?.kind === "grid" ? id.replace("grid:", "cell ").replace(":", ",") : (state.entities[id]?.label ?? id)}${state.entities[id]?.value !== undefined ? ` (${state.entities[id].value})` : ""}`,
                  )
                  .join(" → ") || "empty"}
              </span>
            </div>
          );
        return null;
      })}
      <PresentationContext.Provider
        value={{
          labels,
          durationMs: 550 / speed,
          animate: !reduced && !motionPaused && frame.state === "after",
          previousSlots,
        }}
      >
        {plan.strategy === "geometry" && <Geometry state={projected} />}
        <Visuals
          kind={plan.renderer}
          state={projected}
          source={source}
          activeLine={activeLine}
        />
        {plan.renderer === "array" &&
          Object.values(projected.entities).some(
            (entity) => entity.kind === "dp",
          ) && (
            <div className="auxiliary-structure">
              <h3>
                {plan.strategy === "fenwick"
                  ? "Fenwick tree · covered prefixes"
                  : "Prefix table"}
              </h3>
              <DPVisual state={projected} />
            </div>
          )}
      </PresentationContext.Provider>
      <div className="reasoning-legend">
        {[...new Set(labels.map((label) => label.role))].map((role) => (
          <span key={role} className={`legend-role-${role}`}>
            {
              {
                current: "◎ Current",
                comparison: "◎ Comparison",
                changed: "Δ Changed",
                dependency: "↳ Dependency",
                accepted: "✓ Accepted",
                rejected: "× Rejected",
                path: "✓ Path",
              }[role]
            }
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChoreographyStage({
  timeline,
  kind,
  tags = [],
  step,
  ...rest
}: {
  timeline: SimulationTimeline;
  kind: RendererKind;
  tags?: readonly string[];
  step?: TeachingStep;
  state: SimulationState;
  source?: string;
  activeLine?: number;
  playing?: boolean;
}) {
  const position = timeline.position;
  const plan = useMemo(
    () => createChoreography(timeline, kind, tags, step),
    [timeline, kind, tags, step, position],
  );
  // Replacing the selected frame unmounts its timers and Web Animations.
  const key = JSON.stringify([
    plan.teachingStepId,
    plan.reducedMotion,
    timeline.initialState,
  ]);
  return (
    <Frame
      key={key}
      plan={plan}
      timeline={timeline}
      {...rest}
      playing={rest.playing ?? false}
      speed={timeline.speed}
    />
  );
}
