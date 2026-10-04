import { emptyState } from "@sim/domain";
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
} from "./extended-shared";

const modulo = 1_000_000_007;
const scalar = (raw: unknown, key = "n", min = 1, max = 32) =>
  integer(readObject(raw)[key], key, min, max);
function pairs(raw: unknown, key: string, min: number, max: number) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 32)
    throw new InputError(`${key} must contain 1–32 pairs`);
  return value.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2)
      throw new InputError(`${key}[${index}] must contain two integers`);
    return [
      integer(pair[0], `${key}[${index}][0]`, min, max),
      integer(pair[1], `${key}[${index}][1]`, min, max),
    ] as [number, number];
  });
}
function variableTrace(
  initial: Record<string, number>,
  events: EventDraft[],
  output: string,
) {
  const state = emptyState();
  state.variables = initial;
  return { initialState: state, events, output };
}

const weirdAlgorithm = defineProblem({
  metadata: metadata({
    id: "weird-algorithm",
    title: "Weird Algorithm",
    task: "1068",
    category: "Introductory Problems",
    renderer: "variables",
    summary: "Follow the odd/even recurrence until it reaches one.",
    limits: "starting value 1–30",
    tags: ["recurrence", "parity"],
    examples: [{ input: '{"n":3}', output: "3 10 5 16 8 4 2 1" }],
    complexity: {
      time: "O(number of generated terms)",
      space: "O(number of generated terms for output)",
    },
    learning: {
      intuition:
        "The next term is determined entirely by the current term's parity.",
      approach: [
        "Record the starting number.",
        "Halve even terms and replace odd terms with three times the term plus one.",
        "Stop after recording one.",
      ],
      explanation:
        "Each transition applies the recurrence once; the displayed sequence includes both endpoints.",
    },
  }),
  defaultInput: { n: 7 },
  source: `const sequence = [n];\nwhile (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; sequence.push(n); }\nreturn sequence.join(' ');`,
  parseInput(raw) {
    return { n: scalar(raw, "n", 1, 30) };
  },
  trace({ n }) {
    const events: EventDraft[] = [
      event("ANNOTATE", [], `Start with ${n}.`, {}, 1),
    ];
    const sequence = [n];
    while (n !== 1) {
      const previous = n;
      n = n % 2 === 0 ? n / 2 : 3 * n + 1;
      sequence.push(n);
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${previous} is ${previous % 2 ? "odd" : "even"}; the next term is ${n}.`,
          { variable: "current", value: n },
          2,
          {
            schemaVersion: "0.1",
            equation:
              previous % 2
                ? `3 × ${previous} + 1 = ${n}`
                : `${previous} ÷ 2 = ${n}`,
            reason:
              "Use the odd or even recurrence for exactly one transition.",
          },
        ),
      );
    }
    return variableTrace({ current: sequence[0] }, events, sequence.join(" "));
  },
});

const missingNumber = defineProblem({
  metadata: metadata({
    id: "missing-number",
    title: "Missing Number",
    task: "1083",
    category: "Introductory Problems",
    renderer: "array",
    summary: "Recover the one absent value from the integers one through n.",
    limits: "n 2–33 and exactly n−1 distinct values in 1–n",
    tags: ["arithmetic", "array"],
    examples: [{ input: '{"n":5,"values":[2,3,1,5]}', output: "4" }],
    complexity: { time: "O(n)", space: "O(1) beyond the input" },
    learning: {
      intuition:
        "The full range has a known sum, and the given values account for all but one term.",
      approach: [
        "Compute n(n+1)/2.",
        "Subtract each supplied value.",
        "The remainder is the absent number.",
      ],
      explanation:
        "Every present value cancels once, leaving only the missing value.",
    },
  }),
  defaultInput: { n: 5, values: [2, 3, 1, 5] },
  source: `let missing = n * (n + 1) / 2;\nfor (const value of values) missing -= value;\nreturn missing;`,
  parseInput(raw) {
    const n = scalar(raw, "n", 2, 33),
      values = numbers(raw, "values", n - 1, n - 1, 1, n);
    if (new Set(values).size !== values.length)
      throw new InputError("values must be distinct");
    return { n, values };
  },
  trace({ n, values }) {
    const events: EventDraft[] = [];
    let remaining = (n * (n + 1)) / 2;
    events.push(
      event(
        "UPDATE_VALUE",
        [],
        `The full range sums to ${remaining}.`,
        { variable: "remaining", value: remaining },
        1,
      ),
    );
    values.forEach((value, i) => {
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Read ${value} at position ${i + 1}.`,
          { value },
          2,
        ),
      );
      remaining -= value;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Subtract ${value}; ${remaining} remains.`,
          { variable: "remaining", value: remaining },
          2,
        ),
      );
    });
    return {
      initialState: numberState(values),
      events,
      output: String(remaining),
    };
  },
});

const repetitions = defineProblem({
  metadata: metadata({
    id: "repetitions",
    title: "Repetitions",
    task: "1069",
    category: "Introductory Problems",
    renderer: "array",
    summary: "Find the longest uninterrupted run of one DNA symbol.",
    limits: "1–64 characters from A, C, G, T",
    tags: ["string scan", "array"],
    examples: [{ input: '{"sequence":"ATTCGGGA"}', output: "3" }],
    complexity: { time: "O(n)", space: "O(1)" },
    learning: {
      intuition:
        "A run continues only when the current symbol matches the previous one.",
      approach: [
        "Start with a run and best length of one.",
        "Extend or restart the current run at each symbol.",
        "Keep the largest run seen.",
      ],
      explanation:
        "Every maximal repetition ends where the next symbol differs, so tracking the current and best lengths is enough.",
    },
  }),
  defaultInput: { sequence: "ATTCGGGA" },
  source: `let best = 1, run = 1;\nfor (let i = 1; i < sequence.length; i++) { run = sequence[i] === sequence[i-1] ? run + 1 : 1; best = Math.max(best, run); }\nreturn best;`,
  parseInput(raw) {
    const sequence = readObject(raw).sequence;
    if (typeof sequence !== "string" || !/^[ACGT]{1,64}$/.test(sequence))
      throw new InputError("sequence must contain 1–64 DNA letters");
    return { sequence };
  },
  trace({ sequence }) {
    const state = numberState([...sequence].map((char) => char.charCodeAt(0)));
    [...sequence].forEach((char, i) => {
      state.entities[`array:${i}`].label = char;
    });
    const events: EventDraft[] = [];
    let best = 0,
      run = 0;
    for (let i = 0; i < sequence.length; i++) {
      run = i && sequence[i] === sequence[i - 1] ? run + 1 : 1;
      best = Math.max(best, run);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `At ${sequence[i]}, the current run is ${run} and the best is ${best}.`,
          { value: sequence.charCodeAt(i) },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Longest run so far: ${best}.`,
          { variable: "best", value: best },
          2,
        ),
      );
    }
    return { initialState: state, events, output: String(best) };
  },
});

