import type {
  PedagogyHint,
  Primitive,
  RawTraceEvent,
  SourceRef,
} from "@sim/domain";

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
  "SET_SUBTREE_SIZE",
  "FUNCTION_CALL",
  "FUNCTION_RETURN",
  "BACKTRACK",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventMaturity =
  "ACTIVE" | "EXPERIMENTAL" | "RESERVED" | "DEPRECATED" | "REMOVE";
const activeEvents = new Set<EventType>([
  "ANNOTATE",
  "COMPARE",
  "CREATE_ENTITY",
  "DISCOVER_CELL",
  "DISCOVER_NODE",
  "DP_BASE_CASE",
  "DP_READ",
  "DP_UPDATE",
  "FUNCTION_RETURN",
  "MARK",
  "MOVE_POINTER",
  "QUEUE_POP",
  "QUEUE_PUSH",
  "RELAX_EDGE",
  "READ_INDEX",
  "SET_CELL_DISTANCE",
  "SET_DEPTH",
  "SET_SUBTREE_SIZE",
  "SET_DISTANCE",
  "SET_PARENT",
  "UPDATE_VALUE",
  "UNMARK",
  "VISIT_CELL",
  "VISIT_NODE",
  "VISIT_TREE_NODE",
  "WRITE_INDEX",
]);
const experimentalEvents = new Set<EventType>([
  "DP_TRANSITION",
  "HEAP_EXTRACT",
  "HEAP_INSERT",
  "HEAP_UPDATE",
  "QUEUE_PEEK",
  "SET_CELL_STATE",
  "STACK_PEEK",
  "STACK_POP",
  "STACK_PUSH",
  "SWAP",
]);
export const EVENT_GOVERNANCE: Readonly<Record<EventType, EventMaturity>> =
  Object.freeze(
    Object.fromEntries(
      EVENT_TYPES.map((type) => [
        type,
        activeEvents.has(type)
          ? "ACTIVE"
          : experimentalEvents.has(type)
            ? "EXPERIMENTAL"
            : "RESERVED",
      ]),
    ) as Record<EventType, EventMaturity>,
  );

export interface AlgorithmEvent {
  schemaVersion: "0.1";
  eventId: string;
  step: number;
  type: EventType;
  entities: string[];
  payload: Record<string, Primitive>;
  explanation: string;
  sourceRef?: SourceRef;
  pedagogy?: PedagogyHint;
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
      | "UNKNOWN_EVENT_TYPE"
      | "INVALID_EVENT"
      | "INVALID_ENTITY"
      | "RESERVED_EVENT",
    message: string,
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}

export function isEntityId(id: string): boolean {
  return entityPattern.test(id);
}

type PayloadRule = (value: Primitive) => boolean;
interface EventSchema {
  entities: number | { min: number; max: number };
  prefix?: string;
  required?: Record<string, PayloadRule>;
  optional?: Record<string, PayloadRule>;
}
const numeric: PayloadRule = (value) =>
  typeof value === "number" && Number.isFinite(value);
const integer: PayloadRule = (value) =>
  numeric(value) && Number.isSafeInteger(value);
const nonnegative: PayloadRule = (value) =>
  integer(value) && (value as number) >= 0;
const identifier: PayloadRule = (value) =>
  typeof value === "string" &&
  /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u.test(value);
const nodeLabel: PayloadRule = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,12}$/.test(value);
const status: PayloadRule = (value) =>
  typeof value === "string" &&
  ["idle", "active", "discovered", "visited", "path", "blocked"].includes(
    value,
  );
const scalar: PayloadRule = (value) =>
  typeof value === "number" || typeof value === "boolean";
