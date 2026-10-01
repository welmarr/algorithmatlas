import {
  emptyState,
  type Primitive,
  type SimulationSnapshot,
  type SimulationState,
  type StepFocusKind,
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
    case "WRITE_INDEX":
    case "SWAP":
    case "RELAX_EDGE":
    case "SET_DISTANCE":
    case "SET_CELL_DISTANCE":
    case "SET_PARENT":
    case "SET_DEPTH":
    case "DP_UPDATE":
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
  if (kind === "update" && id) {
    const entity = requiredEntity(state, id);
    before =
      event.type === "SET_DISTANCE" || event.type === "SET_CELL_DISTANCE"
        ? entity.metadata?.distance
        : event.type === "SET_PARENT"
          ? entity.metadata?.parent
          : event.type === "SET_DEPTH"
            ? entity.metadata?.depth
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
      const kind = stringPayload(event, "kind") as
        VisualEntity["kind"] | undefined;
      state.entities[id] = {
        id,
        kind: kind ?? "array",
        label: stringPayload(event, "label") ?? id,
        value,
        status: "idle",
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
      if (id) requiredEntity(state, id).value = value;
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
      if (id) state.collections[collection].push(id);
      break;
    }
    case "QUEUE_POP":
    case "STACK_POP":
    case "HEAP_EXTRACT": {
      const collection =
        stringPayload(event, "collection") ??
        event.type.split("_")[0].toLowerCase();
      if (event.type === "QUEUE_POP") state.collections[collection]?.shift();
      else state.collections[collection]?.pop();
      break;
    }
    case "SWAP": {
      const [left, right] = event.entities;
      if (left && right) {
        const old = requiredEntity(state, left).value;
        requiredEntity(state, left).value = requiredEntity(state, right).value;
        requiredEntity(state, right).value = old;
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
          sourceRef: event.sourceRef
            ? Object.freeze({ ...event.sourceRef })
            : undefined,
        }),
      ),
    );
    this.metadata = options.metadata ?? {};
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

  seek(position: number): SimulationState {
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
