import Link from "next/link";
import { problems } from "@sim/problems";
export default function LabPage() {
  return (
    <main className="lab-page">
      <div className="eyebrow">ALGORITHM LAB</div>
      <h1>Explore by structure</h1>
      <p>
        Start with a representative algorithm, edit its input, and inspect the
        resulting trace.
      </p>
      <Link className="back-link" href="/lab/renderers">
        View the structure gallery →
      </Link>
      <div className="problem-grid">
        {problems.map((problem) => (
          <Link
            className="problem-card"
            key={problem.metadata.id}
            href={`/problems/${problem.metadata.id}`}
          >
            <span className="category">{problem.metadata.category}</span>
            <h3>{problem.metadata.title}</h3>
            <p>{problem.metadata.learning.intuition}</p>
            <div className="card-bottom">
              <span>Open lab</span>
              <span aria-hidden="true">↗</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
