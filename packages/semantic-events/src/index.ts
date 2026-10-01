import type { Primitive, SourceRef } from "@sim/domain";

export const EVENT_TYPES = [
  "SELECT",
  "COMPARE",
  "UPDATE_VALUE",
  "CREATE_ENTITY",
  "REMOVE_ENTITY",
  "MARK",
  "UNMARK",
  "ANNOTATE",
  "READ_INDEX",
  "WRITE_INDEX",
  "SWAP",
  "MOVE_POINTER",
  "VISIT_NODE",
  "DISCOVER_NODE",
  "VISIT_EDGE",
  "RELAX_EDGE",
  "SET_DISTANCE",
  "SET_PARENT",
  "QUEUE_PUSH",
  "QUEUE_POP",
  "QUEUE_PEEK",
  "STACK_PUSH",
  "STACK_POP",
  "STACK_PEEK",
  "HEAP_INSERT",
  "HEAP_EXTRACT",
  "HEAP_UPDATE",
  "VISIT_CELL",
  "DISCOVER_CELL",
  "SET_CELL_STATE",
  "SET_CELL_DISTANCE",
  "DP_READ",
  "DP_UPDATE",
  "DP_TRANSITION",
  "DP_BASE_CASE",
  "SET_SEARCH_RANGE",
  "SET_MIDPOINT",
  "DISCARD_RANGE",
  "VISIT_TREE_NODE",
  "ENTER_SUBTREE",
  "EXIT_SUBTREE",
  "SET_DEPTH",
  "FUNCTION_CALL",
  "FUNCTION_RETURN",
  "BACKTRACK",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface AlgorithmEvent {
  schemaVersion: "0.1";
  eventId: string;
  step: number;
  type: EventType;
  entities: string[];
  payload: Record<string, Primitive>;
  explanation: string;
  sourceRef?: SourceRef;
}

export type EventDraft = Omit<
  AlgorithmEvent,
  "schemaVersion" | "eventId" | "step"
>;
const eventTypeSet = new Set<string>(EVENT_TYPES);
const entityPattern =
  /^(array:\d+|grid:\d+:\d+|graph:node:[A-Za-z0-9_-]+|graph:edge:[A-Za-z0-9_-]+|tree:node:[A-Za-z0-9_-]+|dp:\d+(?::\d+)?|queue:item:[A-Za-z0-9_-]+|stack:item:[A-Za-z0-9_-]+|heap:item:[A-Za-z0-9_-]+)$/;

export class ProtocolError extends Error {
  constructor(
    public readonly code:
      "UNKNOWN_EVENT_TYPE" | "INVALID_EVENT" | "INVALID_ENTITY",
    message: string,
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}

export function isEntityId(id: string): boolean {
  return entityPattern.test(id);
}

export function validateEvent(input: unknown): AlgorithmEvent {
  if (!input || typeof input !== "object")
    throw new ProtocolError("INVALID_EVENT", "Event must be an object");
  const event = input as Partial<AlgorithmEvent>;
  if (
    event.schemaVersion !== "0.1" ||
    typeof event.eventId !== "string" ||
    !Number.isSafeInteger(event.step) ||
    (event.step ?? -1) < 1 ||
    !Array.isArray(event.entities) ||
    typeof event.explanation !== "string" ||
    !event.payload ||
    typeof event.payload !== "object" ||
    Array.isArray(event.payload)
  ) {
    throw new ProtocolError(
      "INVALID_EVENT",
      "Event header or payload is invalid",
    );
  }
  if (!eventTypeSet.has(event.type ?? ""))
    throw new ProtocolError(
      "UNKNOWN_EVENT_TYPE",
      `Unsupported event: ${event.type}`,
    );
  if (!event.entities.every((id) => typeof id === "string" && isEntityId(id)))
    throw new ProtocolError("INVALID_ENTITY", "Invalid entity identifier");
  if (
    !Object.values(event.payload).every(
      (value) =>
        value === null ||
        (typeof value === "number"
          ? Number.isFinite(value)
          : ["string", "boolean"].includes(typeof value)),
    )
  )
    throw new ProtocolError(
      "INVALID_EVENT",
      "Payload values must be finite primitives",
    );
  if (
    Object.keys(event.payload).some((key) =>
      ["__proto__", "constructor", "prototype"].includes(key),
    )
  )
    throw new ProtocolError("INVALID_EVENT", "Reserved payload key");
  if (
    typeof event.payload.variable === "string" &&
    ["__proto__", "constructor", "prototype"].includes(event.payload.variable)
  )
    throw new ProtocolError("INVALID_EVENT", "Reserved variable name");
  if (
    typeof event.payload.collection === "string" &&
    ["__proto__", "constructor", "prototype"].includes(event.payload.collection)
  )
    throw new ProtocolError("INVALID_EVENT", "Reserved collection name");
  if (
    event.sourceRef &&
    (typeof event.sourceRef.file !== "string" ||
      !Number.isSafeInteger(event.sourceRef.line) ||
      event.sourceRef.line < 1)
  )
    throw new ProtocolError("INVALID_EVENT", "Invalid source reference");
  return event as AlgorithmEvent;
}

export function createEvents(
  drafts: EventDraft[],
  runId: string,
): AlgorithmEvent[] {
  return drafts.map((draft, index) =>
    validateEvent({
      ...draft,
      schemaVersion: "0.1",
      eventId: `${runId}:${index + 1}`,
      step: index + 1,
    }),
  );
}
