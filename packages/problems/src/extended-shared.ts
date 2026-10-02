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
  pedagogy?: EventDraft["pedagogy"],
): EventDraft {
  return {
    type,
    entities,
    explanation,
    payload,
    pedagogy,
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
      metadata: { itemId: `item:${index}`, originalIndex: index },
    };
  });
  return state;
}

/** Stable merge sort exposes each permutation as swaps of identified items. */
export function sortedItems(values: number[], events: EventDraft[], line = 1) {
  const items = values.map((value, index) => ({ value, index }));
  const merge = (list: typeof items): typeof items => {
    if (list.length < 2) return list;
    const middle = Math.floor(list.length / 2),
      left = merge(list.slice(0, middle)),
      right = merge(list.slice(middle));
    const out: typeof items = [];
    let a = 0,
      b = 0;
    while (a < left.length || b < right.length)
      out.push(
        b === right.length ||
          (a < left.length && left[a].value <= right[b].value)
          ? left[a++]
          : right[b++],
      );
    return out;
  };
  const sorted = merge(items);
  const positions = new Map(items.map((item, index) => [item.index, index]));
  sorted.forEach((item, at) => {
    const from = positions.get(item.index)!;
    if (from === at) return;
    events.push(
      event(
        "SWAP",
        [`array:${at}`, `array:${from}`],
        `Move ${item.value} (original position ${item.index + 1}) to sorted slot ${at}.`,
        {},
        line,
        {
          schemaVersion: "0.1",
          equation: `${items[at].value} ↔ ${items[from].value}`,
          reason:
            "Apply the stable sorted order. Values travel with their original positions; equal values keep their order.",
        },
      ),
    );
    [items[at], items[from]] = [items[from], items[at]];
    positions.set(items[at].index, at);
    positions.set(items[from].index, from);
  });
  return sorted;
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
