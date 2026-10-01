import { notFound } from "next/navigation";
import { getProblem, problems } from "@sim/problems";
import { ProblemWorkspace } from "../../../components/ProblemWorkspace";

export function generateStaticParams() {
  return problems.map((problem) => ({ id: problem.metadata.id }));
}
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getProblem(id)) notFound();
  return <ProblemWorkspace problemId={id} />;
}
