import {
  emptyState,
  type RawTraceEvent,
  type RendererKind,
  type SimulationState,
  type TeachingStep,
} from "@sim/domain";
import {
  createEvents,
  validateRawTraceEvent,
  type AlgorithmEvent,
  type EventDraft,
} from "@sim/semantic-events";
import { createTeachingSteps, SimulationTimeline } from "@sim/simulation-core";

export type InferenceOrigin =
  "runtime-observation" | "deterministic-pattern" | "fallback";
export interface Inference {
  eventId: string;
  rawIndex: number;
  origin: InferenceOrigin;
  confidence: number;
  reason: string;
}
export interface PythonInterpretation {
  rawTrace: readonly RawTraceEvent[];
  initialState: SimulationState;
  renderer: RendererKind;
  events: AlgorithmEvent[];
  inferences: Inference[];
  teachingSteps: TeachingStep[];
  timeline: SimulationTimeline;
}
export interface PythonTraceInput {
  source: string;
  input: unknown;
  output: unknown;
  rawTrace: readonly RawTraceEvent[];
  runId?: string;
}

type Fact = {
  draft: EventDraft;
  rawIndex: number;
  origin: InferenceOrigin;
  confidence: number;
  reason: string;
};
type GraphEdge = { from: string; to: string; weight: number; index: number };
type GraphContext = { nodes: string[]; edges: GraphEdge[] };
const nodeLabel = /^[A-Za-z0-9_-]{1,12}$/;
const reserved = new Set(["__proto__", "constructor", "prototype"]);

function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function integerArray(value: unknown): number[] | undefined {
  return Array.isArray(value) &&
    value.length <= 64 &&
    value.every(finiteInteger)
    ? (value as number[])
    : undefined;
}

function graphContext(input: unknown): GraphContext | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const data = input as Record<string, unknown>;
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return;
  if (
    data.nodes.length === 0 ||
    data.nodes.length > 32 ||
    data.edges.length > 128
  )
    return;
  const nodes = data.nodes.map(String);
  if (
    nodes.some((node) => !nodeLabel.test(node)) ||
    new Set(nodes).size !== nodes.length
  )
    return;
  const edges: GraphEdge[] = [];
  for (const [index, edge] of data.edges.entries()) {
    if (!Array.isArray(edge) || edge.length !== 3) return;
    const [from, to, weight] = edge;
    if (
      !nodes.includes(String(from)) ||
      !nodes.includes(String(to)) ||
      !finiteInteger(weight) ||
      weight < 0
    )
      return;
    edges.push({ from: String(from), to: String(to), weight, index });
  }
  return { nodes, edges };
}

function parseChanges(raw: RawTraceEvent): Record<string, unknown> | undefined {
  if (raw.operation !== "line" && raw.operation !== "return") return;
  if (typeof raw.data.changes !== "string" || raw.data.changes.length > 512)
    return;
  try {
    const encoded = JSON.parse(raw.data.changes);
    if (!encoded || typeof encoded !== "object" || Array.isArray(encoded))
      return;
    const changes: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(encoded)) {
      if (
        reserved.has(name) ||
        name === "_truncated" ||
        typeof value !== "string"
      )
        continue;
      try {
        changes[name] = JSON.parse(value);
      } catch {
        // A bounded type label is useful for raw inspection but has no semantic value.
      }
    }
    return changes;
  } catch {
    return;
  }
}

function initialDistance(
  rawTrace: readonly RawTraceEvent[],
  expectedLength: number,
): number[] | undefined {
  for (const raw of rawTrace) {
    const values = integerArray(parseChanges(raw)?.dist);
    if (
      values &&
      values.length === expectedLength &&
      values.every((value) => value >= 0)
    )
      return values;
  }
}

function sourceAt(sourceLines: string[], line: number | undefined): string {
  return line && line >= 1 ? (sourceLines[line - 1] ?? "") : "";
}

