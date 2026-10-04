import type { ProblemEntry } from "@sim/problem-sdk";

type Family = {
  ids: readonly string[];
  load: () => Promise<ProblemEntry[]>;
};

/** Only IDs and import boundaries are eager in the browser. Keep every registry ID in exactly one family. */
const families: Family[] = [
  {
    ids: [
      "increasing-array",
      "labyrinth",
      "message-route",
      "tree-diameter",
      "dice-combinations",
    ],
    load: () => import("./core").then((module) => module.coreProblems),
  },
  {
    ids: [
      "distinct-numbers",
      "sum-of-two-values",
      "sliding-window-sum",
      "factory-machines",
      "static-range-sum",
      "dynamic-range-sum",
    ],
    load: () =>
      import("./extended-arrays").then((module) => module.arrayProblems),
  },
  {
    ids: [
      "counting-rooms",
      "shortest-routes-i",
      "subordinates",
      "road-construction",
    ],
    load: () =>
      import("./extended-graphs").then((module) => module.graphProblems),
  },
  {
    ids: [
      "edit-distance",
      "string-matching",
      "chessboard-and-queens",
      "exponentiation",
      "polygon-area",
    ],
    load: () =>
      import("./extended-mixed").then((module) => module.mixedProblems),
  },
  {
    ids: [
      "weird-algorithm",
      "missing-number",
      "repetitions",
      "permutations",
      "bit-strings",
      "trailing-zeros",
      "coin-piles",
      "two-knights",
      "two-sets",
      "number-spiral",
    ],
    load: () =>
      import("./introductory").then((module) => module.introductoryProblems),
  },
  {
    ids: [
      "maximum-subarray-sum",
      "stick-lengths",
      "missing-coin-sum",
      "collecting-numbers",
      "playlist",
      "nearest-smaller-values",
      "subarray-sums-i",
      "subarray-sums-ii",
      "subarray-divisibility",
    ],
    load: () =>
      import("./sorting-searching").then(
        (module) => module.sortingSearchingProblems,
      ),
  },
  {
    ids: [
      "minimizing-coins",
      "coin-combinations-i",
      "coin-combinations-ii",
      "removing-digits",
      "book-shop",
      "grid-paths-i",
      "money-sums",
      "two-sets-ii",
      "increasing-subsequence",
      "rectangle-cutting",
      "array-description",
    ],
    load: () =>
      import("./dynamic-programming").then(
        (module) => module.dynamicProgrammingProblems,
      ),
  },
  {
    ids: [
      "building-roads",
      "course-schedule",
      "road-reparation",
      "flight-routes-check",
    ],
    load: () =>
      import("./graph-foundations").then(
        (module) => module.graphFoundationProblems,
      ),
  },
  {
    ids: ["building-teams", "round-trip-ii", "shortest-routes-ii"],
    load: () =>
      import("./graph-algorithms").then(
        (module) => module.graphAlgorithmProblems,
      ),
  },
  {
    ids: [
      "tree-distances-i",
      "tree-distances-ii",
      "tree-matching",
      "company-queries-i",
    ],
    load: () =>
      import("./tree-algorithms").then(
        (module) => module.treeAlgorithmProblems,
      ),
  },
  {
    ids: [
      "static-range-minimum",
      "dynamic-range-minimum",
      "range-xor-queries",
      "range-update-queries",
      "forest-queries",
    ],
    load: () =>
      import("./range-algorithms").then(
        (module) => module.rangeAlgorithmProblems,
      ),
  },
  {
    ids: [
      "finding-borders",
      "finding-periods",
      "string-functions",
      "word-combinations",
    ],
    load: () =>
      import("./string-algorithms").then(
        (module) => module.stringAlgorithmProblems,
      ),
  },
  {
    ids: ["counting-towers", "projects", "elevator-rides"],
    load: () =>
      import("./dynamic-advanced").then(
        (module) => module.dynamicAdvancedProblems,
      ),
  },
  {
    ids: ["game-routes", "longest-flight-route"],
    load: () =>
      import("./dag-routes").then((module) => module.dagRouteProblems),
  },
  {
    ids: [
      "exponentiation-ii",
      "fibonacci-numbers",
      "counting-divisors",
      "common-divisors",
      "binomial-coefficients",
      "creating-strings-ii",
      "distributing-apples",
    ],
    load: () =>
      import("./mathematics-advanced").then(
        (module) => module.advancedMathematicsProblems,
      ),
  },
  {
    ids: ["point-location-test", "line-segment-intersection"],
    load: () =>
      import("./geometry-primitives").then(
        (module) => module.geometryPrimitiveProblems,
      ),
  },
  {
    ids: [
      "hotel-queries",
      "list-removals",
      "prefix-sum-queries",
      "pizzeria-queries",
    ],
    load: () =>
      import("./range-wave-100").then((module) => module.wave100RangeProblems),
  },
  {
    ids: [
      "company-queries-ii",
      "distance-queries",
      "finding-a-centroid",
      "subtree-queries",
      "distinct-colors",
    ],
    load: () =>
      import("./tree-wave-100").then((module) => module.wave100TreeProblems),
  },
  {
    ids: [
      "round-trip",
      "planets-queries-i",
      "planets-and-kingdoms",
      "cycle-finding",
    ],
    load: () =>
      import("./graph-wave-100-core").then(
        (module) => module.wave100GraphCoreProblems,
      ),
  },
  {
    ids: ["flight-discount", "investigation", "high-score"],
    load: () =>
      import("./graph-wave-100-paths").then(
        (module) => module.wave100GraphPathProblems,
      ),
  },
  {
    ids: [
      "palindrome-reorder",
      "gray-code",
      "creating-strings",
      "apple-division",
      "apartments",
      "ferris-wheel",
      "restaurant-customers",
      "movie-festival",
      "towers",
      "tasks-and-deadlines",
      "reading-books",
    ],
    load: () =>
      import("./wave-200-foundations").then(
        (module) => module.wave200FoundationProblems,
      ),
  },
  {
    ids: [
      "digit-queries",
      "array-division",
      "removal-game",
      "longest-common-subsequence",
      "josephus-problem-i",
    ],
    load: () =>
      import("./wave-200-dp-search").then(
        (module) => module.wave200DpSearchProblems,
      ),
  },
  {
    ids: [
      "concert-tickets",
      "traffic-lights",
      "sum-of-three-values",
      "sum-of-four-values",
      "maximum-subarray-sum-ii",
    ],
    load: () =>
      import("./wave-200-sorting-ii").then(
        (module) => module.wave200SortingIIProblems,
      ),
  },
];

export const lazyProblemIds = families.flatMap((family) => family.ids);

export async function loadProblem(
  id: string,
): Promise<ProblemEntry | undefined> {
  const family = families.find((candidate) => candidate.ids.includes(id));
  return (await family?.load())?.find((problem) => problem.metadata.id === id);
}
