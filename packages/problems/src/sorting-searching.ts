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
  numberState,
  numbers,
  sortedItems,
} from "./extended-shared";

const positive = (raw: unknown) => numbers(raw, "values", 1, 32, 1, 100_000);
const signed = (raw: unknown) =>
  numbers(raw, "values", 1, 32, -100_000, 100_000);

const maximumSubarraySum = defineProblem({
  metadata: metadata({
    id: "maximum-subarray-sum",
    title: "Maximum Subarray Sum",
    task: "1643",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Find the largest sum over a nonempty contiguous block.",
    limits: "1–32 signed integers",
    tags: ["Kadane", "array scan"],
    examples: [{ input: '{"values":[-1,3,-2,5,3,-5,2,2]}', output: "9" }],
    complexity: { time: "O(n)", space: "O(1)" },
    learning: {
      intuition:
        "At each position, a best block ending here either starts here or extends the previous block.",
      approach: [
        "Start both running and global best at the first value.",
        "Choose between a fresh block and extending the previous one.",
        "Keep the largest nonempty block seen.",
      ],
      explanation:
        "Every nonempty subarray ends somewhere; the recurrence considers the best candidate ending at each position.",
    },
  }),
  defaultInput: { values: [-1, 3, -2, 5, 3, -5, 2, 2] },
  source: `let ending = values[0], best = values[0];\nfor (let i=1; i<values.length; i++) { ending=Math.max(values[i],ending+values[i]); best=Math.max(best,ending); }\nreturn best;`,
  parseInput(raw) {
    return { values: signed(raw) };
  },
  trace({ values }) {
    const events: EventDraft[] = [];
    let ending = values[0],
      best = values[0];
    events.push(
      event(
        "READ_INDEX",
        ["array:0"],
        `A nonempty block starts with ${ending}.`,
        { value: ending },
        1,
      ),
    );
    for (let i = 1; i < values.length; i++) {
      const previous = ending;
      ending = Math.max(values[i], previous + values[i]);
      best = Math.max(best, ending);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Read ${values[i]} at position ${i + 1}.`,
          { value: values[i] },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Best block ending here: ${ending}; best overall: ${best}.`,
          { variable: "best", value: best },
          2,
          {
            schemaVersion: "0.1",
            equation: `max(${values[i]}, ${previous} + ${values[i]}) = ${ending}`,
            reason: "Restart if extending would make the block worse.",
          },
        ),
      );
    }
    return { initialState: numberState(values), events, output: String(best) };
  },
});