const one = (prefix?: string): EventSchema => ({ entities: 1, prefix });
const eventSchemas: Partial<Record<EventType, EventSchema>> = {
  ANNOTATE: { entities: 0, optional: { variable: identifier, value: scalar } },
  CREATE_ENTITY: {
    ...one("graph:edge:"),
    required: {
      kind: (value) => value === "graph-edge",
      label: (value) =>
        typeof value === "string" && value.length > 0 && value.length <= 32,
      from: nodeLabel,
      to: nodeLabel,
    },
  },
  COMPARE: {
    entities: 0,
    required: { taken: (value) => typeof value === "boolean" },
  },
  DISCOVER_CELL: one("grid:"),
  DISCOVER_NODE: one("graph:node:"),
  DP_BASE_CASE: { ...one("dp:"), required: { value: numeric } },
  DP_READ: {
    ...one("dp:"),
    required: { variable: identifier, value: numeric },
  },
  DP_UPDATE: {
    entities: { min: 1, max: 8 },
    prefix: "dp:",
    required: { value: numeric },
    optional: { variable: identifier },
  },
  DP_TRANSITION: {
    entities: { min: 2, max: 8 },
    prefix: "dp:",
    required: { value: numeric },
  },
  FUNCTION_RETURN: { entities: 0, required: { value: scalar } },
  MARK: { ...one(), required: { status } },
  MOVE_POINTER: {
    entities: { min: 0, max: 1 },
    prefix: "array:",
    required: { variable: identifier, value: integer },
  },
  QUEUE_POP: { ...one(), optional: { collection: identifier } },
  QUEUE_PUSH: { ...one(), optional: { collection: identifier } },
  QUEUE_PEEK: { ...one("queue:item:"), optional: { collection: identifier } },
  STACK_PUSH: { ...one("stack:item:"), optional: { collection: identifier } },
  STACK_POP: { ...one("stack:item:"), optional: { collection: identifier } },
  STACK_PEEK: { ...one("stack:item:"), optional: { collection: identifier } },
  HEAP_INSERT: { ...one("heap:item:"), optional: { collection: identifier } },
  HEAP_EXTRACT: { ...one("heap:item:"), optional: { collection: identifier } },
  HEAP_UPDATE: {
    ...one("heap:item:"),
    required: { value: numeric },
    optional: { collection: identifier },
  },
  READ_INDEX: { ...one("array:"), required: { value: numeric } },
  RELAX_EDGE: { ...one("graph:edge:"), required: { value: nonnegative } },
  SET_CELL_DISTANCE: { ...one("grid:"), required: { value: nonnegative } },
  SET_CELL_STATE: { ...one("grid:"), required: { status } },
  SET_DEPTH: { ...one("tree:node:"), required: { value: nonnegative } },
  SET_SUBTREE_SIZE: { ...one("tree:node:"), required: { value: nonnegative } },
  SET_DISTANCE: { ...one("graph:node:"), required: { value: nonnegative } },
  SET_PARENT: { ...one("graph:node:"), required: { value: nodeLabel } },
  SWAP: { entities: 2, prefix: "array:" },
  UNMARK: one(),
  UPDATE_VALUE: {
    entities: 0,
    required: { variable: identifier, value: scalar },
  },
  VISIT_CELL: one("grid:"),
  VISIT_NODE: one("graph:node:"),
  VISIT_TREE_NODE: one("tree:node:"),
  WRITE_INDEX: { ...one("array:"), required: { value: integer } },
};

function validatePayload(event: AlgorithmEvent): void {
  const schema = eventSchemas[event.type];
  if (
    !schema ||
    !["ACTIVE", "EXPERIMENTAL"].includes(EVENT_GOVERNANCE[event.type])
  )
    throw new ProtocolError(
      "RESERVED_EVENT",
      `Event ${event.type} is reserved and has no supported producer`,
    );
  const countValid =
    typeof schema.entities === "number"
      ? event.entities.length === schema.entities
      : event.entities.length >= schema.entities.min &&
        event.entities.length <= schema.entities.max;
  if (!countValid)
    throw new ProtocolError(
      "INVALID_EVENT",
      `Event ${event.type} has invalid entity count`,
    );
  if (
    schema.prefix &&
    event.entities.some((id) => !id.startsWith(schema.prefix!))
  )
    throw new ProtocolError(
      "INVALID_ENTITY",
      `Event ${event.type} has invalid entity kind`,
    );
  if (new Set(event.entities).size !== event.entities.length)
    throw new ProtocolError("INVALID_ENTITY", "Duplicate entity identifiers");
  for (const [key, rule] of Object.entries(schema.required ?? {}))
    if (!Object.hasOwn(event.payload, key) || !rule(event.payload[key]))
      throw new ProtocolError(
        "INVALID_EVENT",
        `${event.type} requires valid ${key}`,
      );
  for (const [key, value] of Object.entries(event.payload)) {
    const rule = schema.required?.[key] ?? schema.optional?.[key];
    if (!rule || !rule(value))
      throw new ProtocolError(
        "INVALID_EVENT",
        `${event.type} has invalid ${key}`,
      );
  }
}

