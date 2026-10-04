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

type Pair = [number, number];

function valuesInput(raw: unknown) {
  return numbers(raw, "values", 1, 20, 1, 1_000_000);
}
function pairs(raw: unknown, key: string, n: number) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new InputError(`${key} must contain 1–20 ranges`);
  return value.map((item, i): Pair => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`${key}[${i}] must be a pair`);
    const left = integer(item[0], `${key}[${i}][0]`, 1, n),
      right = integer(item[1], `${key}[${i}][1]`, 1, n);
    if (left > right)
      throw new InputError("Range start must not exceed range end");
    return [left, right];
  });
}
function staticInput(raw: unknown) {
  const values = valuesInput(raw),
    queries = pairs(raw, "queries", values.length);
  return { values, queries };
}
function explainRange(
  events: EventDraft[],
  values: number[],
  left: number,
  right: number,
  answer: number,
  verb: string,
) {
  for (let i = left - 1; i < right; i++)
    events.push(
      event(
        "READ_INDEX",
        [`array:${i}`],
        `Inspect position ${i + 1} in range ${left}…${right}.`,
        { value: values[i] },
        1,
      ),
    );
  events.push(
    event(
      "ANNOTATE",
      [],
      `${verb} for positions ${left}…${right} is ${answer}.`,
      { variable: "answer", value: answer },
      1,
    ),
  );
}

const staticRangeMinimum = defineProblem({
  metadata: metadata({
    id: "static-range-minimum",
    title: "Static Range Minimum Queries",
    task: "1647",
    category: "Range Queries",
    renderer: "array",
    summary: "Answer minimum-value queries when the array never changes.",
    limits: "1–20 positive values and 1–20 inclusive ranges",
    tags: ["range queries", "sparse table", "minimum"],
    examples: [
      {
        input:
          '{"values":[3,2,4,5,1,1,5,3],"queries":[[2,4],[5,6],[1,8],[3,3]]}',
        output: "2\n1\n1\n4",
      },
    ],
    complexity: { time: "O(n log n + q)", space: "O(n log n)" },
    learning: {
      intuition:
        "A minimum over a fixed range can be covered by two power-of-two blocks.",
      approach: [
        "Precompute minima for blocks of length 1, 2, 4, and so on.",
        "For a query of length L, select the largest power of two no longer than L.",
        "Take the minimum of the blocks starting at the left end and ending at the right end.",
      ],
      explanation:
        "Those two blocks cover the full interval, and overlap does not change an idempotent minimum.",
    },
  }),
  defaultInput: {
    values: [3, 2, 4, 5, 1, 1, 5, 3],
    queries: [
      [2, 4],
      [5, 6],
      [1, 8],
      [3, 3],
    ] as Pair[],
  },
  source: `const table=[values.slice()];for(let p=1;(1<<p)<=values.length;p++){const size=1<<p,half=size>>1,prev=table[p-1];table[p]=Array.from({length:values.length-size+1},(_,i)=>Math.min(prev[i],prev[i+half]));}return queries.map(([a,b])=>{const p=Math.floor(Math.log2(b-a+1)),size=1<<p;return Math.min(table[p][a-1],table[p][b-size]);}).join('\\n');`,
  parseInput: staticInput,
  trace({ values, queries }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      table = [values.slice()];
    for (let power = 1; 2 ** power <= values.length; power++) {
      const size = 2 ** power,
        half = size / 2,
        previous = table[power - 1];
      table[power] = Array.from({ length: values.length - size + 1 }, (_, i) =>
        Math.min(previous[i], previous[i + half]),
      );
      events.push(
        event(
          "ANNOTATE",
          [],
          `Precompute minima of blocks of length ${size}.`,
          {},
          1,
        ),
      );
    }
    const answers: string[] = [];
    for (const [left, right] of queries) {
      const power = Math.floor(Math.log2(right - left + 1)),
        size = 2 ** power,
        answer = Math.min(table[power][left - 1], table[power][right - size]);
      explainRange(events, values, left, right, answer, "Minimum");
      answers.push(String(answer));
    }
    return { initialState: state, events, output: answers.join("\n") };
  },
});

