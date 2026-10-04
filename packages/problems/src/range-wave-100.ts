import {
  defineProblem,
  readObject,
  integer,
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

type Step = (
  index: number,
  value: number,
  reason: string,
  change?: boolean,
) => void;
function lesson<I>(spec: {
  meta: Parameters<typeof metadata>[0];
  defaultInput: I;
  parse: (raw: unknown) => I;
  values: (input: I) => number[];
  solve: (input: I, step?: Step) => string;
  sourceArgs: string;
}) {
  return entry(
    defineProblem({
      metadata: metadata(spec.meta),
      defaultInput: spec.defaultInput,
      source: `return (${spec.solve.toString()})(${spec.sourceArgs});`,
      parseInput: spec.parse,
      trace(input) {
        const state = numberState(spec.values(input)),
          events: EventDraft[] = [];
        state.variables = { answer: 0 };
        const step: Step = (index, value, reason, change = false) => {
          if (change)
            events.push(
              event("WRITE_INDEX", [`array:${index}`], reason, { value }, 1, {
                schemaVersion: "0.1",
                reason,
              }),
            );
          else
            events.push(
              event("ANNOTATE", [], reason, { variable: "answer", value }, 1, {
                schemaVersion: "0.1",
                reason,
              }),
            );
        };
        return { initialState: state, events, output: spec.solve(input, step) };
      },
    }),
  );
}
function triples(
  raw: unknown,
  key: string,
  min: number,
  max: number,
  count = 20,
) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > count)
    throw new InputError(`${key} must contain 1–${count} operations`);
  return value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3)
      throw new InputError(`${key}[${i}] must be a triple`);
    return item.map((cell, j) => integer(cell, `${key}[${i}][${j}]`, min, max));
  });
}

function hotelSolve(
  { hotels, groups }: { hotels: number[]; groups: number[] },
  step: Step = () => {},
) {
  const n = hotels.length,
    size = 2 ** Math.ceil(Math.log2(n)),
    tree = Array<number>(2 * size).fill(0),
    free = [...hotels],
    answers: number[] = [];
  for (let i = 0; i < n; i++) tree[size + i] = hotels[i];
  for (let i = size - 1; i > 0; i--)
    tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]);
  for (const need of groups) {
    if (tree[1] < need) {
      answers.push(0);
      step(0, 0, `No hotel has ${need} rooms available.`);
      continue;
    }
    let node = 1;
    while (node < size) {
      node *= 2;
      if (tree[node] < need) node++;
    }
    const index = node - size;
    free[index] -= need;
    answers.push(index + 1);
    tree[node] = free[index];
    for (node = Math.floor(node / 2); node > 0; node = Math.floor(node / 2))
      tree[node] = Math.max(tree[2 * node], tree[2 * node + 1]);
    step(
      index,
      free[index],
      `Group of ${need} uses first fitting hotel ${index + 1}; ${free[index]} rooms remain.`,
      true,
    );
  }
  return answers.join(" ");
}
const hotelQueries = lesson({
  meta: {
    id: "hotel-queries",
    title: "Hotel Queries",
    task: "1143",
    category: "Range Queries",
    renderer: "array",
    summary: "Assign each group to the first hotel with enough free rooms.",
    limits: "1–12 hotels and 1–16 groups, capacities 0–100",
    tags: ["segment tree", "range maximum", "first fit"],
    examples: [
      {
        input: '{"hotels":[3,2,4,1,5,5,2,6],"groups":[4,4,7,1,1]}',
        output: "3 5 0 1 1",
      },
    ],
    complexity: { time: "O((n+q) log n)", space: "O(n)" },
    learning: {
      intuition:
        "A segment's maximum tells whether any hotel inside can fit the group.",
      approach: [
        "Store maximum free rooms in every segment.",
        "Descend left whenever that child has enough rooms.",
        "Subtract the assigned rooms and refresh ancestor maxima.",
      ],
      explanation:
        "Choosing the left capable child at each split reaches the smallest valid hotel index.",
    },
  },
  defaultInput: { hotels: [3, 2, 4, 1, 5, 5, 2, 6], groups: [4, 4, 7, 1, 1] },
  parse(raw) {
    return {
      hotels: numbers(raw, "hotels", 1, 12, 0, 100),
      groups: numbers(raw, "groups", 1, 16, 1, 100),
    };
  },
  values: ({ hotels }) => hotels,
  solve: hotelSolve,
  sourceArgs: "{hotels,groups}",
});

