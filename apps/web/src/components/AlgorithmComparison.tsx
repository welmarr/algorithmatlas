"use client";

import { useEffect, useState } from "react";
import type { SimulationState } from "@sim/domain";
import {
  comparisonDefinitions,
  comparisonMetrics,
  runComparison,
  type ComparisonId,
  type ComparisonResult,
} from "../lib/algorithm-comparison";
import type { LabRun } from "../lib/algorithm-lab";
import { Visuals } from "./Visuals";
import {
  CodeVisual,
  CollectionVisual,
  VariablesVisual,
} from "./StructureVisuals";

const defaultPair: ComparisonId = "graph-search";
const defaultInput = () =>
  JSON.stringify(comparisonDefinitions[defaultPair].input, null, 2);

function ComparisonPane({
  run,
  title,
  structure,
  correct,
  synchronized,
}: {
  run: LabRun;
  title: string;
  structure: "graph" | "grid" | "tree";
  correct: boolean;
  synchronized: boolean;
}) {
  const timeline = run.timeline;
  const state: SimulationState = timeline.state;
  const position = timeline.position;
  const current = timeline.currentEvent;
  const total = comparisonMetrics(run.events);
  const now = comparisonMetrics(run.events.slice(0, position));
  const collection =
    run.info.id.endsWith("dfs") || run.info.id === "tree-preorder"
      ? "stack"
      : "queue";
  return (
    <section className="comparison-pane" aria-label={`${title} simulation`}>
      <header className="comparison-pane-heading">
        <div>
          <span className="eyebrow">{title.toUpperCase()}</span>
          <h2>{run.info.title}</h2>
          <p>{run.info.description}</p>
        </div>
        <span className="comparison-position" aria-live="polite">
          {position} / {timeline.length} events
        </span>
      </header>
      <div className="comparison-playback">
        <button
          type="button"
          aria-label={`${title} previous event`}
          onClick={() => timeline.previous()}
          disabled={position === 0}
        >
          Previous
        </button>
        <button
          type="button"
          aria-label={`${title} ${timeline.playing ? "pause" : "play"}`}
          onClick={() =>
            timeline.playing
              ? timeline.pause()
              : position === timeline.length
                ? (timeline.rewind(), timeline.play())
                : timeline.play()
          }
          disabled={synchronized}
        >
          {timeline.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          aria-label={`${title} next event`}
          onClick={() => timeline.next()}
          disabled={position === timeline.length}
        >
          Next
        </button>
        <button type="button" onClick={() => timeline.rewind()}>
          Reset
        </button>
      </div>
      <label className="comparison-seek">
        Seek {title} independently
        <input
          type="range"
          min={0}
          max={timeline.length}
          value={position}
          onChange={(event) => timeline.seek(Number(event.target.value))}
          aria-label={`${title} event position`}
        />
      </label>
      <div className="comparison-event" aria-live="polite">
        <span>{current?.type.replaceAll("_", " ") ?? "READY"}</span>
        <p>
          {current?.explanation ?? "Run or seek to inspect the first event."}
        </p>
      </div>
      <div className="comparison-visual" aria-label={`${title} visualization`}>
        <Visuals kind={structure} state={state} />
      </div>
      <div className="comparison-counters">
        <div>
          <strong>
            {now.events} / {total.events}
          </strong>
          <span>semantic events</span>
        </div>
        <div>
          <strong>
            {now.visited} / {total.visited}
          </strong>
          <span>unique visited</span>
        </div>
        <div>
          <strong>
            {now.discovered} / {total.discovered}
          </strong>
          <span>unique discovered</span>
        </div>
        <div>
          <strong>
            {now.collectionOperations} / {total.collectionOperations}
          </strong>
          <span>collection operations</span>
        </div>
      </div>
      <div className="comparison-inspectors">
        <div>
          <h3>{collection === "stack" ? "Stack" : "Queue"}</h3>
          <CollectionVisual state={state} kind={collection} />
        </div>
        <div>
          <h3>Variables</h3>
          <VariablesVisual state={state} />
        </div>
      </div>
      <div className="comparison-answer">
        <span>RESULT</span>
        <strong>{run.output}</strong>
        <small>
          {correct
            ? "Verified for this input"
            : "Result failed independent check"}
        </small>
      </div>
      <p className="comparison-complexity">{run.info.complexity}</p>
      <details className="comparison-details">
        <summary>Event counts by operation</summary>
        <dl>
          {Object.entries(total.byType)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, count]) => (
              <div key={type}>
                <dt>{type.replaceAll("_", " ")}</dt>
                <dd>{count}</dd>
              </div>
            ))}
        </dl>
      </details>
      <details className="comparison-details">
        <summary>Algorithm outline</summary>
        <CodeVisual
          source={run.info.source}
          activeLine={current?.sourceRef?.line}
          focusKind={state.focus?.kind}
          label={`${title} algorithm outline`}
        />
      </details>
      <details className="comparison-details">
        <summary>Exact event log</summary>
        <ol>
          {run.events.map((event) => (
            <li key={event.eventId}>
              <button
                type="button"
                className={position === event.step ? "current" : ""}
                onClick={() => timeline.seek(event.step)}
              >
                {event.step}. {event.type.replaceAll("_", " ")} —{" "}
                {event.explanation}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

export function AlgorithmComparison() {
  const [pair, setPair] = useState<ComparisonId>(defaultPair);
  const [input, setInput] = useState(defaultInput);
  const [comparison, setComparison] = useState<ComparisonResult>(() =>
    runComparison(defaultPair, comparisonDefinitions[defaultPair].input),
  );
  const [error, setError] = useState("");
  const [synchronized, setSynchronized] = useState(true);
  const [syncPlaying, setSyncPlaying] = useState(false);
  const [, redraw] = useState(0);

  function stop() {
    setSyncPlaying(false);
    comparison.left.timeline.pause();
    comparison.right.timeline.pause();
  }
  function selectPair(id: ComparisonId) {
    stop();
    setPair(id);
    setInput(JSON.stringify(comparisonDefinitions[id].input, null, 2));
    setComparison(runComparison(id, comparisonDefinitions[id].input));
    setError("");
  }
  function execute() {
    try {
      const parsed = JSON.parse(input) as unknown;
      const next = runComparison(pair, parsed);
      stop();
      setComparison(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid shared input");
    }
  }
  useEffect(() => {
    const left = comparison.left.timeline;
    const right = comparison.right.timeline;
    const refresh = () => redraw((value) => value + 1);
    const unsubscribeLeft = left.subscribe(refresh);
    const unsubscribeRight = right.subscribe(refresh);
    return () => {
      unsubscribeLeft();
      unsubscribeRight();
      left.dispose();
      right.dispose();
    };
  }, [comparison]);
  useEffect(() => {
    if (!syncPlaying) return;
    const left = comparison.left.timeline;
    const right = comparison.right.timeline;
    if (left.position === left.length && right.position === right.length) {
      const timer = setTimeout(() => setSyncPlaying(false), 0);
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => {
      if (left.position < left.length) left.next();
      if (right.position < right.length) right.next();
      if (left.position === left.length && right.position === right.length)
        setSyncPlaying(false);
    }, 650);
    return () => clearInterval(timer);
  }, [comparison, syncPlaying]);
  const definition = comparisonDefinitions[pair];
  return (
    <div className="comparison-shell">
      <section className="comparison-setup" aria-label="Comparison setup">
        <div>
          <h2>Choose a comparison</h2>
          <p>
            Both algorithms receive the same validated input. Edit it and run
            again to see how the traces change.
          </p>
        </div>
        <div
          className="comparison-pairs"
          role="group"
          aria-label="Comparison examples"
        >
          {Object.values(comparisonDefinitions).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={pair === option.id}
              onClick={() => selectPair(option.id)}
            >
              {option.title}
            </button>
          ))}
        </div>
        <label className="comparison-input">
          Shared input JSON
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={6}
            spellCheck={false}
          />
        </label>
        <div className="comparison-setup-actions">
          <button type="button" onClick={execute}>
            Run both algorithms
          </button>
          <button
            type="button"
            onClick={() => setInput(JSON.stringify(definition.input, null, 2))}
          >
            Restore example input
          </button>
        </div>
        {error && (
          <p className="comparison-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="comparison-summary" aria-label="Comparison result">
        <div>
          <span className="eyebrow">SAME INPUT · TWO TRACES</span>
          <h2>{definition.question}</h2>
          <p>{comparison.conclusion}</p>
          <p className="comparison-note">
            Counts describe semantic events on this input. They are not browser
            timing or a proof of runtime superiority.
          </p>
        </div>
        <div className="comparison-sync">
          <label>
            <input
              type="checkbox"
              checked={synchronized}
              onChange={(event) => {
                stop();
                setSynchronized(event.target.checked);
              }}
            />
            Synchronized event playback
          </label>
          {synchronized && (
            <button
              type="button"
              aria-label={syncPlaying ? "Pause both" : "Play both"}
              onClick={() => {
                if (syncPlaying) {
                  setSyncPlaying(false);
                  return;
                }
                if (
                  comparison.left.timeline.position ===
                    comparison.left.timeline.length &&
                  comparison.right.timeline.position ===
                    comparison.right.timeline.length
                ) {
                  comparison.left.timeline.rewind();
                  comparison.right.timeline.rewind();
                }
                setSyncPlaying(true);
              }}
            >
              {syncPlaying ? "Pause both" : "Play both"}
            </button>
          )}
        </div>
      </section>
      <div className="comparison-columns">
        <ComparisonPane
          run={comparison.left}
          title="Left"
          structure={definition.structure as "graph" | "grid" | "tree"}
          correct={comparison.correctness[0]}
          synchronized={synchronized}
        />
        <ComparisonPane
          run={comparison.right}
          title="Right"
          structure={definition.structure as "graph" | "grid" | "tree"}
          correct={comparison.correctness[1]}
          synchronized={synchronized}
        />
      </div>
    </div>
  );
}