const permutations = defineProblem({
  metadata: metadata({
    id: "permutations",
    title: "Permutations",
    task: "1070",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Arrange one through n so neighboring numbers never differ by one.",
    limits: "n 1–32",
    tags: ["constructive", "parity"],
    examples: [{ input: '{"n":5}', output: "2 4 1 3 5" }],
    complexity: { time: "O(n)", space: "O(n) for the output" },
    learning: {
      intuition: "Within the evens or odds, neighboring values differ by two.",
      approach: [
        "Handle n=1 and the impossible sizes 2 and 3.",
        "List all even values, then all odd values.",
        "The boundary is safe for n≥4.",
      ],
      explanation:
        "Even and odd groups each have gaps of two. For n≥4, the group boundary also has a gap greater than one.",
    },
  }),
  defaultInput: { n: 5 },
  source: `if (n === 2 || n === 3) return 'NO SOLUTION';\nconst answer = [];\nfor (let x = 2; x <= n; x += 2) answer.push(x);\nfor (let x = 1; x <= n; x += 2) answer.push(x);\nreturn answer.join(' ');`,
  parseInput(raw) {
    return { n: scalar(raw) };
  },
  trace({ n }) {
    const state = numberState(Array(n).fill(0));
    const events: EventDraft[] = [];
    if (n === 2 || n === 3) {
      events.push(
        event("ANNOTATE", [], `No safe arrangement exists for ${n}.`, {}, 1),
      );
      return { initialState: state, events, output: "NO SOLUTION" };
    }
    const result: number[] = [];
    for (let x = 2; x <= n; x += 2) result.push(x);
    for (let x = 1; x <= n; x += 2) result.push(x);
    result.forEach((value, i) =>
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${i}`],
          `Place ${value} in slot ${i + 1}.`,
          { value },
          3,
        ),
      ),
    );
    return { initialState: state, events, output: result.join(" ") };
  },
});

const bitStrings = defineProblem({
  metadata: metadata({
    id: "bit-strings",
    title: "Bit Strings",
    task: "1617",
    category: "Introductory Problems",
    renderer: "variables",
    summary:
      "Count binary strings of a chosen length modulo one billion and seven.",
    limits: "length 1–64",
    tags: ["modular arithmetic", "counting"],
    examples: [{ input: '{"n":3}', output: "8" }],
    complexity: { time: "O(n) in this teaching trace", space: "O(1)" },
    learning: {
      intuition: "Adding one bit doubles the number of possible strings.",
      approach: [
        "Start with one empty string.",
        "Double the count for every new bit.",
        "Reduce modulo 1,000,000,007 each time.",
      ],
      explanation:
        "Every shorter string has exactly two distinct extensions, one ending in zero and one ending in one.",
    },
  }),
  defaultInput: { n: 8 },
  source: `let ways = 1;\nfor (let bit = 1; bit <= n; bit++) ways = (ways * 2) % 1000000007;\nreturn ways;`,
  parseInput(raw) {
    return { n: scalar(raw, "n", 1, 64) };
  },
  trace({ n }) {
    const events: EventDraft[] = [];
    let ways = 1;
    for (let bit = 1; bit <= n; bit++) {
      ways = (ways * 2) % modulo;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `After bit ${bit}, there are ${ways} strings modulo ${modulo}.`,
          { variable: "ways", value: ways },
          2,
          {
            schemaVersion: "0.1",
            equation: `ways = 2 × previous ways mod ${modulo}`,
            reason: "Append either zero or one to each previous string.",
          },
        ),
      );
    }
    return variableTrace({ ways: 1 }, events, String(ways));
  },
});

const trailingZeros = defineProblem({
  metadata: metadata({
    id: "trailing-zeros",
    title: "Trailing Zeros",
    task: "1618",
    category: "Introductory Problems",
    renderer: "variables",
    summary:
      "Count the factors of five that determine the zeros at the end of n factorial.",
    limits: "n 1–1,000,000,000",
    tags: ["number theory", "factorial"],
    examples: [{ input: '{"n":20}', output: "4" }],
    complexity: { time: "O(log₅ n)", space: "O(1)" },
    learning: {
      intuition:
        "A trailing zero needs a factor of ten; factorials have more twos than fives.",
      approach: [
        "Count multiples of five.",
        "Add another count for multiples of 25, 125, and so on.",
        "Stop when the power exceeds n.",
      ],
      explanation:
        "A number divisible by 25 contributes a second five, and higher powers contribute additional fives.",
    },
  }),
  defaultInput: { n: 100 },
  source: `let count = 0;\nfor (let power = 5; power <= n; power *= 5) count += Math.floor(n / power);\nreturn count;`,
  parseInput(raw) {
    return { n: scalar(raw, "n", 1, 1_000_000_000) };
  },
  trace({ n }) {
    const events: EventDraft[] = [];
    let count = 0;
    for (let power = 5; power <= n; power *= 5) {
      const contribution = Math.floor(n / power);
      count += contribution;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${contribution} multiples of ${power} contribute one more factor of five; total ${count}.`,
          { variable: "count", value: count },
          2,
          {
            schemaVersion: "0.1",
            equation: `⌊${n} / ${power}⌋ = ${contribution}`,
            reason:
              "Every multiple of this power contributes an additional factor of five.",
          },
        ),
      );
    }
    if (!events.length)
      events.push(
        event("ANNOTATE", [], `${n}! contains no factor of five.`, {}, 1),
      );
    return variableTrace({ count: 0 }, events, String(count));
  },
});

