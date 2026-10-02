import {
  emptyState,
  type ProblemMetadata,
  type SimulationState,
} from "@sim/domain";
import {
  InputError,
  integer,
  readObject,
  runProblem,
  type ProblemDefinition,
  type ProblemEntry,
} from "@sim/problem-sdk";
import type { EventDraft, EventType } from "@sim/semantic-events";

export function metadata(
  input: Omit<ProblemMetadata, "schemaVersion" | "source" | "constraints"> & {
    task: string;
    limits: string;
  },
): ProblemMetadata {
  const { task, limits, ...rest } = input;
  return {
    ...rest,
    schemaVersion: "0.1",
    source: {
      name: "CSES Problem Set",
      url: `https://cses.fi/problemset/task/${task}`,
    },
    constraints: [{ label: "Interactive input", value: limits }],
  };
}
export function event(
  type: EventType,
  entities: string[],
  explanation: string,
  payload: EventDraft["payload"] = {},
  line?: number,
): EventDraft {
  return {
    type,
    entities,
    explanation,
    payload,
    sourceRef: line ? { file: "solution.ts", line } : undefined,
  };
}
export function entry<T>(definition: ProblemDefinition<T>): ProblemEntry {
  return {
    metadata: definition.metadata,
    defaultInput: definition.defaultInput,
    source: definition.source,
    run: (raw) => runProblem(definition, raw),
  };
}
export function numbers(
  raw: unknown,
  key = "values",
  minLength = 1,
  maxLength = 32,
  min = -100000,
  max = 100000,
): number[] {
  const value = readObject(raw)[key];
  if (
    !Array.isArray(value) ||
    value.length < minLength ||
    value.length > maxLength
  )
    throw new InputError(
      `${key} must contain ${minLength}–${maxLength} integers`,
    );
  return value.map((item, index) =>
    integer(item, `${key}[${index}]`, min, max),
  );
}
export function numberState(values: number[]): SimulationState {
  const state = emptyState();
  values.forEach((value, index) => {
    const id = `array:${index}`;
    state.entities[id] = {
      id,
      kind: "array",
      label: String(index),
      value,
      status: "idle",
    };
  });
  return state;
}
export function stringValue(raw: unknown, key: string, maxLength = 24): string {
  const value = readObject(raw)[key];
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength ||
    !/^[A-Z]+$/.test(value)
  )
    throw new InputError(
      `${key} must contain 1–${maxLength} uppercase letters`,
    );
  return value;
}
export function pairList(
  raw: unknown,
  key: string,
  length: number,
  min: number,
  max: number,
  limit = 32,
): [number, number][] {
  const value = readObject(raw)[key];
  if (
    !Array.isArray(value) ||
    value.length > limit ||
    !value.every((item) => Array.isArray(item) && item.length === 2)
  )
    throw new InputError(`${key} must be an array of pairs`);
  return value.map((item, i) => [
    integer(item[0], `${key}[${i}][0]`, min, max),
    integer(item[1], `${key}[${i}][1]`, min, max),
  ]);
}
