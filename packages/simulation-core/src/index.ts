import {
  emptyState,
  type Primitive,
  type SimulationSnapshot,
  type SimulationState,
  type StepFocusKind,
  type RendererKind,
  type TeachingStep,
  type VisualEntity,
} from "@sim/domain";
import {
  validateEvent,
  type AlgorithmEvent,
  type EventType,
} from "@sim/semantic-events";

export class SimulationError extends Error {
  constructor(
    public readonly code:
      "ENTITY_NOT_FOUND" | "INVALID_POSITION" | "INVALID_TRACE",
    message: string,
  ) {
    super(message);
    this.name = "SimulationError";
  }
}

export function cloneState(state: SimulationState): SimulationState {
  return {
    entities: Object.fromEntries(
      Object.entries(state.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          metadata: entity.metadata ? { ...entity.metadata } : undefined,
        },
      ]),
    ),
    variables: { ...state.variables },
    collections: Object.fromEntries(
      Object.entries(state.collections).map(([key, values]) => [
        key,
        [...values],
      ]),
    ),
    activeEntities: [...state.activeEntities],
    annotation: state.annotation,
    focus: state.focus ? { ...state.focus } : null,
  };
}

function focusKind(type: EventType): StepFocusKind {
  switch (type) {
    case "UPDATE_VALUE":
    case "CREATE_ENTITY":
    case "WRITE_INDEX":
    case "SWAP":
    case "RELAX_EDGE":
    case "SET_DISTANCE":
    case "SET_CELL_DISTANCE":
    case "SET_PARENT":
    case "SET_DEPTH":
    case "SET_SUBTREE_SIZE":
    case "DP_UPDATE":
    case "DP_TRANSITION":
    case "DP_BASE_CASE":
    case "HEAP_UPDATE":
      return "update";
    case "DISCOVER_NODE":
    case "DISCOVER_CELL":
    case "VISIT_NODE":
    case "VISIT_CELL":
    case "VISIT_TREE_NODE":
    case "ENTER_SUBTREE":
    case "EXIT_SUBTREE":
      return "explore";
    case "MARK":
    case "FUNCTION_RETURN":
      return "result";
    default:
      return "inspect";
  }
}

function requiredEntity(state: SimulationState, id: string): VisualEntity {
  const entity = state.entities[id];
  if (!entity)
    throw new SimulationError(
      "ENTITY_NOT_FOUND",
      `Entity ${id} does not exist`,
    );
  return entity;
}

function stringPayload(event: AlgorithmEvent, key: string): string | undefined {
  const value = event.payload[key];
  return typeof value === "string" ? value : undefined;
}

function sortHeap(state: SimulationState, name: string): void {
  state.collections[name]?.sort((left, right) => {
    const leftValue = state.entities[left]?.value;
    const rightValue = state.entities[right]?.value;
    const leftPriority = typeof leftValue === "number" ? leftValue : Infinity;
    const rightPriority =
      typeof rightValue === "number" ? rightValue : Infinity;
    return (
      leftPriority - rightPriority ||
      Number(state.entities[left]?.metadata?.priorityOrder ?? 0) -
        Number(state.entities[right]?.metadata?.priorityOrder ?? 0) ||
      (left < right ? -1 : left > right ? 1 : 0)
    );
  });
}