const stickLengths = defineProblem({
  metadata: metadata({
    id: "stick-lengths",
    title: "Stick Lengths",
    task: "1074",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Choose a common length that minimizes total absolute adjustment.",
    limits: "1–32 positive lengths",
    tags: ["sorting", "median"],
    examples: [{ input: '{"values":[2,3,1,5,2]}', output: "5" }],
    complexity: { time: "O(n log n)", space: "O(n) for sorting" },
    learning: {
      intuition: "The median balances the values on either side.",
      approach: [
        "Sort the lengths.",
        "Choose a middle value.",
        "Add each absolute distance to that median.",
      ],
      explanation:
        "Moving a proposed target across a value changes the slope of the absolute-distance sum; the minimum occurs at a median.",
    },
  }),
  defaultInput: { values: [2, 3, 1, 5, 2] },
  source: `const sorted=[...values].sort((a,b)=>a-b), median=sorted[Math.floor(sorted.length/2)];\nreturn sorted.reduce((sum,value)=>sum+Math.abs(value-median),0);`,
  parseInput(raw) {
    return { values: positive(raw) };
  },
  trace({ values }) {
    const events: EventDraft[] = [],
      sorted = sortedItems(values, events).map((item) => item.value);
    const median = sorted[Math.floor(sorted.length / 2)];
    let cost = 0;
    sorted.forEach((value, i) => {
      cost += Math.abs(value - median);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Adjust ${value} toward median ${median}; running cost ${cost}.`,
          { value },
          2,
          {
            schemaVersion: "0.1",
            equation: `|${value} − ${median}| = ${Math.abs(value - median)}`,
            reason: "The median minimizes the sum of absolute changes.",
          },
        ),
      );
    });
    return { initialState: numberState(values), events, output: String(cost) };
  },
});

const missingCoinSum = defineProblem({
  metadata: metadata({
    id: "missing-coin-sum",
    title: "Missing Coin Sum",
    task: "2183",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Find the smallest positive total no subset of the coins can form.",
    limits: "1–32 positive coin values",
    tags: ["sorting", "greedy"],
    examples: [{ input: '{"values":[2,9,1,2,7]}', output: "6" }],
    complexity: { time: "O(n log n)", space: "O(n) for sorting" },
    learning: {
      intuition:
        "If every total below r is reachable, a coin no larger than r extends that interval.",
      approach: [
        "Sort the coins.",
        "Maintain the first total r not yet known to be reachable.",
        "If the next coin exceeds r, stop; otherwise add it to r.",
      ],
      explanation:
        "A coin at most r fills from r through r+coin−1; a larger coin cannot fill the gap at r.",
    },
  }),
  defaultInput: { values: [2, 9, 1, 2, 7] },
  source: `const coins=[...values].sort((a,b)=>a-b); let reach=1;\nfor (const coin of coins) { if (coin>reach) break; reach+=coin; }\nreturn reach;`,
  parseInput(raw) {
    return { values: positive(raw) };
  },
  trace({ values }) {
    const events: EventDraft[] = [],
      sorted = sortedItems(values, events).map((item) => item.value);
    let reach = 1;
    for (let i = 0; i < sorted.length; i++) {
      const coin = sorted[i];
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `The next coin is ${coin}; totals below ${reach} are reachable.`,
          { value: coin },
          2,
        ),
      );
      if (coin > reach) {
        events.push(
          event("ANNOTATE", [], `Gap found: ${reach} cannot be made.`, {}, 2),
        );
        break;
      }
      reach += coin;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `This coin extends the reachable interval through ${reach - 1}.`,
          { variable: "firstMissing", value: reach },
          3,
        ),
      );
    }
    return { initialState: numberState(values), events, output: String(reach) };
  },
});

const collectingNumbers = defineProblem({
  metadata: metadata({
    id: "collecting-numbers",
    title: "Collecting Numbers",
    task: "2216",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Count left-to-right passes needed to collect a permutation in order.",
    limits: "permutation of 1–32",
    tags: ["permutation", "index positions"],
    examples: [{ input: '{"values":[4,2,1,5,3]}', output: "3" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A new pass is needed whenever the next required value lies left of the current one.",
      approach: [
        "Record each value's position.",
        "Begin with one pass.",
        "Count every descent between positions of consecutive values.",
      ],
      explanation:
        "Consecutive values can be collected in one left-to-right pass exactly when their positions increase.",
    },
  }),
  defaultInput: { values: [4, 2, 1, 5, 3] },
  source: `const pos=Array(values.length+1); values.forEach((v,i)=>pos[v]=i); let rounds=1;\nfor (let v=2; v<=values.length; v++) if (pos[v]<pos[v-1]) rounds++;\nreturn rounds;`,
  parseInput(raw) {
    const values = numbers(raw, "values", 1, 32, 1, 32);
    if (
      new Set(values).size !== values.length ||
      values.some((value) => value > values.length)
    )
      throw new InputError("values must be a permutation of 1–n");
    return { values };
  },
  trace({ values }) {
    const positions = Array(values.length + 1).fill(-1) as number[];
    values.forEach((value, i) => {
      positions[value] = i;
    });
    const events: EventDraft[] = [
      event("ANNOTATE", [], "Start the first left-to-right pass.", {}, 1),
    ];
    let rounds = 1;
    for (let value = 2; value <= values.length; value++) {
      events.push(
        event(
          "READ_INDEX",
          [`array:${positions[value]}`],
          `Find ${value} at position ${positions[value] + 1}.`,
          { value },
          2,
        ),
      );
      if (positions[value] < positions[value - 1]) {
        rounds++;
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `${value} is left of ${value - 1}; begin pass ${rounds}.`,
            { variable: "rounds", value: rounds },
            3,
          ),
        );
      }
    }
    return {
      initialState: numberState(values),
      events,
      output: String(rounds),
    };
  },
});

const playlist = defineProblem({
  metadata: metadata({
    id: "playlist",
    title: "Playlist",
    task: "1141",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Find the longest contiguous stretch with no repeated song ID.",
    limits: "1–32 positive song IDs",
    tags: ["sliding window", "hash map"],
    examples: [{ input: '{"values":[1,2,1,3,2,7,4,2]}', output: "5" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A repeated ID forces the unique window's left edge past its previous occurrence.",
      approach: [
        "Track the last position of each song.",
        "Move the left edge only forward when a duplicate is inside the window.",
        "Remember the largest window width.",
      ],
      explanation:
        "Every maintained window has unique IDs, and no valid window ending at the current position can start earlier than the maintained left edge.",
    },
  }),
  defaultInput: { values: [1, 2, 1, 3, 2, 7, 4, 2] },
  source: `const last=new Map(); let left=0,best=0;\nvalues.forEach((value,right)=>{ if (last.has(value)) left=Math.max(left,last.get(value)+1); last.set(value,right); best=Math.max(best,right-left+1); });\nreturn best;`,
  parseInput(raw) {
    return { values: positive(raw) };
  },
  trace({ values }) {
    const events: EventDraft[] = [],
      last = new Map<number, number>();
    let left = 0,
      best = 0;
    values.forEach((value, right) => {
      const previous = last.get(value);
      if (previous !== undefined && previous >= left) left = previous + 1;
      last.set(value, right);
      best = Math.max(best, right - left + 1);
      events.push(
        event(
          "READ_INDEX",
          [`array:${right}`],
          `Read song ${value}; unique window is ${left + 1}–${right + 1}.`,
          { value },
          2,
          {
            schemaVersion: "0.1",
            range: { low: left, high: right, label: "Unique songs" },
            reason:
              previous !== undefined && previous < right
                ? "Move beyond the duplicate's previous position when needed."
                : "Extend the unique window.",
          },
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Longest unique stretch so far: ${best}.`,
          { variable: "best", value: best },
          3,
        ),
      );
    });
    return { initialState: numberState(values), events, output: String(best) };
  },
});

