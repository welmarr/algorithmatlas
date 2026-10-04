import type {
  PedagogyHint,
  RendererKind,
  SemanticRole,
  SimulationState,
  TeachingStep,
} from "@sim/domain";
import type { AlgorithmEvent } from "@sim/semantic-events";
import { cloneState, type SimulationTimeline } from "@sim/simulation-core";

export type Strategy =
  | "array"
  | "sorting"
  | "two-pointers"
  | "sliding-window"
  | "binary-search"
  | "bfs"
  | "dfs"
  | "shortest-path"
  | "topological-sort"
  | "tree"
  | "dp"
  | "range"
  | "fenwick"
  | "dsu"
  | "strings"
  | "backtracking"
  | "number-theory"
  | "geometry"
  | "generic";
export type Purpose =
  | "orient"
  | "focus"
  | "compare"
  | "decide"
  | "transform"
  | "confirm"
  | "settle";
export type VisualAction =
  | { type: "FOCUS"; entityId: string; role: SemanticRole; label: string }
  | { type: "SHOW_EQUATION" | "SHOW_REASON"; text: string }
  | {
      type: "SWAP" | "TRANSITION_VALUE" | "HIGHLIGHT_DEPENDENCY" | "TRACE_PATH";
      entityIds: string[];
    }
  | { type: "SHOW_RANGE"; range: NonNullable<PedagogyHint["range"]> }
  | {
      type: "SHOW_ALIGNMENT";
      alignment: NonNullable<PedagogyHint["alignment"]>;
    }
  | { type: "SHOW_FRONTIER"; collection: string; items: string[] };
export interface ChoreographyPlan {
  schemaVersion: "0.1";
  teachingStepId: string;
  strategy: Strategy;
  renderer: RendererKind;
  phases: {
    purpose: Purpose;
    durationMs: number;
    state: "before" | "after";
    actions: VisualAction[];
  }[];
  beforePosition: number;
  afterPosition: number;
  reducedMotion: { purpose: "settle"; actions: VisualAction[] };
}
export class ChoreographyError extends Error {
  constructor(
    public readonly code:
      "CHOREOGRAPHY_INVALID_PLAN" | "CHOREOGRAPHY_UNSUPPORTED_ACTION",
    message: string,
  ) {
    super(message);
  }
}
export function strategyFor(
  tags: readonly string[],
  renderer: RendererKind,
): Strategy {
  const set = new Set(tags.map((tag) => tag.toLowerCase()));
  const has = (...values: string[]) => values.some((value) => set.has(value));
  if (has("shoelace formula", "cross product", "geometry")) return "geometry";
  if (has("backtracking", "recursion")) return "backtracking";
  if (has("dijkstra", "weighted graph")) return "shortest-path";
  if (has("topological sort")) return "topological-sort";
  if (has("fenwick tree")) return "fenwick";
  if (has("disjoint set union", "dsu", "union-find")) return "dsu";
  if (has("prefix sums", "range queries")) return "range";
  if (has("kmp", "prefix function", "z-function")) return "strings";
  if (has("binary search", "monotone predicate")) return "binary-search";
  if (has("sliding window")) return "sliding-window";
  if (has("two pointers")) return "two-pointers";
  if (has("sorting", "insertion-sort")) return "sorting";
  if (renderer === "dp") return "dp";
  if (renderer === "tree") return "tree";
  if (has("dfs", "grid-dfs", "graph-dfs")) return "dfs";
  if (has("bfs", "grid-bfs", "graph-bfs")) return "bfs";
  if (has("modular arithmetic", "binary exponentiation"))
    return "number-theory";
  return renderer === "array" ? "array" : "generic";
}

