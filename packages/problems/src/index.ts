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
import { advancedMathematicsProblems } from "./mathematics-advanced";
import { geometryPrimitiveProblems } from "./geometry-primitives";
import { wave100RangeProblems } from "./range-wave-100";
import { wave100TreeProblems } from "./tree-wave-100";
import { wave100GraphCoreProblems } from "./graph-wave-100-core";
import { wave100GraphPathProblems } from "./graph-wave-100-paths";
import { wave200FoundationProblems } from "./wave-200-foundations";

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
  ...advancedMathematicsProblems,
  ...geometryPrimitiveProblems,
  ...wave100RangeProblems,
  ...wave100TreeProblems,
  ...wave100GraphCoreProblems,
  ...wave100GraphPathProblems,
  ...wave200FoundationProblems,
];
export function getProblem(id: string): ProblemEntry | undefined {
  return problems.find((problem) => problem.metadata.id === id);
}