function removalSolve(
  { values, positions }: { values: number[]; positions: number[] },
  step: Step = () => {},
) {
  const n = values.length,
    bit = Array<number>(n + 1).fill(0),
    answer: number[] = [];
  function add(i: number, delta: number) {
    for (; i <= n; i += i & -i) bit[i] += delta;
  }
  for (let i = 1; i <= n; i++) add(i, 1);
  for (const rank of positions) {
    let left = rank,
      index = 0;
    for (
      let mask = 2 ** Math.floor(Math.log2(n));
      mask > 0;
      mask = Math.floor(mask / 2)
    ) {
      const next = index + mask;
      if (next <= n && bit[next] < left) {
        left -= bit[next];
        index = next;
      }
    }
    const at = index + 1;
    answer.push(values[at - 1]);
    add(at, -1);
    step(
      at - 1,
      values[at - 1],
      `Remove surviving position ${rank}: original slot ${at} holds ${values[at - 1]}.`,
    );
  }
  return answer.join(" ");
}
const listRemovals = lesson({
  meta: {
    id: "list-removals",
    title: "List Removals",
    task: "1749",
    category: "Range Queries",
    renderer: "array",
    summary: "Remove the k-th surviving value for each requested position.",
    limits: "1–12 values with one valid removal rank per value",
    tags: ["Fenwick tree", "order statistic", "prefix sums"],
    examples: [
      {
        input: '{"values":[2,6,1,4,2],"positions":[3,1,3,1,1]}',
        output: "1 2 2 6 4",
      },
    ],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "Treat every surviving element as a 1, then locate the rank by prefix count.",
      approach: [
        "Initialize a Fenwick tree with one per element.",
        "Binary-lift over prefix counts to locate each requested rank.",
        "Remove that position by adding −1.",
      ],
      explanation:
        "A prefix count equals the number of surviving items before a slot, so the first prefix reaching k identifies the requested value.",
    },
  },
  defaultInput: { values: [2, 6, 1, 4, 2], positions: [3, 1, 3, 1, 1] },
  parse(raw) {
    const values = numbers(raw, "values", 1, 12, 1, 1_000_000),
      positions = numbers(
        raw,
        "positions",
        values.length,
        values.length,
        1,
        values.length,
      );
    positions.forEach((p, i) => {
      if (p > values.length - i)
        throw new InputError(`positions[${i}] exceeds remaining list length`);
    });
    return { values, positions };
  },
  values: ({ values }) => values,
  solve: removalSolve,
  sourceArgs: "{values,positions}",
});

function prefixSolve(
  { values, queries }: { values: number[]; queries: number[][] },
  step: Step = () => {},
) {
  const n = values.length,
    size = 2 ** Math.ceil(Math.log2(n)),
    tree = Array.from({ length: 2 * size }, () => ({ sum: 0, best: 0 })),
    current = [...values],
    answers: number[] = [];
  for (let i = 0; i < n; i++)
    tree[size + i] = { sum: current[i], best: Math.max(0, current[i]) };
  const merge = (
    a: { sum: number; best: number },
    b: { sum: number; best: number },
  ) => ({ sum: a.sum + b.sum, best: Math.max(a.best, a.sum + b.best) });
  for (let i = size - 1; i > 0; i--)
    tree[i] = merge(tree[2 * i], tree[2 * i + 1]);
  for (const [kind, a, b] of queries) {
    if (kind === 1) {
      const index = a - 1;
      current[index] = b;
      let node = size + index;
      tree[node] = { sum: b, best: Math.max(0, b) };
      for (node = Math.floor(node / 2); node > 0; node = Math.floor(node / 2))
        tree[node] = merge(tree[2 * node], tree[2 * node + 1]);
      step(
        index,
        b,
        `Set position ${a} to ${b}; refresh segment sums and best prefixes.`,
        true,
      );
    } else {
      let left = size + a - 1,
        right = size + b - 1,
        pre = { sum: 0, best: 0 },
        post = { sum: 0, best: 0 };
      while (left <= right) {
        if (left % 2 === 1) pre = merge(pre, tree[left++]);
        if (right % 2 === 0) post = merge(tree[right--], post);
        left = Math.floor(left / 2);
        right = Math.floor(right / 2);
      }
      const answer = merge(pre, post).best;
      answers.push(answer);
      step(
        a - 1,
        answer,
        `Maximum prefix in positions ${a}…${b} is ${answer}, including the empty prefix.`,
      );
    }
  }
  return answers.join(String.fromCharCode(10));
}
const prefixSumQueries = lesson({
  meta: {
    id: "prefix-sum-queries",
    title: "Prefix Sum Queries",
    task: "2166",
    category: "Range Queries",
    renderer: "array",
    summary: "Maintain maximum nonnegative prefix sums under point updates.",
    limits: "1–12 values, 1–20 update/query triples",
    tags: ["segment tree", "prefix sums", "range queries"],
    examples: [
      {
        input:
          '{"values":[1,2,-1,3,1,-5,1,4],"queries":[[2,2,6],[1,4,-2],[2,2,6],[2,3,4]]}',
        output: "5\n2\n0",
      },
    ],
    complexity: { time: "O((n+q) log n)", space: "O(n)" },
    learning: {
      intuition:
        "A segment stores its total sum and best prefix, allowing two adjacent segments to combine.",
      approach: [
        "Represent a leaf as (value,max(0,value)).",
        "Merge left and right with best=max(left.best,left.sum+right.best).",
        "Update one leaf or combine the segments covering a query interval.",
      ],
      explanation:
        "Every prefix of a concatenation either lies in its left part or contains all of the left part and a prefix of the right.",
    },
  },
  defaultInput: {
    values: [1, 2, -1, 3, 1, -5, 1, 4],
    queries: [
      [2, 2, 6],
      [1, 4, -2],
      [2, 2, 6],
      [2, 3, 4],
    ],
  },
  parse(raw) {
    const values = numbers(raw, "values", 1, 12, -100, 100),
      queries = triples(raw, "queries", -100, 100);
    for (const [type, a, b] of queries) {
      if (type !== 1 && type !== 2)
        throw new InputError("Query type must be 1 or 2");
      if (
        a < 1 ||
        a > values.length ||
        (type === 2 && (b < a || b > values.length))
      )
        throw new InputError("Query indices must be within the array");
    }
    return { values, queries };
  },
  values: ({ values }) => values,
  solve: prefixSolve,
  sourceArgs: "{values,queries}",
});