function edgeRelaxation(
  graph: GraphContext,
  sourceLine: string,
  context: Record<string, unknown>,
  oldDistances: number[],
  newDistances: number[],
  targetIndex: number,
): GraphEdge | undefined {
  const u = context.u;
  const v = context.v;
  if (!finiteInteger(u) || !finiteInteger(v) || v !== targetIndex) return;
  const assignment = sourceLine.match(
    /^\s*dist\s*\[\s*(v|\d+)\s*\]\s*=\s*dist\s*\[\s*u\s*\]\s*\+/,
  );
  if (
    !assignment ||
    (assignment[1] !== "v" && Number(assignment[1]) !== targetIndex)
  )
    return;
  if (u < 0 || u >= graph.nodes.length || graph.nodes[u] !== String(u)) return;
  if (v < 0 || v >= graph.nodes.length || graph.nodes[v] !== String(v)) return;
  if (newDistances[targetIndex] >= oldDistances[targetIndex]) return;
  return graph.edges.find(
    (edge) =>
      edge.from === String(u) &&
      edge.to === String(v) &&
      oldDistances[u] + edge.weight === newDistances[targetIndex],
  );
}

export function interpretPythonTrace(
  request: PythonTraceInput,
): PythonInterpretation {
  if (
    typeof request.source !== "string" ||
    !Array.isArray(request.rawTrace) ||
    request.rawTrace.length > 800
  ) {
    throw new TypeError("Invalid Python trace input");
  }
  const rawTrace = request.rawTrace.map(validateRawTraceEvent);
  const sourceLines = request.source.split(/\r?\n/);
  const input =
    request.input &&
    typeof request.input === "object" &&
    !Array.isArray(request.input)
      ? (request.input as Record<string, unknown>)
      : {};
  const originalValues = integerArray(input.values);
  const graph = originalValues ? undefined : graphContext(input);
  const renderer: RendererKind = originalValues
    ? "array"
    : graph
      ? "graph"
      : "variables";
  const initialState = emptyState();
  let currentValues = originalValues ? [...originalValues] : undefined;
  let currentDistances = graph
    ? initialDistance(rawTrace, graph.nodes.length)
    : undefined;
  originalValues?.forEach((value, index) => {
    const id = `array:${index}`;
    initialState.entities[id] = {
      id,
      kind: "array",
      label: String(index),
      value,
      status: "idle",
    };
  });
  graph?.nodes.forEach((node, index) => {
    const id = `graph:node:${node}`;
    initialState.entities[id] = {
      id,
      kind: "graph-node",
      label: node,
      status: "idle",
      metadata: currentDistances
        ? { distance: currentDistances[index] }
        : undefined,
    };
  });
  graph?.edges.forEach((edge) => {
    const id = `graph:edge:${edge.index}`;
    initialState.entities[id] = {
      id,
      kind: "graph-edge",
      label: `${edge.from}→${edge.to}`,
      status: "idle",
      metadata: {
        from: edge.from,
        to: edge.to,
        weight: edge.weight,
        directed: true,
      },
    };
  });

  const facts: Fact[] = [];
  const context: Record<string, unknown> = {};
  const push = (
    draft: EventDraft,
    rawIndex: number,
    origin: InferenceOrigin,
    confidence: number,
    reason: string,
  ) => {
    facts.push({ draft, rawIndex, origin, confidence, reason });
  };
  for (const [rawIndex, raw] of rawTrace.entries()) {
    const changes = parseChanges(raw);
    const hadData = Object.hasOwn(context, "data");
    const preceding = rawTrace[rawIndex - 1];
    const statementRef =
      preceding?.sourceRef?.file === raw.sourceRef?.file
        ? preceding.sourceRef
        : raw.sourceRef;
    let produced = false;
    if (changes) {
      Object.assign(context, changes);
      const candidate =
        integerArray(changes.values) ??
        (changes.data &&
        typeof changes.data === "object" &&
        !Array.isArray(changes.data)
          ? integerArray((changes.data as Record<string, unknown>).values)
          : undefined);
      if (
        currentValues &&
        candidate &&
        candidate.length === currentValues.length
      ) {
        for (let index = 0; index < candidate.length; index++) {
          if (candidate[index] === currentValues[index]) continue;
          push(
            {
              type: "WRITE_INDEX",
              entities: [`array:${index}`],
              payload: { value: candidate[index] },
              explanation: `Index ${index} changes from ${currentValues[index]} to ${candidate[index]}.`,
              sourceRef: statementRef,
            },
            rawIndex,
            "runtime-observation",
            1,
            "The recorded array value changed at this index.",
          );
          produced = true;
        }
        currentValues = [...candidate];
      }
      const distances = integerArray(changes.dist);
      if (
        graph &&
        currentDistances &&
        distances &&
        distances.length === graph.nodes.length &&
        distances.every((value) => value >= 0)
      ) {
        for (let index = 0; index < distances.length; index++) {
          const old = currentDistances[index];
          const value = distances[index];
          if (value === old) continue;
          const line = sourceAt(sourceLines, statementRef?.line);
          const edge = edgeRelaxation(
            graph,
            line,
            context,
            currentDistances,
            distances,
            index,
          );
          if (edge) {
            push(
              {
                type: "RELAX_EDGE",
                entities: [`graph:edge:${edge.index}`],
                payload: { value },
                explanation: `Edge ${edge.from}→${edge.to} improves distance ${old} to ${value}.`,
                sourceRef: statementRef,
              },
              rawIndex,
              "deterministic-pattern",
              0.98,
              "Assignment, endpoints, edge weight, and distance arithmetic agree.",
            );
          }
          push(
            {
              type: "SET_DISTANCE",
              entities: [`graph:node:${graph.nodes[index]}`],
              payload: { value },
              explanation: `Distance for ${graph.nodes[index]} changes from ${old} to ${value}.`,
              sourceRef: statementRef,
            },
            rawIndex,
            "runtime-observation",
            1,
            "The recorded distance entry changed.",
          );
          produced = true;
        }
        currentDistances = [...distances];
      }
      for (const [name, value] of Object.entries(changes)) {
        if (
          name === "data" ||
          name === "values" ||
          name === "dist" ||
          reserved.has(name)
        )
          continue;
        if (typeof value !== "number" && typeof value !== "boolean") continue;
        if (typeof value === "number" && !Number.isFinite(value)) continue;
        push(
          {
            type: "UPDATE_VALUE",
            entities: [],
            payload: { variable: name, value },
            explanation: `${name} is now ${value}.`,
            sourceRef: raw.sourceRef,
          },
          rawIndex,
          "runtime-observation",
          1,
          "A scalar local variable changed; no algorithm role is assumed.",
        );
        produced = true;
      }
    }
    const unknownChange =
      !changes ||
      Object.keys(changes).some(
        (name) =>
          !["data", "values", "dist"].includes(name) &&
          typeof changes[name] !== "number" &&
          typeof changes[name] !== "boolean",
      ) ||
      Boolean(
        hadData && changes && Object.hasOwn(changes, "data") && !currentValues,
      );
    if (!produced && unknownChange) {
      push(
        {
          type: "ANNOTATE",
          entities: [],
          payload: {},
          explanation: `Executed source line ${raw.sourceRef?.line ?? raw.data.line ?? "?"}; semantic role is unknown.`,
          sourceRef: raw.sourceRef,
        },
        rawIndex,
        "fallback",
        0,
        "The available trace does not justify an algorithm-level event.",
      );
    }
    if (rawIndex === rawTrace.length - 1 && raw.operation === "return") {
      push(
        {
          type: "ANNOTATE",
          entities: [],
          payload: {},
          explanation: "The program returned its result.",
          sourceRef: raw.sourceRef,
        },
        rawIndex,
        "runtime-observation",
        1,
        "The final Python return was observed.",
      );
    }
  }
  if (!facts.length && rawTrace.length) {
    const last = rawTrace.at(-1)!;
    push(
      {
        type: "ANNOTATE",
        entities: [],
        payload: {},
        explanation: "Execution recorded without an inferred algorithm action.",
        sourceRef: last.sourceRef,
      },
      rawTrace.length - 1,
      "fallback",
      0,
      "No raw event justified a higher-level action.",
    );
  }
  const events = createEvents(
    facts.map((fact) => fact.draft),
    request.runId ?? "python-local",
  );
  const inferences = facts.map((fact, index) => ({
    eventId: events[index].eventId,
    rawIndex: fact.rawIndex,
    origin: fact.origin,
    confidence: fact.confidence,
    reason: fact.reason,
  }));
  const timeline = new SimulationTimeline(initialState, events, {
    metadata: { problemId: "python-local" },
  });
  const output = JSON.stringify(request.output)?.slice(0, 200) ?? "undefined";
  const teachingSteps = createTeachingSteps(timeline, renderer, output);
  return {
    rawTrace,
    initialState,
    renderer,
    events,
    inferences,
    teachingSteps,
    timeline,
  };
}
