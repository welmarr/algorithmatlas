import type {
  ProblemMetadata,
  RawTraceEvent,
  SimulationState,
  TeachingStep,
} from "@sim/domain";
import {
  createEvents,
  type AlgorithmEvent,
  type EventDraft,
} from "@sim/semantic-events";
import { createTeachingSteps, SimulationTimeline } from "@sim/simulation-core";

export class InputError extends Error {
  readonly code = "INVALID_INPUT";
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export interface TraceResult {
  initialState: SimulationState;
  rawTrace?: RawTraceEvent[];
  events: EventDraft[];
  output: string;
}
export interface ProblemDefinition<T> {
  metadata: ProblemMetadata;
  defaultInput: T;
  source: string;
  parseInput(raw: unknown): T;
  trace(input: T): TraceResult;
}

export function defineProblem<T>(
  definition: ProblemDefinition<T>,
): ProblemDefinition<T> {
  return definition;
}

export interface ProblemRun {
  timeline: SimulationTimeline;
  rawTrace: RawTraceEvent[];
  events: AlgorithmEvent[];
  teachingSteps: TeachingStep[];
  output: string;
  input: unknown;
}
export function runProblem<T>(
  problem: ProblemDefinition<T>,
  raw: unknown,
): ProblemRun {
  const input = problem.parseInput(raw);
  const trace = problem.trace(input);
  const events = createEvents(trace.events, `${problem.metadata.id}:v0.1`);
  const timeline = new SimulationTimeline(trace.initialState, events, {
    metadata: { problemId: problem.metadata.id, algorithmVersion: "0.1" },
  });
  return {
    timeline,
    rawTrace: trace.rawTrace ?? [],
    events,
    teachingSteps: createTeachingSteps(
      timeline,
      problem.metadata.renderer,
      trace.output,
    ),
    output: trace.output,
    input,
  };
}

export function readObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new InputError("Input must be a JSON object");
  return raw as Record<string, unknown>;
}
export function integer(
  value: unknown,
  label: string,
  min = 0,
  max = 10000,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    throw new InputError(`${label} must be an integer from ${min} to ${max}`);
  return value as number;
}