const rangeXor = defineProblem({
  metadata: metadata({
    id: "range-xor-queries",
    title: "Range Xor Queries",
    task: "1650",
    category: "Range Queries",
    renderer: "array",
    summary: "Answer XOR queries using prefix cancellation.",
    limits: "1–20 values ≤1,000,000 and 1–20 inclusive ranges",
    tags: ["range queries", "prefix XOR", "bitwise"],
    examples: [
      {
        input:
          '{"values":[3,2,4,5,1,1,5,3],"queries":[[2,4],[5,6],[1,8],[3,3]]}',
        output: "3\n0\n6\n4",
      },
    ],
    complexity: { time: "O(n+q)", space: "O(n)" },
    learning: {
      intuition:
        "XORing a prefix twice cancels everything before the query range.",
      approach: [
        "Build a prefix XOR array with zero at position 0.",
        "For each inclusive range [a,b], XOR prefix[b] and prefix[a−1].",
        "The values before a appear twice and vanish.",
      ],
      explanation:
        "XOR is associative and x XOR x equals zero, so exactly the target range remains.",
    },
  }),
  defaultInput: {
    values: [3, 2, 4, 5, 1, 1, 5, 3],
    queries: [
      [2, 4],
      [5, 6],
      [1, 8],
      [3, 3],
    ] as Pair[],
  },
  source: `const prefix=[0];for(const value of values)prefix.push(prefix[prefix.length-1]^value);return queries.map(([a,b])=>prefix[b]^prefix[a-1]).join('\\n');`,
  parseInput: staticInput,
  trace({ values, queries }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      prefix = [0];
    for (const value of values) prefix.push(prefix.at(-1)! ^ value);
    const answers: string[] = [];
    for (const [left, right] of queries) {
      const answer = prefix[right] ^ prefix[left - 1];
      explainRange(events, values, left, right, answer, "XOR");
      answers.push(String(answer));
    }
    return { initialState: state, events, output: answers.join("\n") };
  },
});

type Triple = [number, number, number];
function dynamicInput(raw: unknown) {
  const values = valuesInput(raw),
    value = readObject(raw).operations;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new InputError("operations must contain 1–20 triples");
  const operations: Triple[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3)
      throw new InputError(`operations[${i}] must be [type,a,b]`);
    const type = integer(item[0], `operations[${i}][0]`, 1, 2),
      a = integer(item[1], `operations[${i}][1]`, 1, values.length),
      b = integer(
        item[2],
        `operations[${i}][2]`,
        type === 1 ? 1 : a,
        type === 1 ? 1_000_000 : values.length,
      );
    return [type, a, b];
  });
  if (!operations.some(([type]) => type === 2))
    throw new InputError("Include at least one range query");
  return { values, operations };
}

