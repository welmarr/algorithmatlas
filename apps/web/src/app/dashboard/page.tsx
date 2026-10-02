import Link from "next/link";
import { redirect } from "next/navigation";
import {
  dashboardData,
  databaseReady,
  listPythonWorkspaces,
} from "@sim/persistence";
import { getProblem } from "@sim/problems";
import { currentUser } from "../../lib/auth";
import "../account.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await databaseReady())) redirect("/account");
  const user = await currentUser();
  if (!user) redirect("/account");
  if (!user.emailVerified) redirect("/account?error=AUTH_EMAIL_UNVERIFIED");
  const data = await dashboardData(user.id);
  const workspaces = await listPythonWorkspaces(user.id);
  return (
    <main className="account-page dashboard-page">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">LEARNING PROGRESS</div>
          <h1>{user.displayName}&apos;s dashboard</h1>
        </div>
        <form method="post" action="/api/auth/logout">
          <button type="submit" className="text-button">
            Sign out
          </button>
        </form>
      </div>
      <div className="dashboard-metrics">
        <section className="panel">
          <strong>{data.problemsExplored}</strong>
          <span>Problems explored</span>
        </section>
        <section className="panel">
          <strong>{data.simulationsCompleted}</strong>
          <span>Curated simulations saved</span>
        </section>
        <section className="panel">
          <strong>{data.savedInputs.length}</strong>
          <span>Saved inputs</span>
        </section>
      </div>
      <div className="dashboard-columns">
        <section className="panel account-card">
          <h2>Recent runs</h2>
          {data.recentRuns.length ? (
            <ul>
              {data.recentRuns.map((run) => (
                <li key={run.id}>
                  <Link href={`/problems/${run.problemId}`}>
                    {getProblem(run.problemId)?.metadata.title ?? run.problemId}
                  </Link>
                  <span>
                    {run.eventCount} events ·{" "}
                    {run.createdAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Run a curated simulation and save it to see it here.</p>
          )}
        </section>
        <section className="panel account-card">
          <h2>Saved inputs</h2>
          {data.savedInputs.length ? (
            <ul>
              {data.savedInputs.map((saved) => (
                <li key={saved.id}>
                  <Link href={`/problems/${saved.problemId}?saved=${saved.id}`}>
                    {saved.name}
                  </Link>
                  <span>
                    {getProblem(saved.problemId)?.metadata.title ??
                      saved.problemId}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Save a useful input from a problem page to revisit it.</p>
          )}
        </section>
      </div>
      {data.learning.length > 0 && (
        <section className="panel account-card">
          <h2>Concepts</h2>
          <ul>
            {data.learning.map((item) => (
              <li key={item.conceptId}>
                <span>{item.conceptId}</span>
                <span>{item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="panel account-card">
        <h2>Python workspaces</h2>
        {workspaces.length ? (
          <ul>
            {workspaces.map((item) => (
              <li key={item.id}>
                <Link href={`/own-code?saved=${item.id}`}>{item.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Save source and input from Own Code to continue later.</p>
        )}
        <Link href="/own-code">Open Own Code</Link>
      </section>
      <Link className="primary-link" href="/">
        Explore problems
      </Link>
    </main>
  );
}
