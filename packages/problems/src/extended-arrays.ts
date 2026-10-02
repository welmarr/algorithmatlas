import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import {
  entry,
  event,
  metadata,
  numbers,
  numberState,
  sortedItems,
} from "./extended-shared";

const distinctNumbers = defineProblem({
  metadata: metadata({
    id: "distinct-numbers",
    title: "Distinct Numbers",
    task: "1621",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Count the different values in a list by sorting equal values together.",
    limits: "1–32 integers",
    tags: ["sorting", "scan"],
    examples: [{ input: '{"values":[2,3,2,2,3]}', output: "2" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition: "Equal numbers become neighbors after sorting.",
      approach: [
        "Sort values while retaining their original indices.",
        "Count each value that differs from its predecessor.",
      ],
      explanation: "Every distinct group contributes exactly one to the count.",
    },
  }),
  defaultInput: { values: [2, 3, 2, 2, 3] },
  source: `const sorted = [...values].sort((a,b) => a-b);\nlet count = 0;\nfor (let i = 0; i < sorted.length; i++) {\n  if (i === 0 || sorted[i] !== sorted[i-1]) count++;\n}\nreturn count;`,
  parseInput(raw) {
    return { values: numbers(raw) };
  },
  trace({ values }) {
    const state = numberState(values),
      events: EventDraft[] = [];
    const sorted = sortedItems(values, events).map((item) => item.value);
    let count = 0;
    sorted.forEach((value, i) => {
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Inspect sorted value ${value}.`,
          { value },
          3,
        ),
      );
      if (i === 0 || value !== sorted[i - 1]) {
        count++;
        events.push(
          event(
            "MARK",
            [`array:${i}`],
            `${value} starts a new group; ${count} distinct values.`,
            { status: "path" },
            4,
          ),
        );
      }
    });
    return { initialState: state, events, output: String(count) };
  },
});

const twoSum = defineProblem({
  metadata: metadata({
    id: "sum-of-two-values",
    title: "Sum of Two Values",
    task: "1640",
    category: "Two Pointers",
    renderer: "array",
    summary: "Find two distinct positions whose values add to a target.",
    limits: "2–32 integers and an integer target",
    tags: ["sorting", "two pointers"],
    examples: [{ input: '{"values":[2,7,5,1],"target":8}', output: "2 4" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "Sorted values let a low and high pointer move toward the target.",
      approach: [
        "Sort value and original-position pairs.",
        "Move the low pointer when the sum is too small; otherwise move the high pointer.",
        "Report original one-based positions.",
      ],
      explanation: "A pointer move discards sums that cannot equal the target.",
    },
  }),
  defaultInput: { values: [8, 1, 6, 3, 10, 4], target: 12 },
  source: `const items = values.map((value,index) => ({value,index})).sort((a,b) => a.value-b.value);\nlet left = 0, right = items.length-1;\nwhile (left < right) {\n  const sum = items[left].value + items[right].value;\n  if (sum === target) return [items[left].index+1, items[right].index+1].sort((a,b)=>a-b).join(' ');\n  if (sum < target) left++; else right--;\n}\nreturn 'IMPOSSIBLE';`,
  parseInput(raw) {
    return {
      values: numbers(raw, "values", 2),
      target: integer(readObject(raw).target, "target", -200000, 200000),
    };
  },
  trace({ values, target }) {
    const state = numberState(values),
      events: EventDraft[] = [];
    const items = sortedItems(values, events);
    let left = 0,
      right = items.length - 1,
      answer = "IMPOSSIBLE";
    while (left < right) {
      const a = items[left],
        b = items[right],
        sum = a.value + b.value;
      events.push(
        event(
          "MOVE_POINTER",
          [`array:${left}`],
          `Low value ${a.value} at original position ${a.index + 1}.`,
          { variable: "left", value: left },
          3,
        ),
      );
      events.push(
        event(
          "MOVE_POINTER",
          [`array:${right}`],
          `High value ${b.value} at original position ${b.index + 1}.`,
          { variable: "right", value: right },
          3,
        ),
      );
      events.push(
        event(
          "ANNOTATE",
          [],
          `${a.value} + ${b.value} = ${sum}; target is ${target}.`,
          { variable: "sum", value: sum },
          4,
          {
            schemaVersion: "0.1",
            equation: `${a.value} + ${b.value} = ${sum} ${sum === target ? "=" : sum < target ? "<" : ">"} ${target}`,
            reason:
              sum === target
                ? `Found the target. Return original positions ${a.index + 1} and ${b.index + 1}.`
                : sum < target
                  ? "The sum is too small. Even the largest remaining partner is insufficient for L; move L right to increase the sum."
                  : "The sum is too large. Even the smallest remaining partner is excessive for R; move R left to decrease the sum.",
            labels: [
              { entityId: `array:${left}`, label: "L", role: "comparison" },
              { entityId: `array:${right}`, label: "R", role: "comparison" },
            ],
            range: { low: left, high: right, label: "Remaining candidates" },
          },
        ),
      );
      if (sum === target) {
        answer = [a.index + 1, b.index + 1].sort((x, y) => x - y).join(" ");
        events.push(
          event(
            "MARK",
            [`array:${left}`],
            "First matching value.",
            { status: "path" },
            5,
          ),
        );
        events.push(
          event(
            "MARK",
            [`array:${right}`],
            "Second matching value.",
            { status: "path" },
            5,
          ),
        );
        break;
      }
      if (sum < target) {
        events.push(
          event(
            "UNMARK",
            [`array:${left}`],
            "Discard this low value: every remaining sum with it is too small; move L right.",
            {},
            6,
          ),
        );
        left++;
      } else {
        events.push(
          event(
            "UNMARK",
            [`array:${right}`],
            "Discard this high value: every remaining sum with it is too large; move R left.",
            {},
            6,
          ),
        );
        right--;
      }
    }
    return { initialState: state, events, output: answer };
  },
});

const slidingWindowSum = defineProblem({
  metadata: metadata({
    id: "sliding-window-sum",
    title: "Sliding Window Sum",
    task: "3220",
    category: "Sliding Window",
    renderer: "array",
    summary: "Track each sum for a fixed-width window over a supplied list.",
    limits: "1–32 integers; window size 1–n",
    tags: ["sliding window", "array"],
    examples: [{ input: '{"values":[1,3,2,5],"window":2}', output: "4 5 7" }],
    complexity: { time: "O(n)", space: "O(n) for displayed output" },
    learning: {
      intuition: "Adjacent windows share all but two elements.",
      approach: [
        "Sum the first window.",
        "Subtract the outgoing value and add the incoming value.",
        "Record each window sum.",
      ],
      explanation:
        "Each shift makes one subtraction and one addition, avoiding a full recount.",
    },
  }),
  defaultInput: { values: [1, 3, 2, 5, 4], window: 3 },
  source: `let sum = values.slice(0,window).reduce((a,b) => a+b,0);\nconst answer = [sum];\nfor (let right = window; right < values.length; right++) {\n  sum += values[right] - values[right-window];\n  answer.push(sum);\n}\nreturn answer;`,
  parseInput(raw) {
    const values = numbers(raw);
    return {
      values,
      window: integer(readObject(raw).window, "window", 1, values.length),
    };
  },
  trace({ values, window }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      sums: number[] = [];
    let sum = 0;
    for (let i = 0; i < window; i++) {
      sum += values[i];
      events.push(
        event(
          "MARK",
          [`array:${i}`],
          `Include ${values[i]} in the first window.`,
          { status: "active" },
          1,
        ),
      );
    }
    sums.push(sum);
    events.push(
      event(
        "ANNOTATE",
        [],
        `First window sum: ${sum}.`,
        { variable: "sum", value: sum },
        2,
        {
          schemaVersion: "0.1",
          equation: `${values.slice(0, window).join(" + ")} = ${sum}`,
          range: { low: 0, high: window - 1, label: "Window" },
        },
      ),
    );
    for (let right = window; right < values.length; right++) {
      const left = right - window;
      sum += values[right] - values[left];
      events.push(
        event(
          "UNMARK",
          [`array:${left}`],
          `Remove outgoing ${values[left]}.`,
          {},
          4,
        ),
      );
      events.push(
        event(
          "MARK",
          [`array:${right}`],
          `Add incoming ${values[right]}.`,
          { status: "active" },
          4,
        ),
      );
      events.push(
        event(
          "ANNOTATE",
          [],
          `Window ${left + 1}–${right} sums to ${sum}.`,
          { variable: "sum", value: sum },
          5,
          {
            schemaVersion: "0.1",
            equation: `${sum - values[right] + values[left]} − ${values[left]} + ${values[right]} = ${sum}`,
            reason:
              "Subtract the outgoing value, add the incoming value; the shared middle stays in the window.",
            range: { low: left + 1, high: right, label: "Window" },
            labels: [
              {
                entityId: `array:${left}`,
                label: "Outgoing −",
                role: "rejected",
              },
              {
                entityId: `array:${right}`,
                label: "Incoming +",
                role: "accepted",
              },
            ],
          },
        ),
      );
      sums.push(sum);
    }
    return { initialState: state, events, output: sums.join(" ") };
  },
});

const factoryMachines = defineProblem({
  metadata: metadata({
    id: "factory-machines",
    title: "Factory Machines",
    task: "1620",
    category: "Binary Search",
    renderer: "array",
    summary:
      "Find the earliest time at which parallel machines make enough products.",
    limits: "1–16 machines, positive times up to 1000, target up to 10000",
    tags: ["binary search", "monotone predicate"],
    examples: [{ input: '{"values":[3,2,5],"target":7}', output: "8" }],
    complexity: { time: "O(n log(t·min k))", space: "O(1)" },
    learning: {
      intuition: "If a time is sufficient, every later time is sufficient too.",
      approach: [
        "Keep an insufficient lower bound and a sufficient upper bound.",
        "Count products possible at the midpoint.",
        "Keep the half that contains the first sufficient time.",
      ],
      explanation:
        "The feasible-time predicate is monotone, so binary search locates its first true value.",
    },
  }),
  defaultInput: { values: [3, 2, 5], target: 7 },
  source: `let low = 0, high = Math.min(...values)*target;\nwhile (low+1 < high) {\n  const mid = Math.floor((low+high)/2);\n  const made = values.reduce((s,k) => s+Math.floor(mid/k),0);\n  if (made >= target) high = mid; else low = mid;\n}\nreturn high;`,
  parseInput(raw) {
    return {
      values: numbers(raw, "values", 1, 16, 1, 1000),
      target: integer(readObject(raw).target, "target", 1, 10000),
    };
  },
  trace({ values, target }) {
    const state = numberState(values),
      events: EventDraft[] = [];
    let low = 0,
      high = Math.min(...values) * target;
    while (low + 1 < high) {
      const previousLow = low,
        previousHigh = high;
      const mid = Math.floor((low + high) / 2);
      let made = 0;
      values.forEach((time, i) => {
        const count = Math.floor(mid / time);
        made += count;
        events.push(
          event(
            "READ_INDEX",
            [`array:${i}`],
            `Machine ${i + 1} makes ${count} by time ${mid}.`,
            { value: time },
            4,
          ),
        );
      });
      events.push(
        event(
          "ANNOTATE",
          [],
          `At ${mid} seconds, ${made} products; need ${target}.`,
          { variable: "made", value: made },
          4,
        ),
      );
      if (made >= target) high = mid;
      else low = mid;
      events.push(
        event(
          "ANNOTATE",
          [],
          `Search interval is (${low}, ${high}].`,
          { variable: "mid", value: mid },
          5,
          {
            schemaVersion: "0.1",
            equation: `${made} ${made >= target ? "≥" : "<"} ${target} products at time ${mid}`,
            reason:
              made >= target
                ? "Midpoint is sufficient. Keep it as the upper bound; all later times can be discarded."
                : "Midpoint is insufficient. Discard it and all earlier times; seek a later feasible time.",
            range: {
              low,
              high,
              mid,
              previousLow,
              previousHigh,
              label: "Candidate time interval (low, high]",
            },
          },
        ),
      );
    }
    return { initialState: state, events, output: String(high) };
  },
});

type Range = [number, number];
function ranges(raw: unknown, length: number): Range[] {
  const value = readObject(raw).queries;
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 16 ||
    !value.every(
      (query) =>
        Array.isArray(query) &&
        query.length === 2 &&
        Number.isSafeInteger(query[0]) &&
        Number.isSafeInteger(query[1]) &&
        query[0] >= 1 &&
        query[1] <= length &&
        query[0] <= query[1],
    )
  )
    throw new InputError(
      "queries must be 1–16 valid one-based [left,right] ranges",
    );
  return value as Range[];
}
const staticRangeSum = defineProblem({
  metadata: metadata({
    id: "static-range-sum",
    title: "Static Range Sum Queries",
    task: "1646",
    category: "Range Queries",
    renderer: "array",
    summary: "Answer sums of unchanged array ranges using prefix sums.",
    limits: "1–32 values and 1–16 one-based ranges",
    tags: ["prefix sums", "range queries"],
    examples: [
      { input: '{"values":[3,2,4,5],"queries":[[1,3],[2,4]]}', output: "9 11" },
    ],
    complexity: { time: "O(n + q)", space: "O(n)" },
    learning: {
      intuition: "A range is the difference of two prefixes.",
      approach: [
        "Build cumulative sums.",
        "For each [left,right], subtract prefix[left−1] from prefix[right].",
      ],
      explanation: "The common prefix before left cancels out.",
    },
  }),
  defaultInput: {
    values: [3, 2, 4, 5],
    queries: [
      [1, 3],
      [2, 4],
    ] as Range[],
  },
  source: `const prefix = [0];\nfor (const value of values) prefix.push(prefix.at(-1)+value);\nreturn queries.map(([left,right]) => prefix[right]-prefix[left-1]);`,
  parseInput(raw) {
    const values = numbers(raw);
    return { values, queries: ranges(raw, values.length) };
  },
  trace({ values, queries }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      prefix = [0];
    values.forEach((value, i) => {
      prefix.push(prefix[i] + value);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Prefix through ${i + 1} is ${prefix[i + 1]}.`,
          { value },
          2,
        ),
      );
    });
    const answer = queries.map(([left, right], index) => {
      const sum = prefix[right] - prefix[left - 1];
      events.push(
        event(
          "ANNOTATE",
          [],
          `Query ${index + 1}: prefix[${right}] − prefix[${left - 1}] = ${sum}.`,
          { variable: "sum", value: sum },
          3,
          {
            schemaVersion: "0.1",
            equation: `${prefix[right]} − ${prefix[left - 1]} = ${sum}`,
            reason:
              "Subtract the prefix before the left boundary; its contribution cancels.",
            range: { low: left - 1, high: right - 1, label: "Queried indices" },
          },
        ),
      );
      return sum;
    });
    return { initialState: state, events, output: answer.join(" ") };
  },
});

