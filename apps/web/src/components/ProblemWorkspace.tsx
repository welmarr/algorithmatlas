"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getProblem } from "@sim/problems";
import type { ProblemRun } from "@sim/problem-sdk";
import { seekTeachingStep, teachingStepAtPosition } from "@sim/simulation-core";
import {
  localTeacher,
  localModelTeacher,
  openAICompatibleTeacher,
} from "@sim/ai-sdk";
import { rendererLegends, Visuals } from "./Visuals";

export function ProblemWorkspace({ problemId }: { problemId: string }) {
  const problem = getProblem(problemId)!;
  const [mode, setMode] = useState<"learn" | "simulate">("simulate");
  const [playbackMode, setPlaybackMode] = useState<"learning" | "technical">(
    "learning",
  );
  const [learningPlaying, setLearningPlaying] = useState(false);
  const [rawInput, setRawInput] = useState(() =>
    JSON.stringify(problem.defaultInput, null, 2),
  );
  const [run, setRun] = useState<ProblemRun>(() =>
    problem.run(problem.defaultInput),
  );
  const [draftCode, setDraftCode] = useState(problem.source);
  const [executedCode, setExecutedCode] = useState(problem.source);
  const [error, setError] = useState("");
  const [errorArea, setErrorArea] = useState<"input" | "code">("input");
  const [teacherMode, setTeacherMode] = useState<
    "built-in" | "local-model" | "external"
  >("built-in");
  const [endpoint, setEndpoint] = useState(
    "http://localhost:11434/v1/chat/completions",
  );
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [teacherAnswer, setTeacherAnswer] = useState<{
    eventId: string;
    text: string;
  } | null>(null);
  const [teacherError, setTeacherError] = useState("");
  const [teacherBusy, setTeacherBusy] = useState(false);
  const [, redraw] = useState(0);
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
  const teachingStep = run.teachingSteps[learningPosition];
  const state = timeline.state;
  const event =
    playbackMode === "learning"
      ? run.events.find(
          (item) => item.eventId === teachingStep.primaryEventIds[0],
        )
      : timeline.currentEvent;
  if (playbackMode === "learning") {
    state.annotation = teachingStep.summary;
    const cue = teachingStep.cue;
    state.activeEntities = cue?.entityId ? [cue.entityId] : [];
    state.focus = cue
      ? {
          eventId: teachingStep.primaryEventIds[0] ?? teachingStep.id,
          kind: cue.kind,
          before: cue.before,
          after: cue.after,
        }
      : null;
  }
  const playing =
    playbackMode === "learning" ? learningPlaying : timeline.playing;
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
    }, 1100 / timeline.speed);
    return () => clearInterval(timer);
  }, [learningPlaying, learningPosition, run, timeline, timeline.speed]);
  const seekPosition = (position: number) => {
    if (playbackMode === "learning")
      seekTeachingStep(timeline, run.teachingSteps, position);
    else timeline.seek(position);
  };
  const focus = state.focus;
  const primaryEntity = state.activeEntities[0]
    ? state.entities[state.activeEntities[0]]
    : undefined;
  const focusTarget =
    primaryEntity?.kind === "grid"
      ? `Cell ${Number(primaryEntity.metadata?.row) + 1}, ${Number(primaryEntity.metadata?.col) + 1}`
      : primaryEntity?.kind === "array"
        ? `Index ${primaryEntity.label}`
        : primaryEntity?.kind === "dp"
          ? `dp[${primaryEntity.label}]`
          : (primaryEntity?.label ??
            (focus?.variable ? `Variable ${focus.variable}` : "Current step"));
  const focusDetail =
    playbackMode === "learning"
      ? teachingStep.summary
      : event?.type === "FUNCTION_RETURN"
        ? `Returned ${run.output}`
        : event?.type === "COMPARE"
          ? `Condition: ${String(event.payload.taken)}`
          : focus?.kind === "update" && focus.after !== undefined
            ? focus.before !== undefined && focus.before !== focus.after
              ? `${focusTarget}: ${String(focus.before)} → ${String(focus.after)}`
              : `${focusTarget} = ${String(focus.after)}`
            : event?.type === "READ_INDEX" && primaryEntity
              ? `${focusTarget} = ${String(primaryEntity.value)}`
              : focus
                ? focusTarget
                : "Press Play or Next to begin";
  const lines = executedCode.split("\n");
  function regenerate(source = draftCode) {
    try {
      const input = JSON.parse(rawInput);
      const next = problem.runCode
        ? problem.runCode(input, source)
        : problem.run(input);
      setRun(next);
      setLearningPlaying(false);
      setPlaybackMode("learning");
      setExecutedCode(source);
      setError("");
      setTeacherAnswer(null);
      setMode("simulate");
    } catch (cause) {
      setErrorArea(
        cause instanceof Error && cause.name === "CodeRuntimeError"
          ? "code"
          : "input",
      );
      setError(
        cause instanceof Error ? cause.message : "Could not run this input",
      );
    }
  }
  async function explainStep() {
    if (!event) return;
    setTeacherBusy(true);
    setTeacherError("");
    setTeacherAnswer(null);
    try {
      const teacher =
        teacherMode === "built-in"
          ? localTeacher()
          : teacherMode === "local-model"
            ? localModelTeacher({ endpoint, model, apiKey })
            : openAICompatibleTeacher({ endpoint, model, apiKey });
      const response = await teacher.explain(event);
      if (event?.eventId === response.eventId)
        setTeacherAnswer({
          eventId: response.eventId,
          text: response.explanation,
        });
    } catch (cause) {
      setTeacherError(
        cause instanceof Error ? cause.message : "Teacher unavailable",
      );
    } finally {
      setTeacherBusy(false);
    }
  }
  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <Link className="back-link" href="/">
            ← All problems
          </Link>
          <div className="eyebrow">
            {problem.metadata.category.toUpperCase()} /{" "}
            {problem.metadata.tags.join(" · ").toUpperCase()}
          </div>
          <h1>{problem.metadata.title}</h1>
          <p>{problem.metadata.summary}</p>
        </div>
        <div className="complexity">
          <span>
            TIME <strong>{problem.metadata.complexity.time}</strong>
          </span>
          <span>
            SPACE <strong>{problem.metadata.complexity.space}</strong>
          </span>
        </div>
      </div>
      <div className="mode-tabs" role="tablist" aria-label="Problem mode">
        <button
          role="tab"
          aria-selected={mode === "learn"}
          className={mode === "learn" ? "selected" : ""}
          onClick={() => setMode("learn")}
        >
          Learn the idea
        </button>
        <button
          role="tab"
          aria-selected={mode === "simulate"}
          className={mode === "simulate" ? "selected" : ""}
          onClick={() => setMode("simulate")}
        >
          Simulation{" "}
          <span className="tab-count">{run.teachingSteps.length} lessons</span>
        </button>
      </div>
      {mode === "learn" ? (
        <div className="learn-layout">
          <article className="panel learning-panel">
            <div className="eyebrow">INTUITION</div>
            <h2>{problem.metadata.learning.intuition}</h2>
            <p>{problem.metadata.learning.explanation}</p>
            <h3>How it works</h3>
            <ol>
              {problem.metadata.learning.approach.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {problem.metadata.learning.naive && (
              <>
                <h3>A simpler approach</h3>
                <p>{problem.metadata.learning.naive}</p>
              </>
            )}
          </article>
          <aside className="panel details-panel">
            <div className="eyebrow">REFERENCE</div>
            <h3>Example</h3>
            <pre>{problem.metadata.examples[0]?.input}</pre>
            <p>
              Output: <strong>{problem.metadata.examples[0]?.output}</strong>
            </p>
            <h3>Constraints</h3>
            <ul>
              {problem.metadata.constraints.map((constraint) => (
                <li key={constraint.label}>
                  {constraint.label}: {constraint.value}
                </li>
              ))}
            </ul>
            <a
              href={problem.metadata.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Original problem ↗
            </a>
          </aside>
        </div>
      ) : (
        <div className="sim-layout">
          <div className="sim-main">
            <section
              className="panel visual-panel"
              aria-label="Simulation visualization"
            >
              <div className="panel-header">
                <div>
                  <div className="eyebrow">LIVE VISUALIZATION</div>
                  <h2>{problem.metadata.renderer.toUpperCase()} STATE</h2>
                </div>
                <span className="step-pill">
                  {playbackMode === "learning"
                    ? `LEARNING STEP ${learningPosition} / ${run.teachingSteps.length - 1}`
                    : `TECHNICAL EVENT ${timeline.position} / ${timeline.length}`}
                </span>
              </div>
              <div
                className={`step-action ${focus ? `action-${focus.kind}` : "action-ready"}`}
                aria-live="polite"
              >
                <span className="action-marker" aria-hidden="true" />
                <span className="action-label">
                  {focus
                    ? {
                        inspect: "READING",
                        update: "VALUE CHANGED",
                        explore: "EXPLORING",
                        result: "FINAL RESULT",
                      }[focus.kind]
                    : "READY"}
                </span>
                <strong>{focusDetail}</strong>
              </div>
              <Visuals kind={problem.metadata.renderer} state={state} />
              <div className="visual-legend">
                {rendererLegends[problem.metadata.renderer].map(
                  ({ label, cue }) => (
                    <span key={label}>
                      <i className={`legend-dot ${cue}`} /> {label}
                    </span>
                  ),
                )}
              </div>
            </section>
            <section
              className="panel controls-panel"
              aria-label="Playback controls"
            >
              <div
                className="playback-mode"
                role="group"
                aria-label="Playback mode"
              >
                <button
                  aria-pressed={playbackMode === "learning"}
                  onClick={() => {
                    timeline.pause();
                    setPlaybackMode("learning");
                    seekTeachingStep(
                      timeline,
                      run.teachingSteps,
                      learningPosition,
                    );
                  }}
                >
                  Learning steps
                </button>
                <button
                  aria-pressed={playbackMode === "technical"}
                  onClick={() => {
                    setLearningPlaying(false);
                    setPlaybackMode("technical");
                  }}
                >
                  Technical events
                </button>
              </div>
              <div className="controls-row">
                <button
                  className="control-icon"
                  onClick={() => {
                    setLearningPlaying(false);
                    timeline.rewind();
                  }}
                  aria-label="Rewind to start"
                >
                  ⟲
                </button>
                <button
                  className="control-icon"
                  onClick={() => {
                    setLearningPlaying(false);
                    seekPosition(
                      playbackMode === "learning"
                        ? learningPosition - 1
                        : timeline.position - 1,
                    );
                  }}
                  disabled={
                    (playbackMode === "learning"
                      ? learningPosition
                      : timeline.position) === 0
                  }
                  aria-label="Previous step"
                >
                  ←
                </button>
                <button
                  className="play-button"
                  onClick={() =>
                    playbackMode === "learning"
                      ? setLearningPlaying(!learningPlaying)
                      : timeline.playing
                        ? timeline.pause()
                        : timeline.play()
                  }
                  disabled={
                    playbackMode === "learning"
                      ? learningPosition === run.teachingSteps.length - 1
                      : timeline.position === timeline.length
                  }
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? "Ⅱ Pause" : "▶ Play"}
                </button>
                <button
                  className="control-icon"
                  onClick={() => {
                    setLearningPlaying(false);
                    seekPosition(
                      playbackMode === "learning"
                        ? learningPosition + 1
                        : timeline.position + 1,
                    );
                  }}
                  disabled={
                    playbackMode === "learning"
                      ? learningPosition === run.teachingSteps.length - 1
                      : timeline.position === timeline.length
                  }
                  aria-label="Next step"
                >
                  →
                </button>
                <select
                  aria-label="Playback speed"
                  value={timeline.speed}
                  onChange={(e) => timeline.setSpeed(Number(e.target.value))}
                >
                  <option value="0.5">0.5×</option>
                  <option value="1">1×</option>
                  <option value="2">2×</option>
                  <option value="4">4×</option>
                </select>
              </div>
              <input
                className="seek"
                type="range"
                min="0"
                max={
                  playbackMode === "learning"
                    ? run.teachingSteps.length - 1
                    : timeline.length
                }
                value={
                  playbackMode === "learning"
                    ? learningPosition
                    : timeline.position
                }
                onChange={(e) => {
                  setLearningPlaying(false);
                  seekPosition(Number(e.target.value));
                }}
                aria-label={
                  playbackMode === "learning"
                    ? "Learning position"
                    : "Technical event position"
                }
              />
              <div className="timeline-labels">
                <span>START</span>
                <span>
                  {playbackMode === "learning"
                    ? `${learningPosition} / ${run.teachingSteps.length - 1} LEARNING STEPS`
                    : `${timeline.position} / ${timeline.length} TECHNICAL EVENTS`}
                </span>
                <span>END</span>
              </div>
            </section>
            <div className="lower-grid">
              <section className="panel explanation-panel" aria-live="polite">
                <div className="eyebrow">WHAT'S HAPPENING</div>
                <h2>
                  {playbackMode === "learning"
                    ? teachingStep.title
                    : event
                      ? event.type.replaceAll("_", " ")
                      : "Ready to begin"}
                </h2>
                <p>
                  {state.annotation ||
                    "Press Play or Next to follow the algorithm."}
                </p>
                {timeline.position === timeline.length && (
                  <div className="result">
                    RESULT <strong>{run.output}</strong>
                  </div>
                )}
              </section>
              <section className="panel structures-panel">
                <div className="eyebrow">STATE INSPECTOR</div>
                <h2>Variables & structures</h2>
                <dl>
                  {Object.entries(state.variables).map(([key, value]) => (
                    <div
                      key={key}
                      className={
                        focus?.variable === key && focus.before !== focus.after
                          ? "variable-row is-changing"
                          : "variable-row"
                      }
                    >
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
                {Object.entries(state.collections).map(([key, ids]) => (
                  <div className="collection" key={key}>
                    <strong>{key}</strong>
                    <span>
                      {ids.length
                        ? ids
                            .map((id) => state.entities[id]?.label ?? id)
                            .join(" → ")
                        : "empty"}
                    </span>
                  </div>
                ))}
                {!Object.keys(state.variables).length &&
                  !Object.keys(state.collections).length && (
                    <p className="muted">
                      State will appear as the trace advances.
                    </p>
                  )}
              </section>
            </div>
          </div>
          <aside className="sim-sidebar">
            <section className="panel input-panel">
              <div className="eyebrow">EXPERIMENT</div>
              <h2>Change the input</h2>
              <label htmlFor="problem-input">JSON input</label>
              <textarea
                id="problem-input"
                spellCheck={false}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
              {error && errorArea === "input" && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="run-button" onClick={() => regenerate()}>
                Run simulation ↗
              </button>
            </section>
            <section className="panel code-panel">
              <div className="eyebrow">
                {problem.runCode
                  ? "EXECUTED JAVASCRIPT"
                  : "ILLUSTRATIVE REFERENCE"}
              </div>
              <h2>{problem.runCode ? "Edit and run code" : "Code trace"}</h2>
              {problem.runCode && (
                <div className="code-editor-wrap">
                  <p>
                    Reads and writes below come from this code. Edit it, then
                    run it with the JSON input.
                  </p>
                  <label htmlFor="code-editor">JavaScript subset</label>
                  <textarea
                    id="code-editor"
                    spellCheck={false}
                    value={draftCode}
                    onChange={(e) => setDraftCode(e.target.value)}
                  />
                  <div className="code-editor-actions">
                    <button className="run-button" onClick={() => regenerate()}>
                      Run code &amp; input ↗
                    </button>
                    <button
                      className="restore-button"
                      onClick={() => {
                        setDraftCode(problem.source);
                        regenerate(problem.source);
                      }}
                    >
                      Restore reference
                    </button>
                  </div>
                  {error && errorArea === "code" && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  {draftCode !== executedCode && (
                    <p className="code-pending">
                      Code changed. Run to update the trace.
                    </p>
                  )}
                  <p className="code-subset">
                    Supports variables, arithmetic, conditions, for loops, and
                    values[i].
                  </p>
                </div>
              )}
              <div className="code-trace-heading">
                {problem.runCode
                  ? "CODE THAT PRODUCED THIS TRACE"
                  : "CODE TRACE"}
              </div>
              <div
                className="code-lines"
                role="list"
                aria-label={
                  problem.runCode ? "Executed code" : "Reference code"
                }
              >
                {lines.map((line, i) => (
                  <div
                    role="listitem"
                    key={i}
                    className={
                      event?.sourceRef?.line === i + 1
                        ? `code-line active cue-${focus?.kind ?? "inspect"}`
                        : "code-line"
                    }
                  >
                    <span>{i + 1}</span>
                    <code>{line || " "}</code>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel teacher-panel">
              <div className="eyebrow">OPTIONAL TEACHER</div>
              <h2>Explain this step</h2>
              <select
                aria-label="Teacher provider"
                value={teacherMode}
                onChange={(e) => {
                  const mode = e.target.value as typeof teacherMode;
                  setTeacherMode(mode);
                  setTeacherAnswer(null);
                  setEndpoint(
                    mode === "local-model"
                      ? "http://localhost:11434/v1/chat/completions"
                      : "https://api.openai.com/v1/chat/completions",
                  );
                }}
              >
                <option value="built-in">Built-in explanation</option>
                <option value="local-model">Local model</option>
                <option value="external">OpenAI compatible</option>
              </select>
              {teacherMode !== "built-in" && (
                <>
                  <label htmlFor="teacher-endpoint">Endpoint</label>
                  <input
                    id="teacher-endpoint"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                  />
                  <label htmlFor="teacher-model">Model</label>
                  <input
                    id="teacher-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                  <label htmlFor="teacher-key">API key (session only)</label>
                  <input
                    id="teacher-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </>
              )}
              <button onClick={explainStep} disabled={!event || teacherBusy}>
                {teacherBusy ? "Explaining…" : "Explain current event"}
              </button>
              {teacherAnswer && teacherAnswer.eventId === event?.eventId && (
                <p aria-live="polite">{teacherAnswer.text}</p>
              )}
              {teacherError && (
                <p className="error" role="alert">
                  {teacherError}
                </p>
              )}
            </section>
            {playbackMode === "learning" ? (
              <section className="panel event-panel teaching-panel">
                <div className="eyebrow">LEARNING STEPS</div>
                <h2>Meaningful changes</h2>
                <ol>
                  {run.teachingSteps.map((item, i) => (
                    <li key={item.id}>
                      <button
                        className={i === learningPosition ? "current" : ""}
                        onClick={() => {
                          setLearningPlaying(false);
                          seekTeachingStep(timeline, run.teachingSteps, i);
                        }}
                      >
                        <span>{String(i).padStart(2, "0")}</span>
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              <section className="panel event-panel">
                <div className="eyebrow">TECHNICAL EVENT LOG</div>
                <h2>Trace</h2>
                <ol>
                  {run.events.map((item, i) => (
                    <li key={item.eventId}>
                      <button
                        className={i + 1 === timeline.position ? "current" : ""}
                        onClick={() => timeline.seek(i + 1)}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {item.type.replaceAll("_", " ")}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
