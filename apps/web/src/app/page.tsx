import Link from "next/link";
import { getProblem, problems } from "@sim/problems";
import { HomeDemo, type DemoFrame } from "../components/HomeDemo";

const featuredIds = [
  "increasing-array",
  "message-route",
  "edit-distance",
  "dynamic-range-sum",
];
const paths = [
  {
    name: "Arrays fundamentals",
    concept: "array",
    note: "Build confidence with values and positions.",
  },
  {
    name: "Graph traversal",
    concept: "BFS",
    note: "Explore layers, routes, and connected spaces.",
  },
  {
    name: "Dynamic programming",
    concept: "dp",
    note: "See each state depend on earlier decisions.",
  },
];

function demoFrames(): { frames: DemoFrame[]; result: string } {
  const problem = getProblem("increasing-array");
  if (!problem) throw new Error("Home demo problem is missing");
  const run = problem.run(problem.defaultInput);
  const last = run.teachingSteps.length - 1;
  const indices = [...new Set([0, Math.floor(last / 2), last])];
  const frames = indices.map((index) => {
    const step = run.teachingSteps[index];
    const state = run.timeline.stateAt(step.eventRange.end);
    const values = Object.values(state.entities)
      .filter((entity) => entity.kind === "array")
      .sort((left, right) => Number(left.label) - Number(right.label))
      .map((entity) => Number(entity.value));
    return { title: step.title, summary: step.summary, values };
  });
  run.timeline.dispose();
  return { frames, result: run.output };
}

export default function Home() {
  const demo = demoFrames();
  const featured = featuredIds
    .map((id) => getProblem(id))
    .filter((problem): problem is NonNullable<typeof problem> =>
      Boolean(problem),
    );
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">LEARN BY EXECUTING</div>
        <h1>
          See the logic.
          <br />
          <em>Follow every step.</em>
        </h1>
        <p>
          Work through real algorithm problems with editable inputs, clear
          reasoning, and deterministic replay.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/problems">
            Explore problems <span aria-hidden="true">↗</span>
          </Link>
          <Link className="secondary-link" href="/problems/increasing-array">
            Open the full simulator
          </Link>
        </div>
      </section>
      <HomeDemo {...demo} />
      <section className="home-journey" aria-labelledby="journey-title">
        <div className="eyebrow">HOW LEARNING WORKS</div>
        <h2 id="journey-title">From a problem to an experiment</h2>
        <ol>
          <li>
            <strong>Problem</strong>
            <span>Understand the goal and constraints.</span>
          </li>
          <li>
            <strong>Reasoning</strong>
            <span>Follow each decision in plain language.</span>
          </li>
          <li>
            <strong>Visualization</strong>
            <span>Watch real algorithm state change.</span>
          </li>
          <li>
            <strong>Experiment</strong>
            <span>Edit the input and rerun it yourself.</span>
          </li>
        </ol>
      </section>
      <section className="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FEATURED SIMULATIONS</div>
            <h2 id="catalog-title">Choose a starting point</h2>
          </div>
          <Link href="/problems">View all {problems.length} problems →</Link>
        </div>
        <div className="problem-grid">
          {featured.map((problem) => (
            <Link
              className="problem-card"
              key={problem.metadata.id}
              href={"/problems/" + problem.metadata.id}
            >
              <div className="card-top">
                <span className="category">{problem.metadata.category}</span>
              </div>
              <h3>{problem.metadata.title}</h3>
              <p>{problem.metadata.summary}</p>
              <div className="card-bottom">
                <span>{problem.metadata.tags.slice(0, 2).join(" · ")}</span>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-paths" aria-labelledby="paths-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LEARNING PATHS</div>
            <h2 id="paths-title">Follow a concept</h2>
          </div>
        </div>
        <div className="home-path-grid">
          {paths.map((path) => (
            <Link
              key={path.name}
              href={"/problems?concept=" + encodeURIComponent(path.concept)}
            >
              <strong>{path.name}</strong>
              <span>{path.note}</span>
              <span>Explore path →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