type DynamicQuery = [1, number, number] | [2, number, number];
const dynamicRangeSum = defineProblem({
  metadata: metadata({
    id: "dynamic-range-sum",
    title: "Dynamic Range Sum Queries",
    task: "1648",
    category: "Fenwick Tree",
    renderer: "array",
    summary: "Update values and answer range sums with a Fenwick tree.",
    limits: "1–32 values and 1–16 [type,a,b] operations",
    tags: ["Fenwick tree", "range queries"],
    examples: [
      {
        input: '{"values":[1,2,3],"queries":[[2,1,3],[1,2,5],[2,1,3]]}',
        output: "6 9",
      },
    ],
    complexity: { time: "O((n+q) log n)", space: "O(n)" },
    learning: {
      intuition: "Each Fenwick cell summarizes a power-of-two-sized suffix.",
      approach: [
        "Build the Fenwick tree using point additions.",
        "For updates, propagate the value difference upward.",
        "Subtract two prefix queries for a range.",
      ],
      explanation:
        "Bit operations move between the few Fenwick cells covering each prefix or update.",
    },
  }),
  defaultInput: {
    values: [1, 2, 3, 4],
    queries: [
      [2, 1, 4],
      [1, 2, 7],
      [2, 2, 3],
    ] as DynamicQuery[],
  },
  source: `const n=values.length, bit=Array(n+1).fill(0);\nfunction prefix(index) { let sum=0; for (; index>0; index -= index & -index) sum += bit[index]; return sum; }\nfunction add(index,delta) { for (; index<=n; index += index & -index) bit[index] += delta; }\nconst current=[...values], answer=[]; current.forEach((value,i)=>add(i+1,value));\nfor (const [type,a,b] of queries) {\n  if (type===1) { add(a,b-current[a-1]); current[a-1]=b; }\n  else answer.push(prefix(b)-prefix(a-1));\n}\nreturn answer;`,
  parseInput(raw) {
    const values = numbers(raw),
      value = readObject(raw).queries;
    if (
      !Array.isArray(value) ||
      value.length < 1 ||
      value.length > 16 ||
      !value.every(
        (q) =>
          Array.isArray(q) &&
          q.length === 3 &&
          (q[0] === 1 || q[0] === 2) &&
          Number.isSafeInteger(q[1]) &&
          q[1] >= 1 &&
          q[1] <= values.length &&
          Number.isSafeInteger(q[2]) &&
          (q[0] === 1
            ? q[2] >= -100000 && q[2] <= 100000
            : q[2] >= q[1] && q[2] <= values.length),
      )
    )
      throw new InputError(
        "queries must be valid [1,index,value] or [2,left,right] operations",
      );
    return { values, queries: value as DynamicQuery[] };
  },
  trace({ values, queries }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      data = [...values],
      bit = Array<number>(values.length + 1).fill(0),
      answers: number[] = [];
    for (let i = 1; i <= values.length; i++) {
      const id = `dp:${i}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: String(i),
        value: 0,
        status: "idle",
        metadata: { colLabel: `${i - (i & -i) + 1}…${i}` },
      };
    }
    const add = (index: number, delta: number) => {
      for (let at = index; at <= data.length; at += at & -at) {
        const before = bit[at];
        bit[at] += delta;
        events.push(
          event(
            "DP_UPDATE",
            [`dp:${at}`],
            `Fenwick cell ${at} covers ${at - (at & -at) + 1}…${at}.`,
            { value: bit[at] },
            3,
            {
              schemaVersion: "0.1",
              equation: `bit[${at}]: ${before} + ${delta} = ${bit[at]}`,
              reason: `Propagate to ${at} + lowbit(${at}) = ${at + (at & -at)}.`,
              range: {
                low: at - (at & -at),
                high: at - 1,
                label: "Covered array indices",
              },
            },
          ),
        );
      }
    };
    const prefix = (index: number) => {
      let sum = 0;
      for (let at = index; at > 0; at -= at & -at) {
        sum += bit[at];
        events.push(
          event(
            "DP_READ",
            [`dp:${at}`],
            `Read Fenwick cell ${at}: running sum ${sum}.`,
            { variable: "prefix", value: sum },
            2,
            {
              schemaVersion: "0.1",
              equation: `sum + bit[${at}] (${bit[at]}) = ${sum}`,
              reason: `Next prefix cell: ${at} − lowbit(${at}) = ${at - (at & -at)}.`,
              range: {
                low: at - (at & -at),
                high: at - 1,
                label: "Prefix contribution",
              },
            },
          ),
        );
      }
      return sum;
    };
    data.forEach((value, i) => add(i + 1, value));
    queries.forEach(([type, a, b]) => {
      if (type === 1) {
        const delta = b - data[a - 1];
        data[a - 1] = b;
        add(a, delta);
        events.push(
          event(
            "WRITE_INDEX",
            [`array:${a - 1}`],
            `Set position ${a} to ${b}; propagate delta ${delta}.`,
            { value: b },
            6,
          ),
        );
      } else {
        const sum = prefix(b) - prefix(a - 1);
        answers.push(sum);
        events.push(
          event(
            "ANNOTATE",
            [],
            `Range ${a}–${b} sums to ${sum}.`,
            { variable: "sum", value: sum },
            7,
          ),
        );
      }
    });
    return {
      initialState: state,
      events,
      output: answers.join(" ") || "No sum queries",
    };
  },
});

export const arrayProblems = [
  distinctNumbers,
  twoSum,
  slidingWindowSum,
  factoryMachines,
  staticRangeSum,
  dynamicRangeSum,
].map(entry);