const nearestSmallerValues = defineProblem({
  metadata: metadata({
    id: "nearest-smaller-values",
    title: "Nearest Smaller Values",
    task: "1645",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "For each value, locate the closest earlier position with a smaller value.",
    limits: "1–32 positive integers",
    tags: ["monotonic stack", "array"],
    examples: [
      { input: '{"values":[2,5,1,4,8,3,2,5]}', output: "0 1 0 3 4 3 3 7" },
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A value at least as large as the new one cannot be the nearest smaller answer for this or future positions.",
      approach: [
        "Keep candidate positions on a strictly increasing stack of values.",
        "Pop candidates not smaller than the current value.",
        "The top is the nearest smaller position, or zero if none.",
      ],
      explanation:
        "Every index enters and leaves the stack at most once, so the total scan is linear.",
    },
  }),
  defaultInput: { values: [2, 5, 1, 4, 8, 3, 2, 5] },
  source: `const stack=[], answer=[];\nfor (let i=0; i<values.length; i++) { while (stack.length && values[stack[stack.length-1]]>=values[i]) stack.pop(); answer.push(stack.length?stack[stack.length-1]+1:0); stack.push(i); }\nreturn answer;`,
  parseInput(raw) {
    return { values: positive(raw) };
  },
  trace({ values }) {
    const state = numberState(Array(values.length).fill(0)),
      events: EventDraft[] = [],
      stack: number[] = [],
      answer: number[] = [];
    values.forEach((value, i) => {
      state.entities[`array:${i}`].label = String(value);
    });
    for (let i = 0; i < values.length; i++) {
      while (stack.length && values[stack[stack.length - 1]] >= values[i]) {
        const removed = stack.pop()!;
        events.push(
          event(
            "ANNOTATE",
            [],
            `${values[removed]} cannot be a smaller predecessor of ${values[i]}; remove it from consideration.`,
            {},
            2,
          ),
        );
      }
      const nearest = stack.length ? stack[stack.length - 1] + 1 : 0;
      answer.push(nearest);
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${i}`],
          `${values[i]} has nearest smaller position ${nearest}.`,
          { value: nearest },
          3,
        ),
      );
      stack.push(i);
    }
    return { initialState: state, events, output: answer.join(" ") };
  },
});

const subarraySumsI = defineProblem({
  metadata: metadata({
    id: "subarray-sums-i",
    title: "Subarray Sums I",
    task: "1660",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Count positive-valued contiguous blocks that sum to a target.",
    limits: "1–32 positive integers and target 1–1,000,000",
    tags: ["sliding window", "two pointers"],
    examples: [{ input: '{"values":[2,4,1,2,7],"target":7}', output: "3" }],
    complexity: { time: "O(n)", space: "O(1)" },
    learning: {
      intuition:
        "With positive values, extending raises the sum and removing the leftmost value lowers it.",
      approach: [
        "Extend the right end of the window.",
        "Shrink from the left while the sum is too large.",
        "Count a window whenever its sum equals the target.",
      ],
      explanation:
        "Positivity makes the sum monotone under either pointer move, so no candidate window is skipped.",
    },
  }),
  defaultInput: { values: [2, 4, 1, 2, 7], target: 7 },
  source: `let left=0,sum=0,count=0;\nfor (let right=0;right<values.length;right++) { sum+=values[right]; while (sum>target) sum-=values[left++]; if (sum===target) count++; }\nreturn count;`,
  parseInput(raw) {
    return {
      values: positive(raw),
      target: integer(readObject(raw).target, "target", 1, 1_000_000),
    };
  },
  trace({ values, target }) {
    const events: EventDraft[] = [];
    let left = 0,
      sum = 0,
      count = 0;
    for (let right = 0; right < values.length; right++) {
      sum += values[right];
      events.push(
        event(
          "READ_INDEX",
          [`array:${right}`],
          `Add ${values[right]}; window sum ${sum}.`,
          { value: values[right] },
          2,
        ),
      );
      while (sum > target) {
        events.push(
          event(
            "ANNOTATE",
            [],
            `${sum} exceeds ${target}; remove ${values[left]} from the left.`,
            {},
            2,
          ),
        );
        sum -= values[left++];
      }
      if (sum === target) count++;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Window ${left + 1}–${right + 1} sums to ${sum}; matches so far ${count}.`,
          { variable: "matches", value: count },
          3,
          {
            schemaVersion: "0.1",
            range: { low: left, high: right, label: "Current window" },
            reason:
              "All values are positive, so moving the left edge is safe once the sum is too large.",
          },
        ),
      );
    }
    return { initialState: numberState(values), events, output: String(count) };
  },
});

