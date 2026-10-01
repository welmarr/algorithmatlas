import Link from "next/link";
import { problems } from "@sim/problems";

export default function Home() {
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
          Explore real algorithm problems with editable inputs, semantic traces,
          and precise replay. Every simulation runs deterministically in your
          browser.
        </p>
        <Link
          className="primary-link"
          href={`/problems/${problems[0].metadata.id}`}
        >
          Start exploring <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <section className="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CURATED PROBLEMS</div>
            <h2 id="catalog-title">Choose a starting point</h2>
          </div>
          <span>{problems.length} simulations</span>
        </div>
        <div className="problem-grid">
          {problems.map((problem, index) => (
            <Link
              className="problem-card"
              key={problem.metadata.id}
              href={`/problems/${problem.metadata.id}`}
            >
              <div className="card-top">
                <span className="card-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="category">{problem.metadata.category}</span>
              </div>
              <h3>{problem.metadata.title}</h3>
              <p>{problem.metadata.summary}</p>
              <div className="card-bottom">
                <span>{problem.metadata.complexity.time} time</span>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
