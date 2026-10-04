"use client";
import { useState } from "react";

export interface DemoFrame {
  title: string;
  summary: string;
  values: number[];
}

export function HomeDemo({
  frames,
  result,
}: {
  frames: DemoFrame[];
  result: string;
}) {
  const [position, setPosition] = useState(0);
  const frame = frames[position];
  return (
    <section className="home-demo panel" aria-labelledby="home-demo-title">
      <div className="home-demo-heading">
        <div>
          <div className="eyebrow">LIVE SIMULATION · INCREASING ARRAY</div>
          <h2 id="home-demo-title">Watch a greedy choice take shape</h2>
        </div>
        <span className="home-demo-count">
          Step {position + 1} of {frames.length}
        </span>
      </div>
      <p className="home-demo-reason" aria-live="polite">
        <strong>{frame.title}.</strong> {frame.summary}
      </p>
      <div
        className="home-demo-array"
        role="img"
        aria-label={"Array values: " + frame.values.join(", ")}
      >
        {frame.values.map((value, index) => (
          <div className="home-demo-cell" key={index}>
            <span className="home-demo-index">{index}</span>
            <strong>{value}</strong>
            {position > 0 && value !== frames[position - 1].values[index] && (
              <span className="home-demo-changed">Updated</span>
            )}
          </div>
        ))}
      </div>
      <div className="home-demo-footer">
        <span>
          {position === frames.length - 1
            ? "Minimum increments: " + result
            : "Follow the next decision"}
        </span>
        <div className="home-demo-controls">
          <button
            type="button"
            onClick={() => setPosition(0)}
            disabled={position === 0}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() =>
              setPosition((value) => Math.min(value + 1, frames.length - 1))
            }
            disabled={position === frames.length - 1}
          >
            Next step →
          </button>
        </div>
      </div>
    </section>
  );
}