const coinPiles = defineProblem({
  metadata: metadata({
    id: "coin-piles",
    title: "Coin Piles",
    task: "1754",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Determine whether each pair of piles can be emptied by removing three coins per move.",
    limits: "1–32 pairs, each pile 0–1,000,000,000",
    tags: ["arithmetic", "invariant"],
    examples: [
      { input: '{"piles":[[2,1],[2,2],[3,3]]}', output: "YES\nNO\nYES" },
    ],
    complexity: { time: "O(t)", space: "O(t) for output" },
    learning: {
      intuition:
        "Every move removes three coins, with no pile losing more than twice the other.",
      approach: [
        "Check that the total is divisible by three.",
        "Check that the larger pile is at most twice the smaller.",
        "Accept only if both conditions hold.",
      ],
      explanation:
        "Solving the two move-count equations gives nonnegative integer move counts exactly under these conditions.",
    },
  }),
  defaultInput: {
    piles: [
      [2, 1],
      [2, 2],
      [3, 3],
    ],
  },
  source: `return piles.map(([a,b]) => (a+b)%3===0 && Math.max(a,b)<=2*Math.min(a,b) ? 'YES' : 'NO').join('\\n');`,
  parseInput(raw) {
    return { piles: pairs(raw, "piles", 0, 1_000_000_000) };
  },
  trace({ piles }) {
    const state = numberState(Array(piles.length).fill(0));
    piles.forEach(
      ([a, b], i) => (state.entities[`array:${i}`].label = `${a}, ${b}`),
    );
    const events: EventDraft[] = [];
    const answers = piles.map(([a, b], i) => {
      const possible =
        (a + b) % 3 === 0 && Math.max(a, b) <= 2 * Math.min(a, b);
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${i}`],
          `Piles ${a} and ${b}: ${possible ? "both invariants hold" : "an invariant fails"}.`,
          { value: possible ? 1 : 0 },
          1,
          {
            schemaVersion: "0.1",
            equation: `(${a} + ${b}) mod 3 = ${(a + b) % 3}; max ≤ 2 × min: ${Math.max(a, b) <= 2 * Math.min(a, b)}`,
            reason:
              "A valid sequence needs a whole number of moves and nonnegative counts of both move types.",
          },
        ),
      );
      return possible ? "YES" : "NO";
    });
    return { initialState: state, events, output: answers.join("\n") };
  },
});

const twoKnights = defineProblem({
  metadata: metadata({
    id: "two-knights",
    title: "Two Knights",
    task: "1072",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Count nonattacking pairs of knights for every board size through n.",
    limits: "board size 1–32",
    tags: ["combinatorics", "geometry"],
    examples: [{ input: '{"n":4}', output: "0\n6\n28\n96" }],
    complexity: { time: "O(n)", space: "O(n) for output" },
    learning: {
      intuition:
        "Start with every unordered pair of squares, then remove attacking pairs.",
      approach: [
        "Count all pairs among k² squares.",
        "Count the 2×3 and 3×2 rectangles in which a knight attack can occur.",
        "Subtract two attacking placements per rectangle orientation.",
      ],
      explanation:
        "Each attacking pair corresponds to a corner pair in a 2×3 rectangle, giving 4(k−1)(k−2) attacking pairs.",
    },
  }),
  defaultInput: { n: 8 },
  source: `const answer = [];\nfor (let k=1; k<=n; k++) { const cells=k*k; answer.push(cells*(cells-1)/2 - 4*(k-1)*(k-2)); }\nreturn answer.join('\\n');`,
  parseInput(raw) {
    return { n: scalar(raw) };
  },
  trace({ n }) {
    const state = numberState(Array(n).fill(0)),
      events: EventDraft[] = [],
      answer: number[] = [];
    for (let k = 1; k <= n; k++) {
      const cells = k * k,
        pairs = (cells * (cells - 1)) / 2,
        attacks = 4 * (k - 1) * (k - 2),
        count = pairs - attacks;
      answer.push(count);
      state.entities[`array:${k - 1}`].label = `${k}×${k}`;
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${k - 1}`],
          `Board ${k}×${k}: ${pairs} total pairs minus ${attacks} attacks leaves ${count}.`,
          { value: count },
          2,
          {
            schemaVersion: "0.1",
            equation: `${pairs} − ${attacks} = ${count}`,
            reason:
              "Subtract the attacking placements from all unordered pairs of squares.",
          },
        ),
      );
    }
    return { initialState: state, events, output: answer.join("\n") };
  },
});