function pizzeriaSolve(
  { prices, queries }: { prices: number[]; queries: number[][] },
  step: Step = () => {},
) {
  const n = prices.length,
    size = 2 ** Math.ceil(Math.log2(n)),
    left = Array<number>(2 * size).fill(Infinity),
    right = Array<number>(2 * size).fill(Infinity),
    current = [...prices],
    answers: number[] = [];
  function update(index: number, value: number) {
    let node = size + index;
    left[node] = value - (index + 1);
    right[node] = value + (index + 1);
    for (node = Math.floor(node / 2); node > 0; node = Math.floor(node / 2)) {
      left[node] = Math.min(left[2 * node], left[2 * node + 1]);
      right[node] = Math.min(right[2 * node], right[2 * node + 1]);
    }
  }
  function minimum(tree: number[], start: number, end: number) {
    let l = size + start,
      r = size + end,
      best = Infinity;
    while (l <= r) {
      if (l % 2 === 1) best = Math.min(best, tree[l++]);
      if (r % 2 === 0) best = Math.min(best, tree[r--]);
      l = Math.floor(l / 2);
      r = Math.floor(r / 2);
    }
    return best;
  }
  for (let i = 0; i < n; i++) update(i, current[i]);
  for (const [type, k, x] of queries) {
    if (type === 1) {
      current[k - 1] = x;
      update(k - 1, x);
      step(k - 1, x, `Pizzeria ${k} now charges ${x}.`, true);
    } else {
      const answer = Math.min(
        minimum(right, k - 1, n - 1) - k,
        minimum(left, 0, k - 1) + k,
      );
      answers.push(answer);
      step(
        k - 1,
        answer,
        `From building ${k}, the minimum price plus walking distance is ${answer}.`,
      );
    }
  }
  return answers.join(String.fromCharCode(10));
}
const pizzeriaQueries = lesson({
  meta: {
    id: "pizzeria-queries",
    title: "Pizzeria Queries",
    task: "2206",
    category: "Range Queries",
    renderer: "array",
    summary:
      "Answer the cheapest pizza plus street-distance delivery cost after price changes.",
    limits: "1–12 prices and 1–20 operations",
    tags: ["segment tree", "range minimum", "distance transform"],
    examples: [
      {
        input: '{"prices":[8,6,4,5,7,5],"queries":[[2,2,0],[1,5,1],[2,2,0]]}',
        output: "5\n4",
      },
    ],
    complexity: { time: "O((n+q) log n)", space: "O(n)" },
    learning: {
      intuition:
        "Split possible shops at your building; distance becomes a linear offset on each side.",
      approach: [
        "Store minima of price−index and price+index in two segment trees.",
        "For a query at k, check shops to the right and left separately.",
        "Update both transformed values when one price changes.",
      ],
      explanation:
        "For i≥k, price_i+|i−k|=(price_i+i)−k; for i≤k it is (price_i−i)+k. The two range minima recover the best shop.",
    },
  },
  defaultInput: {
    prices: [8, 6, 4, 5, 7, 5],
    queries: [
      [2, 2, 0],
      [1, 5, 1],
      [2, 2, 0],
    ],
  },
  parse(raw) {
    const prices = numbers(raw, "prices", 1, 12, 1, 100),
      value = readObject(raw).queries;
    if (!Array.isArray(value) || value.length < 1 || value.length > 20)
      throw new InputError("queries must contain 1–20 operations");
    const queries = value.map((item, i) => {
      if (!Array.isArray(item) || (item.length !== 2 && item.length !== 3))
        throw new InputError(`queries[${i}] must contain a type and building`);
      const type = integer(item[0], "type", 1, 2),
        k = integer(item[1], "building", 1, prices.length),
        x = type === 1 ? integer(item[2], "price", 1, 100) : 0;
      return [type, k, x];
    });
    return { prices, queries };
  },
  values: ({ prices }) => prices,
  solve: pizzeriaSolve,
  sourceArgs: "{prices,queries}",
});

export const wave100RangeProblems = [
  hotelQueries,
  listRemovals,
  prefixSumQueries,
  pizzeriaQueries,
];