export function reduceEvent(
  previous: SimulationState,
  event: AlgorithmEvent,
): SimulationState {
  validateEvent(event);
  const state = cloneState(previous);
  const [id] = event.entities;
  for (const entityId of event.entities) {
    if (event.type !== "CREATE_ENTITY") requiredEntity(state, entityId);
  }
  state.activeEntities = [...event.entities];
  state.annotation = event.explanation;
  const value = event.payload.value;
  const variable = stringPayload(event, "variable");
  const kind =
    event.type === "ANNOTATE" && variable ? "update" : focusKind(event.type);
  let before: Primitive | undefined;
  if (kind === "update" && id && event.type !== "CREATE_ENTITY") {
    const entity = requiredEntity(state, id);
    before =
      event.type === "SET_DISTANCE" || event.type === "SET_CELL_DISTANCE"
        ? entity.metadata?.distance
        : event.type === "SET_PARENT"
          ? entity.metadata?.parent
          : event.type === "SET_DEPTH"
            ? entity.metadata?.depth
            : event.type === "SET_SUBTREE_SIZE"
              ? entity.metadata?.subtreeSize
              : entity.value;
  } else if (variable && Object.hasOwn(event.payload, "value")) {
    before = state.variables[variable];
  }
  state.focus = {
    eventId: event.eventId,
    kind,
    before,
    after: Object.hasOwn(event.payload, "value") ? value : undefined,
    variable,
  };
  if (variable && Object.hasOwn(event.payload, "value"))
    state.variables[variable] = value;

  switch (event.type) {
    case "CREATE_ENTITY": {
      if (!id) break;
      if (state.entities[id])
        throw new SimulationError(
          "INVALID_TRACE",
          `Entity ${id} already exists`,
        );
      const kind = stringPayload(event, "kind") as
        VisualEntity["kind"] | undefined;
      state.entities[id] = {
        id,
        kind: kind ?? "array",
        label: stringPayload(event, "label") ?? id,
        value,
        status: "idle",
        metadata:
          event.type === "CREATE_ENTITY"
            ? { from: event.payload.from, to: event.payload.to }
            : undefined,
      };
      break;
    }
    case "REMOVE_ENTITY":
      if (id) delete state.entities[id];
      break;
    case "UPDATE_VALUE":
    case "WRITE_INDEX":
    case "DP_UPDATE":
    case "DP_BASE_CASE":
    case "HEAP_UPDATE":
      if (id) requiredEntity(state, id).value = value;
      if (event.type === "HEAP_UPDATE")
        sortHeap(state, stringPayload(event, "collection") ?? "heap");
      break;
    case "SET_DISTANCE":
    case "SET_CELL_DISTANCE":
      if (id)
        requiredEntity(state, id).metadata = {
          ...requiredEntity(state, id).metadata,
          distance: value,
        };
      break;
    case "SET_PARENT":
      if (id)
        requiredEntity(state, id).metadata = {
          ...requiredEntity(state, id).metadata,
          parent: value,
        };
      break;
    case "SET_DEPTH":
      if (id)
        requiredEntity(state, id).metadata = {
          ...requiredEntity(state, id).metadata,
          depth: value,
        };
      break;
    case "SET_SUBTREE_SIZE":
      if (id)
        requiredEntity(state, id).metadata = {
          ...requiredEntity(state, id).metadata,
          subtreeSize: value,
        };
      break;
    case "DISCOVER_NODE":
    case "DISCOVER_CELL":
      if (id) requiredEntity(state, id).status = "discovered";
      break;
    case "VISIT_NODE":
    case "VISIT_CELL":
    case "VISIT_TREE_NODE":
      if (id) requiredEntity(state, id).status = "visited";
      break;
    case "MARK":
    case "SET_CELL_STATE":
      if (id)
        requiredEntity(state, id).status =
          (stringPayload(event, "status") as VisualEntity["status"]) ?? "path";
      break;
    case "UNMARK":
      if (id) requiredEntity(state, id).status = "idle";
      break;
    case "QUEUE_PUSH":
    case "STACK_PUSH":
    case "HEAP_INSERT": {
      const collection =
        stringPayload(event, "collection") ??
        event.type.split("_")[0].toLowerCase();
      state.collections[collection] ??= [];
      if (
        event.type === "HEAP_INSERT" &&
        typeof requiredEntity(state, id).value !== "number"
      )
        throw new SimulationError(
          "INVALID_TRACE",
          "Heap items need a numeric priority",
        );
      if (id) state.collections[collection].push(id);
      if (event.type === "HEAP_INSERT") sortHeap(state, collection);
      break;
    }
    case "QUEUE_POP":
    case "STACK_POP":
    case "HEAP_EXTRACT": {
      const collection =
        stringPayload(event, "collection") ??
        event.type.split("_")[0].toLowerCase();
      const items = state.collections[collection];
      const expected = event.type === "STACK_POP" ? items?.at(-1) : items?.[0];
      if (!items || expected !== id)
        throw new SimulationError(
          "INVALID_TRACE",
          `${event.type} must remove the current ${collection} item`,
        );
      if (event.type === "STACK_POP") items.pop();
      else items.shift();
      break;
    }
    case "SWAP": {
      const [left, right] = event.entities;
      if (left && right) {
        const old = requiredEntity(state, left).value;
        requiredEntity(state, left).value = requiredEntity(state, right).value;
        requiredEntity(state, right).value = old;
        // Slot ids stay fixed; item identity and original index travel with the value.
        const metadata = requiredEntity(state, left).metadata;
        requiredEntity(state, left).metadata = requiredEntity(
          state,
          right,
        ).metadata;
        requiredEntity(state, right).metadata = metadata;
      }
      break;
    }
    case "RELAX_EDGE":
      if (id) requiredEntity(state, id).status = "active";
      break;
    default:
      break;
  }
  return state;
}