export interface SemanticMapper<Context = undefined> {
  id: string;
  map(raw: RawTraceEvent, context: Context): EventDraft | readonly EventDraft[];
}

export function validateRawTraceEvent(raw: unknown): RawTraceEvent {
  if (!raw || typeof raw !== "object")
    throw new ProtocolError(
      "INVALID_EVENT",
      "Raw trace operation must be an object",
    );
  const event = raw as Partial<RawTraceEvent>;
  if (
    event.schemaVersion !== "0.1" ||
    typeof event.operation !== "string" ||
    !/^[a-z][a-z-]*$/.test(event.operation) ||
    !event.data ||
    typeof event.data !== "object" ||
    Array.isArray(event.data) ||
    Object.entries(event.data).some(
      ([key, value]) =>
        ["__proto__", "constructor", "prototype"].includes(key) ||
        !(
          value === null ||
          typeof value === "string" ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value))
        ),
    )
  )
    throw new ProtocolError("INVALID_EVENT", "Invalid raw trace operation");
  if (
    event.sourceRef &&
    (typeof event.sourceRef.file !== "string" ||
      !Number.isSafeInteger(event.sourceRef.line) ||
      event.sourceRef.line < 1)
  )
    throw new ProtocolError("INVALID_EVENT", "Invalid raw source reference");
  return event as RawTraceEvent;
}

export function mapRawTrace<Context>(
  rawTrace: readonly RawTraceEvent[],
  mapper: SemanticMapper<Context>,
  context: Context,
): EventDraft[] {
  if (!mapper.id || typeof mapper.map !== "function")
    throw new ProtocolError("INVALID_EVENT", "Invalid semantic mapper");
  return rawTrace.flatMap((raw) => {
    const mapped = mapper.map(validateRawTraceEvent(raw), context);
    return Array.isArray(mapped) ? [...mapped] : [mapped as EventDraft];
  });
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
  if (event.pedagogy) {
    const hint = event.pedagogy;
    const text = (value: unknown) =>
      value === undefined ||
      (typeof value === "string" && value.length <= 1024);
    if (
      hint.schemaVersion !== "0.1" ||
      !text(hint.equation) ||
      !text(hint.reason) ||
      (hint.labels &&
        (!Array.isArray(hint.labels) ||
          hint.labels.length > 64 ||
          hint.labels.some(
            (label) =>
              !isEntityId(label.entityId) ||
              !text(label.label) ||
              ![
                "current",
                "comparison",
                "changed",
                "dependency",
                "accepted",
                "rejected",
                "path",
              ].includes(label.role),
          ))) ||
      (hint.range &&
        (!text(hint.range.label) ||
          [
            hint.range.low,
            hint.range.high,
            hint.range.mid,
            hint.range.previousLow,
            hint.range.previousHigh,
          ].some((value) => value !== undefined && !Number.isFinite(value)))) ||
      (hint.alignment &&
        (!text(hint.alignment.text) ||
          !text(hint.alignment.pattern) ||
          !Number.isSafeInteger(hint.alignment.offset) ||
          !Number.isSafeInteger(hint.alignment.matched)))
    )
      throw new ProtocolError("INVALID_EVENT", "Invalid pedagogy facts");
  }
  validatePayload(event as AlgorithmEvent);
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