const dynamicRangeMinimum = defineProblem({
  metadata: metadata({
    id: "dynamic-range-minimum",
    title: "Dynamic Range Minimum Queries",
    task: "1649",
    category: "Range Queries",
    renderer: "array",
    summary: "Update array values and ask for range minima.",
    limits: "1–20 positive values, 1–20 update/query triples",
    tags: ["range queries", "segment tree", "minimum"],
    examples: [
      {
        input:
          '{"values":[3,2,4,5,1,1,5,3],"operations":[[2,1,4],[2,5,6],[1,2,3],[2,1,4]]}',
        output: "2\n1\n3",
      },
    ],
    complexity: { time: "O(n + q log n)", space: "O(n)" },
    learning: {
      intuition:
        "Keep the minimum for each interval in a binary tree of intervals.",
      approach: [
        "Build a segment tree with array values in leaves.",
        "An update changes one leaf and recomputes its ancestors.",
        "A query combines the minima of disjoint tree nodes covering its range.",
      ],
      explanation:
        "The tree stores exact minima for its intervals, and only O(log n) nodes change after a point update; a range has an O(log n) decomposition.",
    },
  }),
  defaultInput: {
    values: [3, 2, 4, 5, 1, 1, 5, 3],
    operations: [
      [2, 1, 4],
      [2, 5, 6],
      [1, 2, 3],
      [2, 1, 4],
    ] as Triple[],
  },
  source: `let size=1;while(size<values.length)size*=2;const tree=Array(size*2).fill(Infinity);values.forEach((value,i)=>tree[size+i]=value);for(let i=size-1;i>0;i--)tree[i]=Math.min(tree[2*i],tree[2*i+1]);const answers=[];for(const [type,a,b] of operations){if(type===1){let at=size+a-1;tree[at]=b;while(at>1){at=Math.floor(at/2);tree[at]=Math.min(tree[2*at],tree[2*at+1]);}}else{let left=size+a-1,right=size+b-1,best=Infinity;while(left<=right){if(left%2===1)best=Math.min(best,tree[left++]);if(right%2===0)best=Math.min(best,tree[right--]);left=Math.floor(left/2);right=Math.floor(right/2);}answers.push(best);}}return answers.join('\\n');`,
  parseInput: dynamicInput,
  trace({ values, operations }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      current = values.slice();
    let size = 1;
    while (size < values.length) size *= 2;
    const tree = Array<number>(size * 2).fill(Infinity);
    values.forEach((value, i) => {
      tree[size + i] = value;
    });
    for (let i = size - 1; i > 0; i--)
      tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
    const answers: string[] = [];
    for (const [type, a, b] of operations) {
      if (type === 1) {
        current[a - 1] = b;
        let at = size + a - 1;
        tree[at] = b;
        while (at > 1) {
          at = Math.floor(at / 2);
          tree[at] = Math.min(tree[2 * at], tree[2 * at + 1]);
        }
        events.push(
          event(
            "WRITE_INDEX",
            [`array:${a - 1}`],
            `Set position ${a} to ${b}, then refresh its segment-tree ancestors.`,
            { value: b },
            1,
          ),
        );
      } else {
        let left = size + a - 1,
          right = size + b - 1,
          best = Infinity;
        while (left <= right) {
          if (left % 2 === 1) best = Math.min(best, tree[left++]);
          if (right % 2 === 0) best = Math.min(best, tree[right--]);
          left = Math.floor(left / 2);
          right = Math.floor(right / 2);
        }
        explainRange(events, current, a, b, best, "Minimum");
        answers.push(String(best));
      }
    }
    return { initialState: state, events, output: answers.join("\n") };
  },
});

type RangeUpdate = [1, number, number, number] | [2, number];
function updateInput(raw: unknown) {
  const values = valuesInput(raw),
    value = readObject(raw).operations;
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new InputError("operations must contain 1–20 updates/queries");
  const operations: RangeUpdate[] = value.map((item, i) => {
    if (!Array.isArray(item))
      throw new InputError(`operations[${i}] must be an array`);
    const type = integer(item[0], `operations[${i}][0]`, 1, 2);
    if (type === 2 && item.length === 2)
      return [2, integer(item[1], `operations[${i}][1]`, 1, values.length)];
    if (type === 1 && item.length === 4) {
      const a = integer(item[1], `operations[${i}][1]`, 1, values.length),
        b = integer(item[2], `operations[${i}][2]`, a, values.length),
        delta = integer(item[3], `operations[${i}][3]`, 1, 1_000_000);
      return [1, a, b, delta];
    }
    throw new InputError(`operations[${i}] must be [1,a,b,delta] or [2,k]`);
  });
  if (!operations.some(([type]) => type === 2))
    throw new InputError("Include at least one point query");
  return { values, operations };
}