export interface TimelineOptions {
  snapshotInterval?: number;
  speed?: number;
  metadata?: Record<string, Primitive>;
}

function immutableCopy<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(copy);
  return copy;
}

export class SimulationTimeline {
  readonly events: readonly AlgorithmEvent[];
  readonly metadata: Record<string, Primitive>;
  private readonly baseState: SimulationState;
  private readonly storedSnapshots: SimulationSnapshot[];
  private current: SimulationState;
  private cursor = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<() => void>();
  private rate: number;

  constructor(
    initialState: SimulationState = emptyState(),
    events: AlgorithmEvent[] = [],
    options: TimelineOptions = {},
  ) {
    this.baseState = cloneState(initialState);
    this.current = cloneState(initialState);
    this.events = Object.freeze(
      events.map((event) =>
        Object.freeze({
          ...validateEvent(event),
          entities: Object.freeze([...event.entities]) as unknown as string[],
          payload: Object.freeze({ ...event.payload }),
          pedagogy: event.pedagogy ? immutableCopy(event.pedagogy) : undefined,
          sourceRef: event.sourceRef
            ? Object.freeze({ ...event.sourceRef })
            : undefined,
        }),
      ),
    );
    this.metadata = Object.freeze({ ...options.metadata });
    this.rate = options.speed ?? 1;
    const interval = options.snapshotInterval ?? 100;
    if (!Number.isSafeInteger(interval) || interval < 1)
      throw new SimulationError(
        "INVALID_TRACE",
        "Snapshot interval must be positive",
      );
    this.storedSnapshots = [{ position: 0, state: cloneState(initialState) }];
    let buildState = cloneState(initialState);
    this.events.forEach((event, index) => {
      if (event.step !== index + 1)
        throw new SimulationError(
          "INVALID_TRACE",
          "Event steps must be contiguous",
        );
      buildState = reduceEvent(buildState, event);
      if ((index + 1) % interval === 0 || index === this.events.length - 1)
        this.storedSnapshots.push({
          position: index + 1,
          state: cloneState(buildState),
        });
    });
  }

