"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  interpretPythonTrace,
  type PythonInterpretation,
} from "@sim/semantic-interpreter";
import type { RunnerResult } from "@sim/isolated-runner";
import { pythonExamples } from "../lib/python-examples";
import { PythonPlayer } from "./PythonPlayer";
type Handle = { id: string; capability: string };
type Executed = {
  run: PythonInterpretation;
  source: string;
  output: unknown;
  stdout: string;
};
export function OwnCodeWorkspace({ enabled }: { enabled: boolean }) {
  const [source, setSource] = useState(pythonExamples.array.source);
  const [input, setInput] = useState(
    JSON.stringify(pythonExamples.array.input, null, 2),
  );
  const [name, setName] = useState("My Python workspace");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [executed, setExecuted] = useState<Executed | null>(null);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);
  const handle = useRef<Handle | null>(null);
  const generation = useRef(0),
    cancelRequested = useRef(false);
  async function cancelJob(job: Handle) {
    return fetch(`/api/python/jobs/${job.id}`, {
      method: "DELETE",
      headers: { "x-job-capability": job.capability },
      keepalive: true,
    });
  }
  useEffect(() => {
    try {
      const draft = JSON.parse(
        sessionStorage.getItem("atlas:python-draft") ?? "null",
      );
      if (
        draft &&
        typeof draft.source === "string" &&
        draft.source.length <= 4096 &&
        typeof draft.input === "string" &&
        draft.input.length <= 20000
      ) {
        setSource(draft.source);
        setInput(draft.input);
      }
    } catch {
      /* Optional browser draft. */
    }
    setHydrated(true);
    const savedId = new URLSearchParams(location.search).get("saved");
    if (savedId && /^[a-f0-9-]{36}$/.test(savedId)) {
      fetch(`/api/progress/workspaces/${savedId}`)
        .then(async (response) => {
          const value = await response.json();
          if (!response.ok) throw new Error(value.error);
          setSource(value.source);
          setInput(JSON.stringify(value.input, null, 2));
          setName(value.name);
          setSaveStatus("Saved workspace loaded. Run to create a new trace.");
        })
        .catch(() =>
          setSaveStatus(
            "Could not load that saved workspace. Sign in to its verified account.",
          ),
        );
    }
    return () => {
      generation.current++;
      if (handle.current) void cancelJob(handle.current);
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        "atlas:python-draft",
        JSON.stringify({ source, input }),
      );
    } catch {
      /* Optional browser draft. */
    }
  }, [hydrated, source, input]);
  async function execute() {
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch {
      setError("Enter valid JSON input.");
      return;
    }
    const current = ++generation.current,
      executedSource = source;
    cancelRequested.current = false;
    setBusy(true);
    setExecuted(null);
    setError("");
    setStatus("Submitting");
    try {
      const response = await fetch("/api/python/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, input: data }),
      });
      const job = await response.json();
      if (!response.ok) throw new Error(`${job.code}: ${job.error}`);
      handle.current = job;
      if (current !== generation.current || cancelRequested.current)
        await cancelJob(job);
      const deadline = Date.now() + 60000;
      while (current === generation.current) {
        const poll = await fetch(`/api/python/jobs/${job.id}`, {
          headers: { "x-job-capability": job.capability },
          cache: "no-store",
        });
        const view = await poll.json();
        if (!poll.ok) throw new Error(view.error);
        setStatus(view.status);
        if (view.status === "completed") {
          const result = view.result as RunnerResult;
          const run = interpretPythonTrace({
            source: executedSource,
            input: data,
            output: result.output,
            rawTrace: result.rawTrace,
            runId: job.id,
          });
          setExecuted({
            run,
            source: executedSource,
            output: result.output,
            stdout: result.stdout,
          });
          break;
        }
        if (view.status === "failed" || view.status === "cancelled")
          throw new Error(
            `${view.code}${view.errorLine ? ` at line ${view.errorLine}` : ""}: ${view.error}`,
          );
        if (Date.now() > deadline) {
          await cancelJob(job);
          throw new Error("Execution took too long. Cancellation requested.");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (cause) {
      if (current === generation.current) {
        setError(cause instanceof Error ? cause.message : "Execution failed");
        setStatus(cancelRequested.current ? "cancelled" : "failed");
      }
    } finally {
      if (current === generation.current) {
        setBusy(false);
        handle.current = null;
      }
    }
  }
  async function cancel() {
    cancelRequested.current = true;
    setStatus("cancelling");
    if (handle.current) await cancelJob(handle.current);
  }
  async function save() {
    try {
      const response = await fetch("/api/progress/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, input: JSON.parse(input), name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSaveStatus("Workspace saved to your account.");
      await list();
    } catch (cause) {
      setSaveStatus(cause instanceof Error ? cause.message : "Save failed");
    }
  }
  async function list() {
    const response = await fetch("/api/progress/workspaces");
    const value = await response.json();
    if (!response.ok) {
      setSaveStatus(value.error);
      return;
    }
    setSaved(value);
  }
  async function remove(id: string) {
    const response = await fetch(`/api/progress/workspaces/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setSaveStatus("Workspace deleted.");
      await list();
    } else setSaveStatus("Could not delete that workspace.");
  }
  return (
    <main className="own-code-page">
      <div className="own-code-heading">
        <div>
          <div className="eyebrow">OWN CODE · PYTHON</div>
          <h1>Run it. See what changes.</h1>
          <p>
            Your source, your input, an observed execution. No account required
            to run. Create an account to save your work.
          </p>
        </div>
        <span className="python-local-badge">Local execution</span>
      </div>
      {!enabled && (
        <p className="python-notice" role="status">
          Python execution is not enabled on this installation. You can edit a
          draft or explore the curated simulations.
        </p>
      )}
      <div className="own-code-editors">
        <section className="panel python-source">
          <div className="python-section-heading">
            <h2>Your program</h2>
            <label>
              Example{" "}
              <select
                aria-label="Example"
                disabled={busy || !hydrated}
                defaultValue="array"
                onChange={(e) => {
                  const item =
                    pythonExamples[
                      e.target.value as keyof typeof pythonExamples
                    ];
                  setSource(item.source);
                  setInput(JSON.stringify(item.input, null, 2));
                }}
              >
                {Object.entries(pythonExamples).map(([key, item]) => (
                  <option value={key} key={key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label htmlFor="python-source">Python source</label>
          <textarea
            id="python-source"
            value={source}
            maxLength={4096}
            disabled={!hydrated || busy}
            spellCheck={false}
            onChange={(e) => setSource(e.target.value)}
          />
          <p className="python-hint">
            Define solve(data) and return a JSON value. Python is the supported
            language.
          </p>
        </section>
        <section className="panel python-input">
          <h2>Input &amp; execution</h2>
          <label htmlFor="python-input">JSON input</label>
          <textarea
            id="python-input"
            value={input}
            disabled={!hydrated || busy}
            spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="python-controls">
            <button
              className="python-run"
              disabled={!enabled || busy || !hydrated}
              onClick={execute}
            >
              Run Python
            </button>
            <button disabled={!busy} onClick={cancel}>
              Cancel execution
            </button>
          </div>
          <p className="python-status" role="status">
            Execution: {status}
          </p>
          {error && (
            <p className="python-error" role="alert">
              {error}
            </p>
          )}
          <details>
            <summary>Supported code and limits</summary>
            <p>
              4,096 source characters · 16 KiB input · 800 trace events · 8 KiB
              printed output · 5 seconds execution. Imports: math, collections,
              heapq, bisect, itertools, functools. Files, network, processes and
              private attributes are unavailable. Large or unsupported programs
              stop with an explanation.
            </p>
          </details>
        </section>
      </div>
      {executed && (
        <>
          <PythonPlayer
            key={executed.run.events[0]?.eventId}
            run={executed.run}
            source={executed.source}
            output={executed.output}
          />
          {executed.stdout && (
            <section className="panel python-stdout">
              <h2>Printed output</h2>
              <pre>{executed.stdout}</pre>
            </section>
          )}
          {source !== executed.source && (
            <p className="python-notice">
              Source changed. Run again to update the displayed trace.
            </p>
          )}
        </>
      )}
      <section className="panel python-save">
        <div>
          <div className="eyebrow">KEEP YOUR WORK</div>
          <h2>Save this workspace</h2>
          <p>
            Your draft stays in this browser tab. A verified account can save
            the source and input for later.
          </p>
          <Link href="/account?returnTo=/own-code">
            Account · sign in or verify
          </Link>
        </div>
        <div>
          <label>
            Workspace name
            <input
              value={name}
              maxLength={64}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="python-controls">
            <button disabled={!hydrated} onClick={save}>
              Save workspace
            </button>
            <button onClick={list}>My saved workspaces</button>
          </div>
          <p role="status">{saveStatus}</p>
          <ul>
            {saved.map((item) => (
              <li key={item.id}>
                <a href={`/own-code?saved=${item.id}`}>{item.name}</a>
                <button
                  aria-label={`Delete ${item.name}`}
                  onClick={() => remove(item.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