const twoSets = defineProblem({
  metadata: metadata({
    id: "two-sets",
    title: "Two Sets",
    task: "1092",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Partition the integers one through n into two equal-sum groups when possible.",
    limits: "n 1–32",
    tags: ["greedy", "constructive"],
    examples: [{ input: '{"n":7}', output: "YES\n3\n1 6 7\n4\n2 3 4 5" }],
    complexity: { time: "O(n)", space: "O(n) for output" },
    learning: {
      intuition:
        "An odd total can never be split; otherwise pick large values toward half the total.",
      approach: [
        "Compute the sum n(n+1)/2.",
        "If it is even, greedily take values from n down without exceeding half.",
        "Put all unselected values in the other group.",
      ],
      explanation:
        "For consecutive integers from one to n, descending greedy fills an attainable half-sum whenever the total is even.",
    },
  }),
  defaultInput: { n: 7 },
  source: `const total=n*(n+1)/2; if (total%2) return 'NO';\nlet remaining=total/2; const first=[], second=[];\nfor (let x=n; x>=1; x--) if (x<=remaining) { first.push(x); remaining-=x; } else second.push(x);\nfirst.sort((a,b)=>a-b); second.sort((a,b)=>a-b);\nreturn ['YES',first.length,first.join(' '),second.length,second.join(' ')].join('\\n');`,
  parseInput(raw) {
    return { n: scalar(raw) };
  },
  trace({ n }) {
    const state = numberState(Array.from({ length: n }, (_, i) => i + 1)),
      events: EventDraft[] = [];
    const total = (n * (n + 1)) / 2;
    if (total % 2) {
      events.push(
        event(
          "ANNOTATE",
          [],
          `The total ${total} is odd, so two equal integer sums are impossible.`,
          {},
          1,
        ),
      );
      return { initialState: state, events, output: "NO" };
    }
    const first: number[] = [],
      second: number[] = [];
    let remaining = total / 2;
    for (let x = n; x >= 1; x--) {
      if (x <= remaining) {
        first.push(x);
        remaining -= x;
        events.push(
          event(
            "MARK",
            [`array:${x - 1}`],
            `Take ${x} for the first set; ${remaining} remains.`,
            { status: "path" },
            2,
          ),
        );
      } else {
        second.push(x);
        events.push(
          event(
            "READ_INDEX",
            [`array:${x - 1}`],
            `Leave ${x} for the second set.`,
            { value: x },
            2,
          ),
        );
      }
    }
    first.sort((a, b) => a - b);
    second.sort((a, b) => a - b);
    return {
      initialState: state,
      events,
      output: [
        "YES",
        first.length,
        first.join(" "),
        second.length,
        second.join(" "),
      ].join("\n"),
    };
  },
});