  get position(): number {
    return this.cursor;
  }
  get length(): number {
    return this.events.length;
  }
  get state(): SimulationState {
    return cloneState(this.current);
  }
  get initialState(): SimulationState {
    return cloneState(this.baseState);
  }
  get snapshots(): SimulationSnapshot[] {
    return this.storedSnapshots.map((snapshot) => ({
      position: snapshot.position,
      state: cloneState(snapshot.state),
    }));
  }
  get currentEvent(): AlgorithmEvent | undefined {
    return this.events[this.cursor - 1];
  }
  get speed(): number {
    return this.rate;
  }
  get playing(): boolean {
    return this.timer !== undefined;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Read a snapshot projection without moving playback or notifying subscribers. */
  stateAt(position: number): SimulationState {
    if (
      !Number.isSafeInteger(position) ||
      position < 0 ||
      position > this.events.length
    )
      throw new SimulationError(
        "INVALID_POSITION",
        `Position ${position} is outside trace`,
      );
    const snapshot = [...this.storedSnapshots]
      .reverse()
      .find((item) => item.position <= position)!;
    let state = cloneState(snapshot.state);
    for (let index = snapshot.position; index < position; index++)
      state = reduceEvent(state, this.events[index]);
    return state;
  }
  seek(position: number): SimulationState {
    const state = this.stateAt(position);
    this.current = state;
    this.cursor = position;
    this.emit();
    return this.state;
  }
  next(): SimulationState {
    return this.seek(Math.min(this.length, this.cursor + 1));
  }
  previous(): SimulationState {
    return this.seek(Math.max(0, this.cursor - 1));
  }
  rewind(): SimulationState {
    return this.seek(0);
  }
  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0 || speed > 16)
      throw new RangeError("Speed must be within (0, 16]");
    const wasPlaying = this.playing;
    this.pause();
    this.rate = speed;
    if (wasPlaying) this.play();
    this.emit();
  }
  play(): void {
    if (this.timer || this.cursor >= this.length) return;
    this.timer = setInterval(() => {
      if (this.cursor >= this.length) this.pause();
      else this.next();
    }, 1100 / this.rate);
    this.emit();
  }
  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.emit();
  }
  dispose(): void {
    this.pause();
    this.listeners.clear();
  }
  filterEvents(type: EventType): AlgorithmEvent[] {
    return this.events.filter((event) => event.type === type);
  }
  eventsForEntity(id: string): AlgorithmEvent[] {
    return this.events.filter((event) => event.entities.includes(id));
  }
  eventsForCodeLine(file: string, line: number): AlgorithmEvent[] {
    return this.events.filter(
      (event) =>
        event.sourceRef?.file === file && event.sourceRef.line === line,
    );
  }
}

