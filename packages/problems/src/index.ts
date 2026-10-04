import type { ProblemEntry } from "@sim/problem-sdk";
import { coreProblems } from "./core";
import { arrayProblems } from "./extended-arrays";
import { graphProblems } from "./extended-graphs";
import { mixedProblems } from "./extended-mixed";
import { introductoryProblems } from "./introductory";
import { sortingSearchingProblems } from "./sorting-searching";
import { dynamicProgrammingProblems } from "./dynamic-programming";
import { graphFoundationProblems } from "./graph-foundations";
import { graphAlgorithmProblems } from "./graph-algorithms";
import { treeAlgorithmProblems } from "./tree-algorithms";
import { rangeAlgorithmProblems } from "./range-algorithms";
import { stringAlgorithmProblems } from "./string-algorithms";
import { dynamicAdvancedProblems } from "./dynamic-advanced";
import { dagRouteProblems } from "./dag-routes";

export type { ProblemEntry } from "@sim/problem-sdk";
export const problems: ProblemEntry[] = [
  ...coreProblems,
  ...arrayProblems,
  ...graphProblems,
  ...mixedProblems,
  ...introductoryProblems,
  ...sortingSearchingProblems,
  ...dynamicProgrammingProblems,
  ...graphFoundationProblems,
  ...graphAlgorithmProblems,
  ...treeAlgorithmProblems,
  ...rangeAlgorithmProblems,
  ...stringAlgorithmProblems,
  ...dynamicAdvancedProblems,
  ...dagRouteProblems,
];
export function getProblem(id: string): ProblemEntry | undefined {
  return problems.find((problem) => problem.metadata.id === id);
}
