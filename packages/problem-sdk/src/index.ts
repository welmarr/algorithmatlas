import type {
  ProblemMetadata,
  RawTraceEvent,
  RendererKind,
  SimulationState,
  TeachingStep,
} from "@sim/domain";
import { BUILT_IN_RENDERER_KINDS } from "@sim/domain";
import {
  createEvents,
  type AlgorithmEvent,
  type EventDraft,
} from "@sim/semantic-events";
import { createTeachingSteps, SimulationTimeline } from "@sim/simulation-core";
import { validatePackManifest, type PackManifest } from "./pack-manifest.mjs";

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
  inputSchema?: {
    schemaVersion: "0.1";
    description: string;
    validate(raw: unknown): T;
  };
  teachingMapping?: (
    timeline: SimulationTimeline,
    output: string,
  ) => TeachingStep[];
  rendererConfiguration?: {
    kind: RendererKind;
    description: string;
  };
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
export interface ProblemEntry {
  metadata: ProblemMetadata;
  defaultInput: unknown;
  source: string;
  run(raw: unknown): ProblemRun;
  runCode?: (raw: unknown, source: string) => ProblemRun;
}

export function toProblemEntry<T>(
  definition: ProblemDefinition<T>,
): ProblemEntry {
  return {
    metadata: definition.metadata,
    defaultInput: definition.defaultInput,
    source: definition.source,
    run: (raw) => runProblem(definition, raw),
  };
}

export class ProblemDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProblemDefinitionError";
  }
}

export function validateTeachingMapping(
  steps: readonly TeachingStep[],
  timeline: SimulationTimeline,
): void {
  if (
    !steps.length ||
    steps[0].index !== 0 ||
    steps[0].eventRange.start !== 0 ||
    steps[0].eventRange.end !== 0
  )
    throw new ProblemDefinitionError("Teaching mapping must start at event 0");
  let previousEnd = 0;
  const eventIds = new Set(timeline.events.map((event) => event.eventId));
  for (const [index, step] of steps.entries()) {
    if (step.schemaVersion !== "0.1" || step.index !== index || !step.id)
      throw new ProblemDefinitionError(`Invalid teaching step ${index}`);
    if (index > 0) {
      if (
        step.eventRange.start !== previousEnd + 1 ||
        step.eventRange.end < step.eventRange.start ||
        step.eventRange.end > timeline.length
      )
        throw new ProblemDefinitionError(
          `Teaching step ${index} has a gap or overlap`,
        );
      for (const id of step.primaryEventIds)
        if (!eventIds.has(id))
          throw new ProblemDefinitionError(
            `Teaching step ${index} references ${id}`,
          );
    }
    previousEnd = step.eventRange.end;
  }
  if (previousEnd !== timeline.length)
    throw new ProblemDefinitionError(
      "Teaching mapping does not cover the trace",
    );
}

/** Strict contributor checks are opt-in so existing curated v0.1 definitions remain compatible. */
export function validateContributorProblem<T>(
  definition: ProblemDefinition<T>,
): ProblemRun {
  const { metadata, inputSchema, rendererConfiguration } = definition;
  if (
    metadata.schemaVersion !== "0.1" ||
    !/^[a-z][a-z0-9-]*$/.test(metadata.id) ||
    !metadata.title.trim() ||
    !metadata.summary.trim() ||
    !metadata.learning.intuition.trim() ||
    !metadata.learning.approach.length ||
    !metadata.examples.length
  )
    throw new ProblemDefinitionError("Incomplete contributor problem metadata");
  if (
    !inputSchema ||
    inputSchema.schemaVersion !== "0.1" ||
    !inputSchema.description.trim()
  )
    throw new ProblemDefinitionError(
      "Contributor problem needs a versioned input schema",
    );
  if (inputSchema.validate !== definition.parseInput)
    throw new ProblemDefinitionError(
      "Input schema and parser must share one validator",
    );
  if (
    !rendererConfiguration ||
    rendererConfiguration.kind !== metadata.renderer ||
    !rendererConfiguration.description.trim()
  )
    throw new ProblemDefinitionError(
      "Contributor problem needs matching renderer configuration",
    );
  if (!definition.source.trim())
    throw new ProblemDefinitionError(
      "Contributor problem needs reference source",
    );
  if (!definition.teachingMapping)
    throw new ProblemDefinitionError(
      "Contributor problem needs teaching mapping",
    );
  const run = runProblem(definition, definition.defaultInput);
  if (!run.events.length)
    throw new ProblemDefinitionError(
      "Contributor problem needs a nonempty trace",
    );
  validateTeachingMapping(run.teachingSteps, run.timeline);
  return run;
}

export interface RegisteredPack {
  manifest: Readonly<PackManifest>;
  entries: ProblemEntry[];
}

/** Explicit registration only; manifest validation never imports or runs listed modules. */
export function registerTrustedPack(
  rawManifest: unknown,
  entries: ProblemEntry[],
  options: { approvedLocalCode: true; existingProblemIds?: readonly string[] },
): RegisteredPack {
  if (options?.approvedLocalCode !== true)
    throw new ProblemDefinitionError("Trusted code approval is required");
  const manifest = validatePackManifest(rawManifest);
  const declared = new Map(
    manifest.problems.map((problem) => [problem.id, problem]),
  );
  const existing = new Set(options.existingProblemIds ?? []);
  if (entries.length !== declared.size)
    throw new ProblemDefinitionError(
      "Pack definitions do not match manifest count",
    );
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = entry.metadata.id;
    const declaration = declared.get(id);
    if (!declaration || seen.has(id) || existing.has(id))
      throw new ProblemDefinitionError(
        `Undeclared, duplicate, or conflicting problem: ${id}`,
      );
    if (
      entry.metadata.renderer !== declaration.renderer ||
      (!BUILT_IN_RENDERER_KINDS.includes(
        declaration.renderer as (typeof BUILT_IN_RENDERER_KINDS)[number],
      ) &&
        !manifest.renderers.some(
          (renderer) => renderer.id === declaration.renderer,
        ))
    )
      throw new ProblemDefinitionError(`Renderer mismatch for ${id}`);
    const run = entry.run(entry.defaultInput);
    try {
      if (!run.events.length)
        throw new ProblemDefinitionError(`Problem ${id} has an empty trace`);
      validateTeachingMapping(run.teachingSteps, run.timeline);
    } finally {
      run.timeline.dispose();
    }
    seen.add(id);
  }
  return { manifest, entries: [...entries] };
}

export function runProblem<T>(
  problem: ProblemDefinition<T>,
  raw: unknown,
): ProblemRun {
  const input = problem.inputSchema
    ? problem.inputSchema.validate(raw)
    : problem.parseInput(raw);
  const trace = problem.trace(input);
  const events = createEvents(trace.events, `${problem.metadata.id}:v0.1`);
  const timeline = new SimulationTimeline(trace.initialState, events, {
    metadata: { problemId: problem.metadata.id, algorithmVersion: "0.1" },
  });
  const teachingSteps = problem.teachingMapping
    ? problem.teachingMapping(timeline, trace.output)
    : createTeachingSteps(timeline, problem.metadata.renderer, trace.output);
  if (problem.teachingMapping) validateTeachingMapping(teachingSteps, timeline);
  return {
    timeline,
    rawTrace: trace.rawTrace ?? [],
    events,
    teachingSteps,
    output: trace.output,
    input,
  };
}
export { PackManifestError, validatePackManifest } from "./pack-manifest.mjs";
export type { PackManifest } from "./pack-manifest.mjs";

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
