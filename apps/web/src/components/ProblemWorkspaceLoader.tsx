"use client";

import { useEffect, useState } from "react";
import type { ProblemMetadata } from "@sim/domain";
import type { ProblemEntry } from "@sim/problem-sdk";
import { loadProblem } from "@sim/problems/lazy";
import { ProblemWorkspace } from "./ProblemWorkspace";

export function ProblemWorkspaceLoader({
  problemId,
  related,
}: {
  problemId: string;
  related: ProblemMetadata[];
}) {
  const [problem, setProblem] = useState<ProblemEntry>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    loadProblem(problemId)
      .then((entry) => {
        if (!active) return;
        if (entry) setProblem(entry);
        else setError(true);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [problemId]);
  if (error)
    return (
      <main role="alert">
        This problem could not be loaded. Try reloading the page.
      </main>
    );
  if (!problem) return <main role="status">Loading the simulation…</main>;
  return (
    <ProblemWorkspace key={problemId} problem={problem} related={related} />
  );
}
