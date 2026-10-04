import { databaseReady, dashboardData } from "@sim/persistence";
import { problems } from "@sim/problems";
import { certificationEvidence } from "@sim/problems/certification";
import { ProblemsLibrary } from "../../components/ProblemsLibrary";
import { currentUser } from "../../lib/auth";
import "./problems.css";

export const dynamic = "force-dynamic";

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ concept?: string }>;
}) {
  const params = await searchParams;
  const user = (await databaseReady()) ? await currentUser() : null;
  const exploredIds = user?.emailVerified
    ? (await dashboardData(user.id)).exploredProblemIds
    : [];
  return (
    <main className="library-page">
      <div className="eyebrow">PROBLEMS LIBRARY</div>
      <h1>Find your next simulation</h1>
      <p>
        Search by problem, CSES ID, category, or algorithm. Every result opens
        an interactive workspace.
      </p>
      <ProblemsLibrary
        entries={problems.map((problem) => ({
          ...problem.metadata,
          algorithm:
            certificationEvidence[problem.metadata.id]?.algorithm ?? "",
        }))}
        exploredIds={exploredIds}
        initialConcept={params.concept ?? ""}
      />
    </main>
  );
}