const capabilities: Record<string, readonly VisualAction["type"][]> = {
  array: [
    "SWAP",
    "TRANSITION_VALUE",
    "HIGHLIGHT_DEPENDENCY",
    "SHOW_RANGE",
    "SHOW_ALIGNMENT",
  ],
  grid: ["TRACE_PATH", "SHOW_FRONTIER"],
  graph: ["TRACE_PATH", "SHOW_FRONTIER"],
  tree: ["TRACE_PATH", "SHOW_FRONTIER"],
  dp: ["TRANSITION_VALUE", "HIGHLIGHT_DEPENDENCY"],
  variables: [],
  code: [],
  queue: ["SHOW_FRONTIER"],
  stack: ["SHOW_FRONTIER"],
  heap: ["SHOW_FRONTIER"],
};
export function validatePlan(plan: ChoreographyPlan): ChoreographyPlan {
  if (
    plan.schemaVersion !== "0.1" ||
    !plan.phases.length ||
    plan.phases.at(-1)?.purpose !== "settle" ||
    !Number.isSafeInteger(plan.beforePosition) ||
    plan.beforePosition < 0 ||
    plan.afterPosition < plan.beforePosition
  )
    throw new ChoreographyError(
      "CHOREOGRAPHY_INVALID_PLAN",
      "Invalid choreography range or phases",
    );
  for (const phase of plan.phases)
    for (const action of phase.actions) {
      if (
        !["FOCUS", "SHOW_REASON", "SHOW_EQUATION"].includes(action.type) &&
        !capabilities[plan.renderer]?.includes(action.type)
      )
        throw new ChoreographyError(
          "CHOREOGRAPHY_UNSUPPORTED_ACTION",
          `${plan.renderer} does not support ${action.type}`,
        );
    }
  return plan;
}