const rangeUpdateQueries = defineProblem({
  metadata: metadata({
    id: "range-update-queries",
    title: "Range Update Queries",
    task: "1651",
    category: "Range Queries",
    renderer: "array",
    summary: "Add to an inclusive range and read individual positions.",
    limits: "1–20 positive values, 1–20 updates/queries, increment ≤1,000,000",
    tags: ["range queries", "Fenwick tree", "difference array"],
    examples: [
      {
        input:
          '{"values":[3,2,4,5,1,1,5,3],"operations":[[2,4],[1,2,5,1],[2,4]]}',
        output: "5\n6",
      },
    ],
    complexity: { time: "O(n log n + q log n)", space: "O(n)" },
    learning: {
      intuition:
        "Adding to an interval changes only two boundaries of the difference array.",
      approach: [
        "Represent the original array by adjacent differences in a Fenwick tree.",
        "For update [a,b], add the increment at a and subtract it after b.",
        "Read position k by summing differences through k.",
      ],
      explanation:
        "Every updated position includes the start boundary and excludes the stop boundary; prefix summation reconstructs its current value.",
    },
  }),
  defaultInput: {
    values: [3, 2, 4, 5, 1, 1, 5, 3],
    operations: [
      [2, 4],
      [1, 2, 5, 1],
      [2, 4],
    ] as RangeUpdate[],
  },
  source: `const bit=Array(values.length+2).fill(0);function add(at,delta){for(;at<=values.length;at+=at&-at)bit[at]+=delta;}function read(at){let sum=0;for(;at>0;at-=at&-at)sum+=bit[at];return sum;}values.forEach((value,i)=>add(i+1,value-(values[i-1]||0)));const answers=[];for(const op of operations){if(op[0]===1){add(op[1],op[3]);add(op[2]+1,-op[3]);}else answers.push(read(op[1]));}return answers.join('\\n');`,
  parseInput: updateInput,
  trace({ values, operations }) {
    const state = numberState(values),
      events: EventDraft[] = [],
      current = values.slice(),
      bit = Array<number>(values.length + 2).fill(0);
    function add(at: number, delta: number) {
      for (; at <= values.length; at += at & -at) bit[at] += delta;
    }
    function read(at: number) {
      let sum = 0;
      for (; at > 0; at -= at & -at) sum += bit[at];
      return sum;
    }
    values.forEach((value, i) => add(i + 1, value - (values[i - 1] || 0)));
    const answers: string[] = [];
    for (const operation of operations) {
      if (operation[0] === 1) {
        const [, left, right, delta] = operation;
        add(left, delta);
        add(right + 1, -delta);
        for (let i = left - 1; i < right; i++) {
          current[i] += delta;
          events.push(
            event(
              "WRITE_INDEX",
              [`array:${i}`],
              `Range ${left}…${right} adds ${delta}; position ${i + 1} becomes ${current[i]}.`,
              { value: current[i] },
              1,
            ),
          );
        }
      } else {
        const answer = read(operation[1]);
        answers.push(String(answer));
        events.push(
          event(
            "READ_INDEX",
            [`array:${operation[1] - 1}`],
            `Prefix of differences gives value ${answer} at position ${operation[1]}.`,
            { value: answer },
            1,
          ),
        );
      }
    }
    return { initialState: state, events, output: answers.join("\n") };
  },
});

type Rectangle = [number, number, number, number];
function forestInput(raw: unknown) {
  const object = readObject(raw),
    value = object.rows;
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 8 ||
    !value.every(
      (row) =>
        typeof row === "string" &&
        row.length === value.length &&
        /^[.*]+$/.test(row),
    )
  )
    throw new InputError("rows must be a 1–8 square forest of . and *");
  const rows = value as string[],
    n = rows.length,
    q = object.queries;
  if (!Array.isArray(q) || q.length < 1 || q.length > 20)
    throw new InputError("queries must contain 1–20 rectangles");
  const queries: Rectangle[] = q.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 4)
      throw new InputError(`queries[${i}] must be [y1,x1,y2,x2]`);
    const y1 = integer(item[0], `queries[${i}][0]`, 1, n),
      x1 = integer(item[1], `queries[${i}][1]`, 1, n),
      y2 = integer(item[2], `queries[${i}][2]`, y1, n),
      x2 = integer(item[3], `queries[${i}][3]`, x1, n);
    return [y1, x1, y2, x2];
  });
  return { rows, queries };
}