const subarraySumsII = defineProblem({
  metadata: metadata({
    id: "subarray-sums-ii",
    title: "Subarray Sums II",
    task: "1661",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Count signed-valued contiguous blocks that sum to a target.",
    limits: "1–32 signed integers and target −1,000,000–1,000,000",
    tags: ["prefix sums", "hash map"],
    examples: [{ input: '{"values":[2,-1,3,5,-2],"target":7}', output: "2" }],
    complexity: { time: "O(n) expected", space: "O(n)" },
    learning: {
      intuition:
        "A block ends here with target sum when an earlier prefix equals current prefix minus target.",
      approach: [
        "Count the empty prefix once.",
        "For each value, update the running prefix.",
        "Add the frequency of prefix minus target, then record the current prefix.",
      ],
      explanation:
        "Each matching earlier prefix marks one distinct starting position, including when values are negative.",
    },
  }),
  defaultInput: { values: [2, -1, 3, 5, -2], target: 7 },
  source: `const seen=new Map([[0,1]]); let prefix=0,count=0;\nfor (const value of values) { prefix+=value; count+=seen.get(prefix-target)||0; seen.set(prefix,(seen.get(prefix)||0)+1); }\nreturn count;`,
  parseInput(raw) {
    return {
      values: signed(raw),
      target: integer(readObject(raw).target, "target", -1_000_000, 1_000_000),
    };
  },
  trace({ values, target }) {
    const events: EventDraft[] = [],
      seen = new Map<number, number>([[0, 1]]);
    let prefix = 0,
      count = 0;
    values.forEach((value, i) => {
      prefix += value;
      const matches = seen.get(prefix - target) ?? 0;
      count += matches;
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Prefix sum is ${prefix}; ${matches} earlier prefixes equal ${prefix - target}.`,
          { value },
          2,
          {
            schemaVersion: "0.1",
            equation: `${prefix} − ${target} = ${prefix - target}`,
            reason:
              "Subtracting an earlier prefix gives the sum of the block after it.",
          },
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${count} target-sum blocks found so far.`,
          { variable: "matches", value: count },
          3,
        ),
      );
      seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
    });
    return { initialState: numberState(values), events, output: String(count) };
  },
});