/** Deterministic presentation derived exclusively from executed facts and snapshots. */
export function createChoreography(
  timeline: SimulationTimeline,
  renderer: RendererKind,
  tags: readonly string[],
  step?: TeachingStep,
): ChoreographyPlan {
  const end = step?.eventRange.end ?? timeline.position;
  const start = Math.max(0, (step?.eventRange.start ?? end) - 1);
  const before = timeline.stateAt(start),
    after = timeline.stateAt(end);
  const events = timeline.events.slice(start, end);
  const primary =
    events.find((event) => step?.primaryEventIds.includes(event.eventId)) ??
    events.at(-1);
  const strategy = strategyFor(tags, renderer);
  const hint = [...events].reverse().find((event) => event.pedagogy)?.pedagogy;
  const updating = [
    "WRITE_INDEX",
    "DP_UPDATE",
    "DP_BASE_CASE",
    "UPDATE_VALUE",
    "SET_DISTANCE",
    "SWAP",
  ].includes(primary?.type ?? "");
  const focus: VisualAction[] = (
    hint?.labels ??
    primary?.entities.map((entityId, index) => ({
      entityId,
      label:
        index && primary?.type === "DP_UPDATE"
          ? "Dependency"
          : updating
            ? "Changed"
            : "Current",
      role:
        index && primary?.type === "DP_UPDATE"
          ? ("dependency" as const)
          : updating
            ? ("changed" as const)
            : ("current" as const),
    })) ??
    []
  )
    .filter((item) => after.entities[item.entityId])
    .map((item) => ({ type: "FOCUS", ...item }));
  let equation = hint?.equation ?? "",
    reason =
      hint?.reason ??
      primary?.explanation ??
      "Follow the supplied input one decision at a time.";
  const changes: VisualAction[] = [];
  const write = events.find((event) => event.type === "WRITE_INDEX");
  // This profile is selected only for the curated, unedited monotone-array code.
  if (
    timeline.metadata.teachingStrategy === "monotone-array" &&
    step &&
    end < timeline.length
  ) {
    const pointer = events.find(
      (event) => event.type === "MOVE_POINTER" && event.entities.length,
    );
    const id = write?.entities[0] ?? pointer?.entities[0];
    if (id) {
      const index = Number(after.entities[id].label),
        previous = `array:${index - 1}`;
      const current = before.entities[id]?.value,
        required = before.entities[previous]?.value;
      focus.splice(
        0,
        focus.length,
        {
          type: "FOCUS",
          entityId: previous,
          label: "Previous",
          role: "comparison",
        },
        {
          type: "FOCUS",
          entityId: id,
          label: "Current",
          role: write ? "changed" : "accepted",
        },
      );
      const delta = Number(after.entities[id]?.value) - Number(current);
      equation = `${current} ${write ? "<" : "≥"} ${required}${write ? ` · ${current} → ${after.entities[id]?.value} · +${delta} · total ${after.variables.moves}` : " · +0"}`;
      reason = write
        ? "The current value is smaller than its predecessor. Only increments are allowed, so raise it just enough to keep the array nondecreasing."
        : "The current value is already at least its predecessor. Keep it unchanged.";
    }
  }
  for (const event of events) {
    if (event.type === "SWAP")
      changes.push({ type: "SWAP", entityIds: event.entities });
    if (["WRITE_INDEX", "DP_UPDATE", "DP_BASE_CASE"].includes(event.type)) {
      changes.push({
        type: "TRANSITION_VALUE",
        entityIds: event.entities.slice(0, 1),
      });
      if (!equation)
        equation = event.entities
          .map((id, i) => {
            const entity = after.entities[id];
            const label =
              entity?.kind === "array"
                ? `Index ${entity.label}`
                : entity?.kind === "dp"
                  ? `dp[${entity.label}]`
                  : (entity?.label ?? "Value");
            return i
              ? `${label}=${before.entities[id]?.value}`
              : `${label}: ${before.entities[id]?.value} → ${entity?.value}`;
          })
          .join(" · ");
    }
    if (event.type === "DP_UPDATE" && event.entities.length > 1)
      changes.push({ type: "HIGHLIGHT_DEPENDENCY", entityIds: event.entities });
  }
  const relations: VisualAction[] = [];
  if (hint?.range) relations.push({ type: "SHOW_RANGE", range: hint.range });
  if (hint?.alignment)
    relations.push({ type: "SHOW_ALIGNMENT", alignment: hint.alignment });
  if (
    ["bfs", "dfs", "shortest-path", "topological-sort", "tree"].includes(
      strategy,
    )
  ) {
    for (const [collection, items] of Object.entries(after.collections))
      relations.push({ type: "SHOW_FRONTIER", collection, items });
  }
  const explanations: VisualAction[] = [{ type: "SHOW_REASON", text: reason }];
  if (equation) explanations.unshift({ type: "SHOW_EQUATION", text: equation });
  const actions = [...focus, ...relations, ...explanations];
  if (strategy === "shortest-path") {
    for (const action of actions)
      if (action.type === "FOCUS" && action.entityId.startsWith("heap:item:")) {
        const id = action.entityId.replace("heap:item:", "graph:node:");
        if (after.entities[id]) {
          action.entityId = id;
          action.label =
            primary?.type === "HEAP_EXTRACT" ? "Minimum" : "Priority";
        }
      }
  }
  const initial = end === 0;
  // Algorithms use only meaningful phases; e.g. a traversal has no invented comparison.
  const purposes: Purpose[] = initial
    ? ["orient", "settle"]
    : [
        "focus",
        ...(equation ? ["compare" as const] : []),
        "decide",
        ...(changes.length ? ["transform" as const] : []),
        "confirm",
        "settle",
      ];
  return validatePlan({
    schemaVersion: "0.1",
    teachingStepId: step?.id ?? primary?.eventId ?? "initial",
    strategy,
    renderer,
    beforePosition: start,
    afterPosition: end,
    phases: purposes.map((purpose) => ({
      purpose,
      durationMs: purpose === "compare" || purpose === "decide" ? 500 : 300,
      state: ["orient", "focus", "compare", "decide"].includes(purpose)
        ? "before"
        : "after",
      actions: [...actions, ...(purpose === "transform" ? changes : [])],
    })),
    reducedMotion: { purpose: "settle", actions },
  });
}

/** Applies focus only to a copy; canonical values/status/collections never change. */
export function presentationState(
  canonical: SimulationState,
  plan: ChoreographyPlan,
): SimulationState {
  const state = cloneState(canonical);
  const focus = plan.reducedMotion.actions.filter(
    (action) => action.type === "FOCUS",
  );
  if (focus.length)
    state.activeEntities = [
      ...new Set([
        ...focus.map((action) => action.entityId),
        ...state.activeEntities,
      ]),
    ];
  return state;
}
export type { AlgorithmEvent };
