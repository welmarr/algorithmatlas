import type { Primitive, RawTraceEvent } from "@sim/domain";
import {
  mapRawTrace,
  ProtocolError,
  type EventDraft,
  type EventType,
  type SemanticMapper,
} from "@sim/semantic-events";

type BfsFamily = "grid" | "graph";
type BfsOperation =
  | "discover"
  | "visit"
  | "queue-push"
  | "queue-pop"
  | "set-distance"
  | "set-parent"
  | "mark-path";

/** Domain-aware instrumentation from the BFS loop, before event naming. */
export function recordBfs(
  target: RawTraceEvent[],
  operation: BfsOperation,
  entity: string,
  explanation: string,
  data: Record<string, Primitive> = {},
  line?: number,
): void {
  target.push({
    schemaVersion: "0.1",
    operation,
    data: { entity, explanation, ...data },
    sourceRef: line ? { file: "solution.ts", line } : undefined,
  });
}

const bfsMapper: SemanticMapper<BfsFamily> = {
  id: "bfs-v0.1",
  map(raw, family): EventDraft {
    const typeByOperation: Record<BfsOperation, EventType> = {
      discover: family === "grid" ? "DISCOVER_CELL" : "DISCOVER_NODE",
      visit: family === "grid" ? "VISIT_CELL" : "VISIT_NODE",
      "queue-push": "QUEUE_PUSH",
      "queue-pop": "QUEUE_POP",
      "set-distance": family === "grid" ? "SET_CELL_DISTANCE" : "SET_DISTANCE",
      "set-parent": "SET_PARENT",
      "mark-path": "MARK",
    };
    const type = typeByOperation[raw.operation as BfsOperation];
    if (!type)
      throw new ProtocolError(
        "INVALID_EVENT",
        `Unsupported BFS raw operation: ${raw.operation}`,
      );
    const entity = raw.data.entity;
    const explanation = raw.data.explanation;
    if (typeof entity !== "string" || typeof explanation !== "string")
      throw new ProtocolError(
        "INVALID_EVENT",
        "BFS raw operation needs entity and explanation",
      );
    const { entity: _entity, explanation: _explanation, ...payload } = raw.data;
    void _entity;
    void _explanation;
    return {
      type,
      entities: [entity],
      payload,
      explanation,
      sourceRef: raw.sourceRef,
    };
  },
};

export function mapBfsTrace(
  rawTrace: readonly RawTraceEvent[],
  family: BfsFamily,
): EventDraft[] {
  return mapRawTrace(rawTrace, bfsMapper, family);
}
