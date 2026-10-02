"use client";
import { useEffect, useState } from "react";
import type { PythonInterpretation } from "@sim/semantic-interpreter";
import { seekTeachingStep, teachingStepAtPosition } from "@sim/simulation-core";
import { ChoreographyStage } from "./ChoreographyStage";
import { CodeVisual, VariablesVisual } from "./StructureVisuals";

export function PythonPlayer({
  run,
  source,
  output,
}: {
  run: PythonInterpretation;
  source: string;
  output: unknown;
}) {
  const [, redraw] = useState(0);
  const [mode, setMode] = useState<"learning" | "technical">("learning");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeline = run.timeline;
  useEffect(() => {
    const unsubscribe = timeline.subscribe(() => redraw((n) => n + 1));
    return () => {
      unsubscribe();
      timeline.dispose();
    };
  }, [timeline]);
  const learning = teachingStepAtPosition(run.teachingSteps, timeline.position);
  const position = mode === "learning" ? learning : timeline.position;
  const max =
    mode === "learning" ? run.teachingSteps.length - 1 : timeline.length;
  const step = run.teachingSteps[learning];
  const event =
    mode === "learning"
      ? run.events.find((e) => e.eventId === step.primaryEventIds[0])
      : timeline.currentEvent;
  const inference = run.inferences.find(
    (item) => item.eventId === event?.eventId,
  );
  const state = timeline.state;
  function move(value: number) {
    timeline.pause();
    if (mode === "learning")
      seekTeachingStep(timeline, run.teachingSteps, value);
    else timeline.seek(value);
  }
  useEffect(() => {
    if (!playing) return;
    if (position >= max) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(
      () => {
        if (mode === "learning")
          seekTeachingStep(timeline, run.teachingSteps, position + 1);
        else timeline.seek(position + 1);
      },
      (mode === "learning" ? 2600 : 1100) / speed,
    );
    return () => clearTimeout(timer);
  }, [playing, position, max, mode, speed, timeline, run]);
  return (
    <div className="python-playback">
      <section className="panel python-stage" aria-label="Python visualization">
        <div className="python-section-heading">
          <div>
            <div className="eyebrow">OBSERVED EXECUTION</div>
            <h2>Follow your program</h2>
          </div>
          <span className="python-position">
            {mode === "learning" ? "STEP" : "EVENT"} {position} / {max}
          </span>
        </div>
        <div
          className="python-controls"
          role="group"
          aria-label="Playback mode"
        >
          <button
            aria-pressed={mode === "learning"}
            onClick={() => {
              setPlaying(false);
              setMode("learning");
            }}
          >
            Teaching steps
          </button>
          <button
            aria-pressed={mode === "technical"}
            onClick={() => {
              setPlaying(false);
              setMode("technical");
            }}
          >
            Technical events
          </button>
        </div>
        <ChoreographyStage
          timeline={timeline}
          kind={run.renderer}
          state={state}
          step={mode === "learning" ? step : undefined}
          source={source}
          activeLine={event?.sourceRef?.line}
          playing={playing}
        />
        <p className="python-explanation" aria-live="polite">
          {mode === "learning"
            ? step.summary
            : state.annotation || "Step through the recorded execution."}
        </p>
        <div
          className="python-controls"
          role="group"
          aria-label="Playback controls"
        >
          <button
            onClick={() => {
              setPlaying(false);
              move(0);
            }}
            aria-label="Rewind to start"
          >
            ↶
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              move(Math.max(0, position - 1));
            }}
            disabled={position === 0}
          >
            Previous step
          </button>
          <button
            onClick={() => {
              if (position >= max) move(0);
              setPlaying(!playing);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              move(Math.min(max, position + 1));
            }}
            disabled={position >= max}
          >
            Next step
          </button>
          <label>
            Speed{" "}
            <select
              aria-label="Speed"
              value={speed}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSpeed(value);
                timeline.setSpeed(value);
              }}
            >
              {[0.5, 1, 1.5, 2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          type="range"
          aria-label="Python playback position"
          min={0}
          max={max}
          value={position}
          onChange={(e) => {
            setPlaying(false);
            move(Number(e.target.value));
          }}
        />
        <p className="python-result">
          Returned{" "}
          <strong data-testid="python-output">{JSON.stringify(output)}</strong>
        </p>
        <details>
          <summary>How this view was inferred</summary>
          <p>
            {run.renderer === "variables"
              ? "No supported structure was inferred. This view shows observed variables and source lines; inspect the raw trace below."
              : "Structure changes come from runtime observations. Comparisons and relaxations use bounded deterministic patterns; intent is not inferred for arbitrary code."}
          </p>
          {inference && (
            <p>
              {inference.origin} · confidence{" "}
              {Math.round(inference.confidence * 100)}% · raw event{" "}
              {inference.rawIndex + 1}
              <br />
              {inference.reason}
            </p>
          )}
        </details>
      </section>
      <section className="panel python-code-trace">
        <div className="eyebrow">SOURCE THAT PRODUCED THIS TRACE</div>
        <h2>Executed Python</h2>
        <CodeVisual
          source={source}
          activeLine={event?.sourceRef?.line}
          focusKind={state.focus?.kind}
          label="Executed Python"
        />
        <h3>Observed variables</h3>
        <VariablesVisual state={state} />
      </section>
      <section className="panel python-trace">
        <details>
          <summary>
            Teaching step map · {run.teachingSteps.length} steps
          </summary>
          <ol>
            {run.teachingSteps.map((item, index) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setMode("learning");
                    seekTeachingStep(timeline, run.teachingSteps, index);
                  }}
                >
                  {index}. {item.title}
                </button>
              </li>
            ))}
          </ol>
        </details>
        <details>
          <summary>Raw trace · {run.rawTrace.length} events</summary>
          <p>
            Each record captures locals before a line executes, or when a
            function returns. Changes are mapped to the preceding executed line
            when supported.
          </p>
          <ol>
            {run.rawTrace.map((raw, index) => (
              <li key={index}>
                <strong>
                  {index + 1} · line {raw.sourceRef?.line} · {raw.operation}
                </strong>
                <pre>{String(raw.data.changes)}</pre>
              </li>
            ))}
          </ol>
        </details>
      </section>
    </div>
  );
}