/** Build a small pedagogical sequence without discarding any technical event. */
export function createTeachingSteps(
  timeline: SimulationTimeline,
  _renderer: RendererKind,
  output: string,
): TeachingStep[] {
  const events = timeline.events;
  const positions: number[] = [];
  const increasingArray =
    timeline.metadata.teachingStrategy === "monotone-array";
  if (increasingArray) {
    const pointers = events
      .map((event, index) => ({ event, position: index + 1 }))
      .filter(({ event }) => event.type === "MOVE_POINTER");
    for (let index = 0; index < pointers.length; index++) {
      const current = pointers[index];
      if (!current.event.entities.some((id) => id.startsWith("array:")))
        continue;
      const next = pointers[index + 1]?.position ?? events.length;
      if (next > 1) positions.push(Math.min(next - 1, events.length - 1));
    }
    if (!positions.length)
      for (const event of events)
        if (event.type === "WRITE_INDEX" && event.step < events.length)
          positions.push(event.step);
  } else {
    const salient = new Set([
      "VISIT_NODE",
      "VISIT_CELL",
      "VISIT_TREE_NODE",
      "DP_UPDATE",
      "DP_BASE_CASE",
      "MARK",
      "SET_DISTANCE",
      "SET_CELL_DISTANCE",
      "SET_SUBTREE_SIZE",
      "WRITE_INDEX",
      "READ_INDEX",
      "SWAP",
      "MOVE_POINTER",
      "RELAX_EDGE",
      "HEAP_EXTRACT",
      "STACK_POP",
      "STACK_PUSH",
      "QUEUE_PUSH",
      "QUEUE_POP",
      "ANNOTATE",
      "CREATE_ENTITY",
    ]);
    for (const event of events)
      if (salient.has(event.type) && event.step < events.length)
        positions.push(event.step);
  }
  const endpoints = [...new Set(positions.filter((value) => value > 0))].sort(
    (a, b) => a - b,
  );
  if (events.length) endpoints.push(events.length);
  const saved = timeline.position;
  const initial: TeachingStep = {
    schemaVersion: "0.1",
    id: `${timeline.metadata.problemId ?? "run"}:teaching:0`,
    index: 0,
    title: "Initial state",
    summary: "Start with the supplied input and follow each meaningful change.",
    eventRange: { start: 0, end: 0 },
    primaryEventIds: [],
    visualRefs: [],
  };
  const steps = [initial];
  try {
    let previousEnd = 0;
    for (const end of endpoints) {
      if (end <= previousEnd) continue;
      const segment = events.slice(previousEnd, end);
      const write = [...segment]
        .reverse()
        .find((event) => event.type === "WRITE_INDEX");
      const primary =
        write ??
        [...segment].reverse().find((event) => event.entities.length) ??
        segment.at(-1)!;
      const beforeState = timeline.seek(previousEnd);
      const afterState = timeline.seek(end);
      const entityId = primary.entities[0];
      const before = entityId
        ? beforeState.entities[entityId]?.value
        : undefined;
      const after = entityId ? afterState.entities[entityId]?.value : undefined;
      const isFinal = end === events.length;
      let title = isFinal ? "Final result" : primary.explanation;
      let summary = isFinal
        ? `The algorithm returns ${output}.`
        : primary.explanation;
      if (increasingArray && write && !isFinal) {
        const index = write.entities[0]?.split(":")[1] ?? "?";
        const change =
          typeof before === "number" && typeof after === "number"
            ? after - before
            : undefined;
        title =
          change !== undefined && change > 0
            ? `Increase ${before} → ${after} (+${change})`
            : `Update index ${index}: ${before} → ${after}`;
        summary = `At index ${index}, change ${before} to ${after}${change !== undefined && change > 0 ? ` using ${change} increments` : ""}.`;
      } else if (increasingArray && !isFinal) {
        const pointer = segment.find((event) => event.type === "MOVE_POINTER");
        const index = pointer?.entities[0]?.split(":")[1];
        title = index ? `Keep index ${index}` : primary.explanation;
        summary = index
          ? `Index ${index} already satisfies the current requirement.`
          : primary.explanation;
      }
      const codeRefs = segment.flatMap((event) =>
        event.sourceRef ? [event.sourceRef] : [],
      );
      steps.push({
        schemaVersion: "0.1",
        id: `${timeline.metadata.problemId ?? "run"}:teaching:${steps.length}`,
        index: steps.length,
        title,
        summary,
        eventRange: { start: previousEnd + 1, end },
        primaryEventIds: [primary.eventId],
        visualRefs: [...new Set(segment.flatMap((event) => event.entities))],
        codeRefs: codeRefs.length ? codeRefs : undefined,
        cue: isFinal
          ? { kind: "result" }
          : {
              kind: focusKind(primary.type),
              entityId,
              before,
              after,
            },
      });
      previousEnd = end;
    }
  } finally {
    timeline.seek(saved);
  }
  return steps;
}

export function teachingStepAtPosition(
  steps: readonly TeachingStep[],
  eventPosition: number,
): number {
  if (!Number.isSafeInteger(eventPosition) || eventPosition < 0)
    throw new SimulationError("INVALID_POSITION", "Invalid event position");
  const index = steps.findIndex((step) => step.eventRange.end >= eventPosition);
  if (index < 0)
    throw new SimulationError(
      "INVALID_POSITION",
      "Event position is outside teaching steps",
    );
  return index;
}

export function seekTeachingStep(
  timeline: SimulationTimeline,
  steps: readonly TeachingStep[],
  index: number,
): SimulationState {
  if (!Number.isSafeInteger(index) || index < 0 || index >= steps.length)
    throw new SimulationError(
      "INVALID_POSITION",
      "Teaching step is outside run",
    );
  return timeline.seek(steps[index].eventRange.end);
}
