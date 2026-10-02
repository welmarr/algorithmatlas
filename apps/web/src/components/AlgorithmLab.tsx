"use client";

import { useEffect, useState } from "react";
import type { SimulationState } from "@sim/domain";
import { seekTeachingStep, teachingStepAtPosition } from "@sim/simulation-core";
import {
  labAlgorithms,
  runLab,
  type LabAlgorithm,
  type LabInput,
  type LabRun,
  type LabStructure,
} from "../lib/algorithm-lab";
import { rendererLegends } from "./Visuals";
import { ChoreographyStage } from "./ChoreographyStage";
import {
  CodeVisual,
  CollectionVisual,
  VariablesVisual,
} from "./StructureVisuals";

const initialArray = [8, 2, 5, 1, 7];
const initialGrid = ["A...", ".##.", "...B", "...."];
const initialNodes = ["A", "B", "C", "D", "E"];
const initialEdges: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["C", "E"],
  ["D", "E"],
];
const initialParents = [1, 1, 2, 2, 3];
const structureLabels: Record<LabStructure, string> = {
  array: "Array",
  grid: "Grid",
  graph: "Graph",
  tree: "Tree",
};

export function AlgorithmLab() {
  const [structure, setStructure] = useState<LabStructure>("array");
  const [algorithm, setAlgorithm] = useState<LabAlgorithm>("insertion-sort");
  const [values, setValues] = useState(initialArray);
  const [target, setTarget] = useState(5);
  const [rows, setRows] = useState(initialGrid);
  const [gridTool, setGridTool] = useState<"wall" | "start" | "goal">("wall");
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [start, setStart] = useState("A");
  const [goal, setGoal] = useState("E");
  const [edgeFrom, setEdgeFrom] = useState("A");
  const [edgeTo, setEdgeTo] = useState("B");
  const [parents, setParents] = useState(initialParents);
  const [mode, setMode] = useState<"learning" | "technical">("learning");
  const [learningPlaying, setLearningPlaying] = useState(false);
  const [run, setRun] = useState<LabRun>(() =>
    runLab("array", "insertion-sort", { values: initialArray, target: 5 }),
  );
  const [error, setError] = useState("");
  const [, redraw] = useState(0);

  const inputFor = (kind: LabStructure): LabInput =>
    kind === "array"
      ? { values, target }
      : kind === "grid"
        ? { rows }
        : kind === "graph"
          ? { nodes, edges, start, goal }
          : { parents };
  function execute(kind = structure, choice = algorithm) {
    try {
      const next = runLab(kind, choice, inputFor(kind));
      setRun(next);
      setMode("learning");
      setLearningPlaying(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid input");
    }
  }
  function chooseStructure(kind: LabStructure) {
    const choice = labAlgorithms[kind][0].id;
    setStructure(kind);
    setAlgorithm(choice);
    execute(kind, choice);
  }
  function chooseAlgorithm(choice: LabAlgorithm) {
    setAlgorithm(choice);
    execute(structure, choice);
  }
  useEffect(() => {
    const unsubscribe = run.timeline.subscribe(() => redraw((n) => n + 1));
    return () => {
      unsubscribe();
      run.timeline.dispose();
    };
  }, [run]);
  const timeline = run.timeline;
  const learningPosition = teachingStepAtPosition(
    run.teachingSteps,
    timeline.position,
  );
  const lesson = run.teachingSteps[learningPosition];
  const event =
    mode === "learning"
      ? run.events.find((item) => item.eventId === lesson.primaryEventIds[0])
      : timeline.currentEvent;
  const state: SimulationState = timeline.state;
  if (mode === "learning") {
    state.annotation = lesson.summary;
    state.activeEntities = lesson.cue?.entityId ? [lesson.cue.entityId] : [];
    state.focus = lesson.cue
      ? {
          eventId: lesson.primaryEventIds[0] ?? lesson.id,
          kind: lesson.cue.kind,
          before: lesson.cue.before,
          after: lesson.cue.after,
        }
      : null;
  }
  const length =
    mode === "learning" ? run.teachingSteps.length - 1 : timeline.length;
  const position = mode === "learning" ? learningPosition : timeline.position;
  const playing = mode === "learning" ? learningPlaying : timeline.playing;
  const seek = (value: number) =>
    mode === "learning"
      ? seekTeachingStep(timeline, run.teachingSteps, value)
      : timeline.seek(value);
  const pause = () => {
    setLearningPlaying(false);
    timeline.pause();
  };
  const togglePlay = () => {
    if (playing) pause();
    else if (mode === "learning") {
      if (position >= length) seek(0);
      setLearningPlaying(true);
    } else {
      if (position >= length) timeline.rewind();
      timeline.play();
    }
  };
  useEffect(() => {
    if (!learningPlaying) return;
    if (learningPosition >= run.teachingSteps.length - 1) {
      setLearningPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      const next =
        teachingStepAtPosition(run.teachingSteps, timeline.position) + 1;
      if (next >= run.teachingSteps.length) setLearningPlaying(false);
      else seekTeachingStep(timeline, run.teachingSteps, next);
    }, 2600 / timeline.speed);
    return () => clearInterval(timer);
  }, [learningPlaying, learningPosition, run, timeline]);

  function editGrid(r: number, c: number) {
    const copy = rows.map((row) => [...row]);
    const current = copy[r][c];
    if (gridTool === "wall") {
      if (current === "A" || current === "B") return;
      copy[r][c] = current === "#" ? "." : "#";
    } else {
      const marker = gridTool === "start" ? "A" : "B";
      if (current === (marker === "A" ? "B" : "A")) return;
      for (const row of copy)
        for (let i = 0; i < row.length; i++)
          if (row[i] === marker) row[i] = ".";
      copy[r][c] = marker;
    }
    setRows(copy.map((row) => row.join("")));
  }
  function resizeGrid(height: number, width: number) {
    const h = Math.max(2, Math.min(8, height)),
      w = Math.max(2, Math.min(8, width));
    const next = Array.from({ length: h }, () => ".".repeat(w));
    next[0] = "A" + next[0].slice(1);
    next[h - 1] = next[h - 1].slice(0, w - 1) + "B";
    setRows(next);
  }
  function addNode() {
    if (nodes.length >= 10) return;
    const id = [..."ABCDEFGHIJ"].find(
      (candidate) => !nodes.includes(candidate),
    );
    if (id) setNodes([...nodes, id]);
  }
  function removeNode(id: string) {
    if (nodes.length <= 2) return;
    const remaining = nodes.filter((node) => node !== id);
    setNodes(remaining);
    setEdges(edges.filter(([a, b]) => a !== id && b !== id));
    if (start === id) setStart(remaining[0]);
    if (goal === id) setGoal(remaining.at(-1)!);
    if (edgeFrom === id) setEdgeFrom(remaining[0]);
    if (edgeTo === id) setEdgeTo(remaining.at(-1)!);
  }
  function connect() {
    if (
      edgeFrom !== edgeTo &&
      !edges.some(
        ([a, b]) =>
          (a === edgeFrom && b === edgeTo) || (a === edgeTo && b === edgeFrom),
      ) &&
      edges.length < 24
    )
      setEdges([...edges, [edgeFrom, edgeTo]]);
  }
  function restoreExample() {
    const example: LabInput =
      structure === "array"
        ? { values: [...initialArray], target: 5 }
        : structure === "grid"
          ? { rows: [...initialGrid] }
          : structure === "graph"
            ? {
                nodes: [...initialNodes],
                edges: initialEdges.map(([a, b]) => [a, b]),
                start: "A",
                goal: "E",
              }
            : { parents: [...initialParents] };
    if (structure === "array") {
      setValues([...initialArray]);
      setTarget(5);
    } else if (structure === "grid") setRows([...initialGrid]);
    else if (structure === "graph") {
      setNodes([...initialNodes]);
      setEdges(initialEdges.map(([a, b]) => [a, b]));
      setStart("A");
      setGoal("E");
      setEdgeFrom("A");
      setEdgeTo("B");
    } else setParents([...initialParents]);
    setRun(runLab(structure, algorithm, example));
    setMode("learning");
    setLearningPlaying(false);
    setError("");
  }

  return (
    <div className="lab-shell">
      <section className="lab-control-panel" aria-label="Lab setup">
        <h2>1. Choose a structure</h2>
        <div className="lab-choice-grid" role="group" aria-label="Structure">
          {(Object.keys(structureLabels) as LabStructure[]).map((kind) => (
            <button
              type="button"
              key={kind}
              className={structure === kind ? "selected" : ""}
              aria-pressed={structure === kind}
              onClick={() => chooseStructure(kind)}
            >
              {structureLabels[kind]}
            </button>
          ))}
        </div>
        <h2>2. Choose an algorithm</h2>
        <div
          className="lab-choice-grid algorithms"
          role="group"
          aria-label="Algorithm"
        >
          {labAlgorithms[structure].map((info) => (
            <button
              type="button"
              key={info.id}
              className={algorithm === info.id ? "selected" : ""}
              aria-pressed={algorithm === info.id}
              onClick={() => chooseAlgorithm(info.id)}
            >
              {info.title}
            </button>
          ))}
        </div>
        <p className="lab-description">
          {
            labAlgorithms[structure].find((item) => item.id === algorithm)
              ?.description
          }
        </p>
        <h2>3. Edit the input</h2>
        {structure === "array" && (
          <div className="lab-editor">
            <div className="lab-value-list">
              {values.map((value, index) => (
                <div className="lab-value-control" key={index}>
                  <label htmlFor={`lab-value-${index}`}>Index {index}</label>
                  <input
                    id={`lab-value-${index}`}
                    type="number"
                    min={-999}
                    max={999}
                    value={value}
                    onChange={(e) =>
                      setValues(
                        values.map((item, i) =>
                          i === index ? Number(e.target.value) : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remove index ${index}`}
                    disabled={values.length <= 1}
                    onClick={() =>
                      setValues(values.filter((_, i) => i !== index))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="lab-secondary"
              disabled={values.length >= 20}
              onClick={() => setValues([...values, 0])}
            >
              Add value
            </button>
            <label className="lab-inline-label">
              Search target{" "}
              <input
                type="number"
                min={-999}
                max={999}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        {structure === "grid" && (
          <div className="lab-editor">
            <div className="lab-grid-size">
              <label>
                Rows{" "}
                <input
                  aria-label="Grid rows"
                  type="number"
                  min={2}
                  max={8}
                  value={rows.length}
                  onChange={(e) =>
                    resizeGrid(Number(e.target.value), rows[0].length)
                  }
                />
              </label>
              <label>
                Columns{" "}
                <input
                  aria-label="Grid columns"
                  type="number"
                  min={2}
                  max={8}
                  value={rows[0].length}
                  onChange={(e) =>
                    resizeGrid(rows.length, Number(e.target.value))
                  }
                />
              </label>
            </div>
            <div className="lab-tool-row" role="group" aria-label="Grid tool">
              {(["wall", "start", "goal"] as const).map((tool) => (
                <button
                  type="button"
                  key={tool}
                  aria-pressed={gridTool === tool}
                  className={gridTool === tool ? "selected" : ""}
                  onClick={() => setGridTool(tool)}
                >
                  {tool === "wall"
                    ? "Wall / open"
                    : tool === "start"
                      ? "Start A"
                      : "Goal B"}
                </button>
              ))}
            </div>
            <div
              className="lab-grid-editor"
              style={{
                gridTemplateColumns: `repeat(${rows[0].length}, minmax(0, 1fr))`,
              }}
            >
              {rows.flatMap((row, r) =>
                [...row].map((char, c) => (
                  <button
                    type="button"
                    key={`${r}:${c}`}
                    className={`lab-grid-cell cell-${char === "#" ? "wall" : char === "A" ? "start" : char === "B" ? "goal" : "open"}`}
                    aria-label={`Row ${r + 1} column ${c + 1}: ${char === "#" ? "wall" : char === "." ? "open" : char === "A" ? "start" : "goal"}`}
                    onClick={() => editGrid(r, c)}
                  >
                    {char === "." ? "" : char === "#" ? "■" : char}
                  </button>
                )),
              )}
            </div>
          </div>
        )}
        {structure === "graph" && (
          <div className="lab-editor">
            <div className="lab-node-list">
              {nodes.map((node) => (
                <span key={node}>
                  {node}
                  <button
                    type="button"
                    aria-label={`Remove node ${node}`}
                    disabled={nodes.length <= 2}
                    onClick={() => removeNode(node)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="lab-secondary"
                disabled={nodes.length >= 10}
                onClick={addNode}
              >
                Add node
              </button>
            </div>
            <div className="lab-select-row">
              <label>
                Start{" "}
                <select
                  aria-label="Graph start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node}>{node}</option>
                  ))}
                </select>
              </label>
              <label>
                Goal{" "}
                <select
                  aria-label="Graph goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node}>{node}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lab-select-row">
              <label>
                From{" "}
                <select
                  aria-label="Edge from"
                  value={edgeFrom}
                  onChange={(e) => setEdgeFrom(e.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node}>{node}</option>
                  ))}
                </select>
              </label>
              <label>
                To{" "}
                <select
                  aria-label="Edge to"
                  value={edgeTo}
                  onChange={(e) => setEdgeTo(e.target.value)}
                >
                  {nodes.map((node) => (
                    <option key={node}>{node}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="lab-secondary" onClick={connect}>
                Connect
              </button>
            </div>
            <ul className="lab-edge-list">
              {edges.map(([a, b], i) => (
                <li key={i}>
                  {a}—{b}
                  <button
                    type="button"
                    aria-label={`Remove edge ${a} to ${b}`}
                    onClick={() =>
                      setEdges(edges.filter((_, index) => index !== i))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {structure === "tree" && (
          <div className="lab-editor">
            <p>Node 1 is the root. Choose a parent for each later node.</p>
            <div className="lab-tree-list">
              {parents.map((parent, index) => (
                <label key={index}>
                  Node {index + 2}
                  <select
                    aria-label={`Parent of node ${index + 2}`}
                    value={parent}
                    onChange={(e) =>
                      setParents(
                        parents.map((value, i) =>
                          i === index ? Number(e.target.value) : value,
                        ),
                      )
                    }
                  >
                    {Array.from({ length: index + 1 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="lab-tool-row">
              <button
                type="button"
                className="lab-secondary"
                disabled={parents.length >= 9}
                onClick={() => setParents([...parents, 1])}
              >
                Add child of root
              </button>
              <button
                type="button"
                className="lab-secondary"
                disabled={!parents.length}
                onClick={() => setParents(parents.slice(0, -1))}
              >
                Remove last node
              </button>
            </div>
          </div>
        )}
        <button type="button" className="lab-run" onClick={() => execute()}>
          Run algorithm
        </button>
        <button type="button" className="lab-restore" onClick={restoreExample}>
          Restore example input
        </button>
        {error && (
          <p className="lab-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="lab-run-panel" aria-label="Algorithm run">
        <div className="lab-run-header">
          <div>
            <div className="eyebrow">LIVE SIMULATION</div>
            <h2>{run.info.title}</h2>
            <p>{run.info.complexity}</p>
          </div>
          <div className="lab-result">
            <span>RESULT</span>
            <strong>{run.output}</strong>
          </div>
        </div>
        <div className="lab-mode-row" role="group" aria-label="Playback mode">
          <button
            type="button"
            aria-pressed={mode === "learning"}
            className={mode === "learning" ? "selected" : ""}
            onClick={() => {
              pause();
              setMode("learning");
            }}
          >
            Teaching steps
          </button>
          <button
            type="button"
            aria-pressed={mode === "technical"}
            className={mode === "technical" ? "selected" : ""}
            onClick={() => {
              pause();
              setMode("technical");
            }}
          >
            Technical events
          </button>
        </div>
        <div className="lab-playback" aria-label="Playback controls">
          <button
            type="button"
            onClick={() => {
              pause();
              seek(0);
            }}
          >
            Reset
          </button>
          <button
            type="button"
            aria-label="Previous step"
            disabled={position === 0}
            onClick={() => {
              pause();
              seek(position - 1);
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            aria-label="Next step"
            disabled={position === length}
            onClick={() => {
              pause();
              seek(position + 1);
            }}
          >
            Next →
          </button>
          <label className="lab-seek-label">
            {mode === "learning"
              ? "Learning position"
              : "Technical event position"}
            <input
              aria-label={
                mode === "learning"
                  ? "Learning position"
                  : "Technical event position"
              }
              type="range"
              min={0}
              max={Math.max(length, 1)}
              value={position}
              onChange={(e) => {
                pause();
                seek(Number(e.target.value));
              }}
            />
          </label>
          <span className="lab-position">
            {position} / {length}
          </span>
        </div>
        <div className="lab-annotation" aria-live="polite">
          <span>
            {mode === "learning"
              ? `STEP ${learningPosition} / ${run.teachingSteps.length - 1}`
              : `EVENT ${timeline.position} / ${timeline.length}`}
          </span>
          <strong>
            {mode === "learning"
              ? lesson.title
              : (event?.type.replaceAll("_", " ") ?? "Ready")}
          </strong>
          <p>{state.annotation || "Press Next or Play to begin."}</p>
        </div>
        <div
          className="lab-visual"
          role="region"
          aria-label="Lab visualization"
        >
          <ChoreographyStage
            timeline={timeline}
            kind={run.info.structure}
            state={state}
            tags={[run.info.id]}
            step={mode === "learning" ? lesson : undefined}
            playing={playing}
          />
        </div>
        <div className="lab-legend">
          {rendererLegends[run.info.structure].map((item) => (
            <span key={item.label}>
              <i className={`legend-dot legend-${item.cue}`} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="lab-inspectors">
          <section>
            <h3>Data structure</h3>
            {run.info.structure === "array" ? (
              <p>Array values are shown in the visualization.</p>
            ) : (
              <CollectionVisual
                state={state}
                kind={
                  run.info.id.endsWith("dfs") || run.info.id === "tree-preorder"
                    ? "stack"
                    : "queue"
                }
              />
            )}
          </section>
          <section>
            <h3>Variables</h3>
            <VariablesVisual state={state} />
          </section>
        </div>
        <details className="lab-step-map">
          <summary>Teaching step map ({run.teachingSteps.length})</summary>
          <ol>
            {run.teachingSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={
                    mode === "learning" && step.index === learningPosition
                      ? "current"
                      : ""
                  }
                  onClick={() => {
                    pause();
                    setMode("learning");
                    seekTeachingStep(timeline, run.teachingSteps, step.index);
                  }}
                >
                  <span>
                    {step.index}. {step.title}
                  </span>
                  {step.summary}
                </button>
              </li>
            ))}
          </ol>
        </details>
        <details className="lab-code" open>
          <summary>Algorithm outline</summary>
          <CodeVisual
            source={run.info.source}
            activeLine={event?.sourceRef?.line}
            focusKind={state.focus?.kind}
            label="Lab algorithm outline"
          />
        </details>
        <details className="lab-event-log">
          <summary>Technical event log ({run.events.length})</summary>
          <ol>
            {run.events.map((item) => (
              <li key={item.eventId}>
                <button
                  type="button"
                  onClick={() => {
                    pause();
                    setMode("technical");
                    timeline.seek(item.step);
                  }}
                >
                  <span>
                    {item.step}. {item.type.replaceAll("_", " ")}
                  </span>
                  {item.explanation}
                </button>
              </li>
            ))}
          </ol>
        </details>
      </section>
    </div>
  );
}
