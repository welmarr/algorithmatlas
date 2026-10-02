import { emptyState } from "@sim/domain";
import {
  defineProblem,
  InputError,
  integer,
  readObject,
} from "@sim/problem-sdk";
import { createTeachingSteps } from "@sim/simulation-core";
import type { EventDraft } from "@sim/semantic-events";

interface Input {
  values: number[];
}
function parseInput(raw: unknown): Input {
  const values = readObject(raw).values;
  if (!Array.isArray(values) || values.length < 1 || values.length > 12)
    throw new InputError("values needs 1–12 integers");
  return {
    values: values.map((value, index) =>
      integer(value, `values[${index}]`, -99, 99),
    ),
  };
}

export const reverseArray = defineProblem<Input>({
  metadata: {
    schemaVersion: "0.1",
    id: "sample-pack-reverse-array",
    title: "Reverse Array",
    category: "Community Example",
    summary: "Swap symmetric positions to reverse a short array.",
    source: { name: "Algorithm Atlas sample pack" },
    constraints: [{ label: "Interactive input", value: "1–12 integers" }],
    examples: [{ input: '{"values":[4,1,7]}', output: "7 1 4" }],
    complexity: { time: "O(n)", space: "O(1)" },
    learning: {
      intuition:
        "The first and last positions exchange values, then the pair moves inward.",
      approach: [
        "Inspect symmetric positions.",
        "Write their swapped values.",
        "Move toward the center.",
      ],
      explanation: "Every symmetric pair is swapped once.",
    },
    renderer: "sample-pack-array-list",
    tags: ["array", "two pointers"],
  },
  defaultInput: { values: [4, 1, 7] },
  source: `let left=0, right=values.length-1;\nwhile(left<right) {\n  [values[left],values[right]]=[values[right],values[left]];\n  left++; right--;\n}\nreturn values;`,
  parseInput,
  inputSchema: {
    schemaVersion: "0.1",
    description: "An object with 1–12 integer values between -99 and 99.",
    validate: parseInput,
  },
  rendererConfiguration: {
    kind: "sample-pack-array-list",
    description: "One numbered cell per value; writes show old and new values.",
  },
  teachingMapping: (timeline, output) =>
    createTeachingSteps(timeline, "array", output),
  trace(input) {
    const state = emptyState();
    const values = [...input.values];
    values.forEach((value, index) => {
      state.entities[`array:${index}`] = {
        id: `array:${index}`,
        kind: "array",
        label: String(index),
        value,
        status: "idle",
      };
    });
    const events: EventDraft[] = [];
    for (
      let left = 0, right = values.length - 1;
      left < right;
      left++, right--
    ) {
      const a = values[left],
        b = values[right];
      events.push({
        type: "READ_INDEX",
        entities: [`array:${left}`],
        payload: { value: a },
        explanation: `Read left value ${a} at ${left}.`,
        sourceRef: { file: "solution.ts", line: 2 },
      });
      events.push({
        type: "READ_INDEX",
        entities: [`array:${right}`],
        payload: { value: b },
        explanation: `Read right value ${b} at ${right}.`,
        sourceRef: { file: "solution.ts", line: 2 },
      });
      values[left] = b;
      values[right] = a;
      events.push({
        type: "WRITE_INDEX",
        entities: [`array:${left}`],
        payload: { value: b },
        explanation: `Write ${b} at ${left}.`,
        sourceRef: { file: "solution.ts", line: 3 },
      });
      events.push({
        type: "WRITE_INDEX",
        entities: [`array:${right}`],
        payload: { value: a },
        explanation: `Write ${a} at ${right}.`,
        sourceRef: { file: "solution.ts", line: 3 },
      });
    }
    if (!events.length)
      events.push({
        type: "READ_INDEX",
        entities: ["array:0"],
        payload: { value: values[0] },
        explanation: "The single value is already reversed.",
      });
    return { initialState: state, events, output: values.join(" ") };
  },
});