const forestQueries = defineProblem({
  metadata: metadata({
    id: "forest-queries",
    title: "Forest Queries",
    task: "1652",
    category: "Range Queries",
    renderer: "grid",
    summary: "Count trees inside each rectangular map region.",
    limits: "1–8 square grid of . and *, 1–20 inclusive rectangles",
    tags: ["2D prefix sums", "range queries", "inclusion-exclusion"],
    examples: [
      {
        input:
          '{"rows":[".*..","*.**","**..","****"],"queries":[[2,2,3,4],[3,1,3,1],[1,1,2,2]]}',
        output: "3\n1\n2",
      },
    ],
    complexity: { time: "O(n² + q)", space: "O(n²)" },
    learning: {
      intuition:
        "Four overlapping corner prefixes isolate exactly one rectangle.",
      approach: [
        "Build cumulative tree counts for every upper-left rectangle.",
        "Take the count through the lower-right corner.",
        "Subtract the strips above and left, then restore their overlap.",
      ],
      explanation:
        "Inclusion-exclusion counts every desired cell once while canceling cells outside the requested rectangle.",
    },
  }),
  defaultInput: {
    rows: [".*..", "*.**", "**..", "****"],
    queries: [
      [2, 2, 3, 4],
      [3, 1, 3, 1],
      [1, 1, 2, 2],
    ] as Rectangle[],
  },
  source: `const n=rows.length,p=Array.from({length:n+1},()=>Array(n+1).fill(0));for(let y=1;y<=n;y++)for(let x=1;x<=n;x++)p[y][x]=p[y-1][x]+p[y][x-1]-p[y-1][x-1]+(rows[y-1][x-1]==='*'?1:0);return queries.map(([y1,x1,y2,x2])=>p[y2][x2]-p[y1-1][x2]-p[y2][x1-1]+p[y1-1][x1-1]).join('\\n');`,
  parseInput: forestInput,
  trace({ rows, queries }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      n = rows.length,
      prefix = Array.from({ length: n + 1 }, () =>
        Array<number>(n + 1).fill(0),
      );
    for (let y = 1; y <= n; y++)
      for (let x = 1; x <= n; x++) {
        const id = `grid:${y - 1}:${x - 1}`;
        state.entities[id] = {
          id,
          kind: "grid",
          label: rows[y - 1][x - 1],
          status: "idle",
          value: rows[y - 1][x - 1] === "*" ? 1 : 0,
          metadata: { row: y - 1, col: x - 1 },
        };
        prefix[y][x] =
          prefix[y - 1][x] +
          prefix[y][x - 1] -
          prefix[y - 1][x - 1] +
          (rows[y - 1][x - 1] === "*" ? 1 : 0);
      }
    for (const [y1, x1, y2, x2] of queries) {
      let answer =
        prefix[y2][x2] -
        prefix[y1 - 1][x2] -
        prefix[y2][x1 - 1] +
        prefix[y1 - 1][x1 - 1];
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          events.push(
            event(
              "VISIT_CELL",
              [`grid:${y - 1}:${x - 1}`],
              `Inspect cell (${y},${x}) in the requested rectangle.`,
              {},
              1,
            ),
          );
      events.push(
        event(
          "ANNOTATE",
          [],
          `Rectangle (${y1},${x1})…(${y2},${x2}) contains ${answer} trees.`,
          { variable: "trees", value: answer },
          1,
          {
            schemaVersion: "0.1",
            equation: `${prefix[y2][x2]} − ${prefix[y1 - 1][x2]} − ${prefix[y2][x1 - 1]} + ${prefix[y1 - 1][x1 - 1]} = ${answer}`,
            reason:
              "Remove top and left strips, then restore their shared corner.",
          },
        ),
      );
    }
    return {
      initialState: state,
      events,
      output: queries
        .map(([y1, x1, y2, x2]) =>
          String(
            prefix[y2][x2] -
              prefix[y1 - 1][x2] -
              prefix[y2][x1 - 1] +
              prefix[y1 - 1][x1 - 1],
          ),
        )
        .join("\n"),
    };
  },
});

export const rangeAlgorithmProblems = [
  entry(staticRangeMinimum),
  entry(dynamicRangeMinimum),
  entry(rangeXor),
  entry(rangeUpdateQueries),
  entry(forestQueries),
];