const subarrayDivisibility = defineProblem({
  metadata: metadata({
    id: "subarray-divisibility",
    title: "Subarray Divisibility",
    task: "1662",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Count contiguous blocks whose sum is divisible by the array length.",
    limits: "1–32 signed integers",
    tags: ["prefix sums", "modular arithmetic"],
    examples: [{ input: '{"values":[3,1,2,7,4]}', output: "1" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "Two prefixes with the same remainder differ by a multiple of n.",
      approach: [
        "Count remainder zero for the empty prefix.",
        "Normalize each new prefix remainder to 0…n−1.",
        "Add its previous frequency, then record it.",
      ],
      explanation:
        "Each matching earlier remainder gives one divisible subarray ending at the current position.",
    },
  }),
  defaultInput: { values: [3, 1, 2, 7, 4] },
  source: `const counts=Array(values.length).fill(0); counts[0]=1; let remainder=0,answer=0;\nfor (const value of values) { remainder=((remainder+value)%values.length+values.length)%values.length; answer+=counts[remainder]; counts[remainder]++; }\nreturn answer;`,
  parseInput(raw) {
    return { values: signed(raw) };
  },
  trace({ values }) {
    const events: EventDraft[] = [],
      counts = Array<number>(values.length).fill(0);
    counts[0] = 1;
    let remainder = 0,
      answer = 0;
    values.forEach((value, i) => {
      remainder =
        (((remainder + value) % values.length) + values.length) % values.length;
      answer += counts[remainder];
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Normalized prefix remainder ${remainder}; ${counts[remainder]} earlier matching prefixes.`,
          { value },
          2,
          {
            schemaVersion: "0.1",
            equation: `prefix mod ${values.length} = ${remainder}`,
            reason:
              "Equal remainders delimit a block whose sum is divisible by the array length.",
          },
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${answer} divisible blocks found so far.`,
          { variable: "matches", value: answer },
          3,
        ),
      );
      counts[remainder]++;
    });
    return {
      initialState: numberState(values),
      events,
      output: String(answer),
    };
  },
});

export const sortingSearchingProblems = [
  entry(maximumSubarraySum),
  entry(stickLengths),
  entry(missingCoinSum),
  entry(collectingNumbers),
  entry(playlist),
  entry(nearestSmallerValues),
  entry(subarraySumsI),
  entry(subarraySumsII),
  entry(subarrayDivisibility),
];
