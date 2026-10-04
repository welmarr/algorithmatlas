import { notFound } from "next/navigation";
import { getProblem, problems } from "@sim/problems";
import { ProblemWorkspaceLoader } from "../../../components/ProblemWorkspaceLoader";

export function generateStaticParams() {
  return problems.map((problem) => ({ id: problem.metadata.id }));
}
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const selected = getProblem(id);
  if (!selected) notFound();
  const related = problems
    .filter((candidate) => candidate.metadata.id !== id)
    .map((candidate) => ({
      metadata: candidate.metadata,
      score:
        candidate.metadata.tags.filter((tag) =>
          selected.metadata.tags.includes(tag),
        ).length *
          2 +
        Number(candidate.metadata.category === selected.metadata.category),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.metadata.title.localeCompare(b.metadata.title),
    )
    .slice(0, 3)
    .map((item) => item.metadata);
  return <ProblemWorkspaceLoader key={id} problemId={id} related={related} />;
}
