import type { ProblemMetadata } from "@sim/domain";

const groups: Array<[RegExp, string]> = [
  [/graph|shortest|depth-first|grid/i, "Graphs"],
  [/tree/i, "Trees"],
  [/range|fenwick|segment/i, "Range Queries"],
  [/dynamic programming|dp/i, "Dynamic Programming"],
  [/sort|search|pointer|window|array|binary/i, "Arrays & Searching"],
  [/string/i, "Strings"],
  [/math/i, "Mathematics"],
  [/geometry/i, "Geometry"],
  [/backtrack/i, "Backtracking"],
];

export function catalogCategory(metadata: ProblemMetadata): string {
  return (
    groups.find(([pattern]) => pattern.test(metadata.category))?.[1] ??
    metadata.category
  );
}

export function csesSourceId(metadata: ProblemMetadata): string {
  return metadata.source.url?.match(/\/task\/(\d+)\/?$/)?.[1] ?? "";
}