const numberSpiral = defineProblem({
  metadata: metadata({
    id: "number-spiral",
    title: "Number Spiral",
    task: "1071",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Find values at selected row-column positions of the expanding square spiral.",
    limits: "1–32 row-column pairs, coordinates 1–100,000",
    tags: ["pattern", "parity"],
    examples: [
      { input: '{"positions":[[2,3],[1,1],[4,2]]}', output: "8\n1\n15" },
    ],
    complexity: { time: "O(t)", space: "O(t) for output" },
    learning: {
      intuition:
        "The larger coordinate tells which square layer contains the position.",
      approach: [
        "Find the layer from the larger coordinate.",
        "Use the layer's square corner as a reference.",
        "Move along the row or column; the direction flips with parity.",
      ],
      explanation:
        "Each layer occupies the numbers after the previous square, and alternating directions determine the offset.",
    },
  }),
  defaultInput: {
    positions: [
      [2, 3],
      [1, 1],
      [4, 2],
    ],
  },
  source: `return positions.map(([y,x]) => y>x ? (y%2===0 ? y*y-x+1 : (y-1)*(y-1)+x) : (x%2===1 ? x*x-y+1 : (x-1)*(x-1)+y)).join('\\n');`,
  parseInput(raw) {
    return { positions: pairs(raw, "positions", 1, 100_000) };
  },
  trace({ positions }) {
    const state = numberState(Array(positions.length).fill(0)),
      events: EventDraft[] = [],
      answer: number[] = [];
    positions.forEach(([y, x], i) => {
      const value =
        y > x
          ? y % 2 === 0
            ? y * y - x + 1
            : (y - 1) * (y - 1) + x
          : x % 2 === 1
            ? x * x - y + 1
            : (x - 1) * (x - 1) + y;
      answer.push(value);
      state.entities[`array:${i}`].label = `(${y},${x})`;
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${i}`],
          `Position (${y}, ${x}) lies in layer ${Math.max(y, x)}; its value is ${value}.`,
          { value },
          1,
          {
            schemaVersion: "0.1",
            equation: `spiral(${y}, ${x}) = ${value}`,
            reason:
              "Use the square corner for the larger coordinate and offset according to its parity.",
          },
        ),
      );
    });
    return { initialState: state, events, output: answer.join("\n") };
  },
});

export const introductoryProblems = [
  entry(weirdAlgorithm),
  entry(missingNumber),
  entry(repetitions),
  entry(permutations),
  entry(bitStrings),
  entry(trailingZeros),
  entry(coinPiles),
  entry(twoKnights),
  entry(twoSets),
  entry(numberSpiral),
];
