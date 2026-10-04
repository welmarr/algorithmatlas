import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  InputError,
  readObject,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import {
  entry,
  event,
  metadata,
  numberState,
  numbers,
} from "./extended-shared";

function dpState(rows: number, columns: number) {
  const state = emptyState();
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const id = `dp:${row}:${column}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: `${row},${column}`,
        value: 0,
        status: "idle",
      };
    }
  return state;
}

const digitQueries = defineProblem({
  metadata: metadata({
    id: "digit-queries",
    title: "Digit Queries",
    task: "2431",
    category: "Introductory Problems",
    renderer: "variables",
    summary:
      "Find digits in the infinite concatenation 1234567891011… without constructing it.",
    limits:
      "1–16 1-indexed positions, each at most 10^18 (decimal strings allowed)",
    tags: ["place value", "arithmetic"],
    examples: [{ input: '{"positions":["7","19","12"]}', output: "7\n4\n1" }],
    complexity: { time: "O(19 × queries)", space: "O(1) beyond answers" },
    learning: {
      intuition:
        "One-digit, two-digit, and larger numbers occupy blocks with predictable total lengths.",
      approach: [
        "Subtract whole digit-length blocks from each position.",
        "Locate the containing number within the remaining block.",
        "Select the offset digit inside that number.",
      ],
      explanation:
        "Each subtraction skips exactly all digits from one complete number-length group, so the residual position identifies one digit unambiguously.",
    },
  }),
  defaultInput: { positions: ["7", "19", "12"] },
  source: `return positions.map(raw=>{let k=BigInt(raw),digits=1n,start=1n,count=9n;
while(k>digits*count){k-=digits*count;digits++;start*=10n;count*=10n;}
const number=start+(k-1n)/digits; return number.toString()[Number((k-1n)%digits)];}).join('\\n');`,
  parseInput(raw) {
    const value = readObject(raw).positions;
    if (!Array.isArray(value) || value.length < 1 || value.length > 16)
      throw new InputError("positions must contain 1–16 integers");
    const positions = value.map((item, i) => {
      if (
        (typeof item !== "string" || !/^[1-9][0-9]{0,18}$/.test(item)) &&
        (typeof item !== "number" || !Number.isSafeInteger(item) || item < 1)
      )
        throw new InputError(
          `positions[${i}] must be a positive safe integer or decimal string`,
        );
      const position = BigInt(item);
      if (position > 1_000_000_000_000_000_000n)
        throw new InputError(`positions[${i}] must be at most 10^18`);
      return position.toString();
    });
    return { positions };
  },
  trace({ positions }) {
    const initialState = emptyState();
    initialState.variables = { digit: 0 };
    const events: EventDraft[] = [],
      answers: string[] = [];
    for (const raw of positions) {
      let position = BigInt(raw),
        digits = 1n,
        start = 1n,
        count = 9n;
      while (position > digits * count) {
        position -= digits * count;
        digits++;
        start *= 10n;
        count *= 10n;
      }
      const number = start + (position - 1n) / digits;
      const offset = Number((position - 1n) % digits);
      const digit = number.toString()[offset];
      answers.push(digit);
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Position ${raw} falls in the ${digits}-digit block: number ${number}, digit ${offset + 1} is ${digit}.`,
          { variable: "digit", value: Number(digit) },
          2,
          {
            schemaVersion: "0.1",
            equation: `${start} + floor((${position} − 1)/${digits}) = ${number}`,
            reason: "Skip complete blocks before indexing one number.",
          },
        ),
      );
    }
    return { initialState, events, output: answers.join("\n") };
  },
});

const arrayDivision = defineProblem({
  metadata: metadata({
    id: "array-division",
    title: "Array Division",
    task: "1085",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Split a positive array into k consecutive parts minimizing the largest part sum.",
    limits: "1–32 positive values; 1 ≤ k ≤ length",
    tags: ["binary search", "monotone predicate", "greedy"],
    examples: [{ input: '{"values":[2,4,7,3,5],"k":3}', output: "8" }],
    complexity: { time: "O(n log sum)", space: "O(1) beyond input" },
    learning: {
      intuition:
        "If a maximum sum is feasible, every larger maximum is feasible too.",
      approach: [
        "Search from the largest element to the total sum.",
        "For each candidate maximum, greedily start a new part only when needed.",
        "Keep the smallest feasible maximum.",
      ],
      explanation:
        "Greedy filling uses the fewest parts for a fixed limit; extra splits can reach exactly k nonempty parts when that minimum is at most k.",
    },
  }),
  defaultInput: { values: [2, 4, 7, 3, 5], k: 3 },
  source: `let low=Math.max(...values),high=values.reduce((a,b)=>a+b,0);
while(low<high){const mid=Math.floor((low+high)/2);let parts=1,sum=0;for(const value of values){if(sum+value>mid){parts++;sum=0;}sum+=value;}if(parts<=k)high=mid;else low=mid+1;}return low;`,
  parseInput(raw) {
    const values = numbers(raw, "values", 1, 32, 1, 1_000_000_000);
    const k = integer(readObject(raw).k, "k", 1, values.length);
    return { values, k };
  },
  trace({ values, k }) {
    let low = Math.max(...values),
      high = values.reduce((sum, value) => sum + value, 0);
    const events: EventDraft[] = [];
    while (low < high) {
      const candidate = Math.floor((low + high) / 2);
      let parts = 1,
        sum = 0;
      values.forEach((value, i) => {
        if (sum + value > candidate) {
          parts++;
          sum = 0;
        }
        sum += value;
        events.push(
          event(
            "READ_INDEX",
            [`array:${i}`],
            `With limit ${candidate}, add ${value} to part ${parts}; its sum is ${sum}.`,
            { value },
            2,
          ),
        );
      });
      const fits = parts <= k;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Limit ${candidate} needs ${parts} parts, so it is ${fits ? "feasible" : "too small"}.`,
          { variable: "candidateLimit", value: candidate },
          3,
          {
            schemaVersion: "0.1",
            equation: `${parts} ${fits ? "≤" : ">"} ${k} allowed parts`,
            reason: "Feasibility is monotone as the maximum allowed sum rises.",
          },
        ),
      );
      if (fits) high = candidate;
      else low = candidate + 1;
    }
    events.push(
      event(
        "UPDATE_VALUE",
        [],
        `The minimum feasible largest part sum is ${low}.`,
        { variable: "optimalLimit", value: low },
        4,
      ),
    );
    return { initialState: numberState(values), events, output: String(low) };
  },
});

const removalGame = defineProblem({
  metadata: metadata({
    id: "removal-game",
    title: "Removal Game",
    task: "1097",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Find the first player's score when both players choose optimally from either end.",
    limits: "1–12 signed values",
    tags: ["interval DP", "optimal play"],
    examples: [{ input: '{"values":[4,5,1,3]}', output: "8" }],
    complexity: { time: "O(n²)", space: "O(n²)" },
    learning: {
      intuition:
        "For a remaining interval, compare the advantage from taking its left or right end.",
      approach: [
        "Set single-item advantage to that item.",
        "For each wider interval, subtract the opponent's best response from either end choice.",
        "Convert the final score difference to the first player's total.",
      ],
      explanation:
        "The recursive advantage already assumes optimal response, so maximizing the two endpoint choices solves each interval exactly.",
    },
  }),
  defaultInput: { values: [4, 5, 1, 3] },
  source: `const n=values.length,dp=Array.from({length:n},()=>Array(n).fill(0));
for(let i=0;i<n;i++)dp[i][i]=values[i];for(let length=2;length<=n;length++)for(let l=0;l+length<=n;l++){const r=l+length-1;dp[l][r]=Math.max(values[l]-dp[l+1][r],values[r]-dp[l][r-1]);}
return (values.reduce((a,b)=>a+b,0)+dp[0][n-1])/2;`,
  parseInput(raw) {
    return {
      values: numbers(raw, "values", 1, 12, -1_000_000_000, 1_000_000_000),
    };
  },
  trace({ values }) {
    const n = values.length,
      state = dpState(n, n),
      events: EventDraft[] = [];
    const dp = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      dp[i][i] = values[i];
      events.push(
        event(
          "DP_BASE_CASE",
          [`dp:${i}:${i}`],
          `The only move on [${i + 1},${i + 1}] scores ${values[i]}.`,
          { value: values[i] },
          1,
        ),
      );
    }
    for (let length = 2; length <= n; length++)
      for (let left = 0; left + length <= n; left++) {
        const right = left + length - 1;
        const takeLeft = values[left] - dp[left + 1][right];
        const takeRight = values[right] - dp[left][right - 1];
        dp[left][right] = Math.max(takeLeft, takeRight);
        events.push(
          event(
            "DP_UPDATE",
            [
              `dp:${left}:${right}`,
              `dp:${left + 1}:${right}`,
              `dp:${left}:${right - 1}`,
            ],
            `Interval ${left + 1}–${right + 1}: take ${takeLeft >= takeRight ? "left" : "right"}; advantage ${dp[left][right]}.`,
            { value: dp[left][right] },
            2,
            {
              schemaVersion: "0.1",
              equation: `max(${takeLeft}, ${takeRight}) = ${dp[left][right]}`,
              reason: "Subtract the other player's best attainable advantage.",
            },
          ),
        );
      }
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      initialState: state,
      events,
      output: String((total + dp[0][n - 1]) / 2),
    };
  },
});

const longestCommonSubsequence = defineProblem({
  metadata: metadata({
    id: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    task: "3403",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Recover a longest sequence that appears in order within both integer arrays.",
    limits: "1–12 positive integers in each array",
    tags: ["2D DP", "sequence reconstruction"],
    examples: [{ input: '{"first":[1,3,2],"second":[1,2]}', output: "2\n1 2" }],
    complexity: { time: "O(nm)", space: "O(nm)" },
    learning: {
      intuition:
        "Matching last elements extend a shorter common subsequence; a mismatch discards one last element.",
      approach: [
        "Fill a prefix-pair length table.",
        "Use diagonal +1 for equal values, otherwise the better neighboring prefix.",
        "Walk backward through the table to recover one optimal sequence.",
      ],
      explanation:
        "The recurrence covers both ways to drop a mismatching suffix; reconstruction follows only choices that preserve the optimal length.",
    },
  }),
  defaultInput: { first: [1, 3, 2], second: [1, 2] },
  source: `const n=first.length,m=second.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=first[i-1]===second[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
const result=[];let i=n,j=m;while(i&&j){if(first[i-1]===second[j-1]){result.push(first[i-1]);i--;j--;}else if(dp[i-1][j]>=dp[i][j-1])i--;else j--;}
result.reverse();return result.length+(result.length?'\\n'+result.join(' '):'');`,
  parseInput(raw) {
    return {
      first: numbers(raw, "first", 1, 12, 1, 1_000_000_000),
      second: numbers(raw, "second", 1, 12, 1, 1_000_000_000),
    };
  },
  trace({ first, second }) {
    const n = first.length,
      m = second.length,
      state = dpState(n + 1, m + 1),
      events: EventDraft[] = [];
    const dp = Array.from({ length: n + 1 }, () =>
      Array<number>(m + 1).fill(0),
    );
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        const same = first[i - 1] === second[j - 1];
        dp[i][j] = same
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
        events.push(
          event(
            "DP_UPDATE",
            [`dp:${i}:${j}`, `dp:${i - 1}:${j}`, `dp:${i}:${j - 1}`],
            `${first[i - 1]} ${same ? "matches" : "differs from"} ${second[j - 1]}; prefix-pair optimum is ${dp[i][j]}.`,
            { value: dp[i][j] },
            2,
            {
              schemaVersion: "0.1",
              equation: same
                ? `${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}`
                : `max(${dp[i - 1][j]}, ${dp[i][j - 1]}) = ${dp[i][j]}`,
              reason: same
                ? "Extend a shared final value."
                : "Drop one mismatching final value.",
            },
          ),
        );
      }
    const result: number[] = [];
    let i = n,
      j = m;
    while (i && j) {
      if (first[i - 1] === second[j - 1]) {
        result.push(first[i - 1]);
        events.push(
          event(
            "ANNOTATE",
            [],
            `Recover shared value ${first[i - 1]} at (${i}, ${j}).`,
            {},
            3,
          ),
        );
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
      else j--;
    }
    result.reverse();
    return {
      initialState: state,
      events,
      output: `${result.length}${result.length ? `\n${result.join(" ")}` : ""}`,
    };
  },
});

const josephusProblemI = defineProblem({
  metadata: metadata({
    id: "josephus-problem-i",
    title: "Josephus Problem I",
    task: "2162",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Remove every second child around a circle until none remain.",
    limits: "1–32 children for interactive tracing",
    tags: ["queue", "simulation"],
    examples: [{ input: '{"n":7}', output: "2 4 6 1 5 3 7" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "The child who survives this turn moves to the back of the circle; the next child leaves.",
      approach: [
        "Queue children in numbered order.",
        "Move one child to the queue back.",
        "Remove the next child and repeat.",
      ],
      explanation:
        "Rotating the survivor preserves the circle's order, so each removal is exactly every second remaining child.",
    },
  }),
  defaultInput: { n: 7 },
  source: `const queue=Array.from({length:n},(_,i)=>i+1),answer=[];let head=0;
while(head<queue.length){queue.push(queue[head++]);answer.push(queue[head++]);}return answer.join(' ');`,
  parseInput(raw) {
    return { n: integer(readObject(raw).n, "n", 1, 32) };
  },
  trace({ n }) {
    const values = Array.from({ length: n }, (_, i) => i + 1),
      queue = [...values],
      answer: number[] = [],
      events: EventDraft[] = [];
    let head = 0;
    while (head < queue.length) {
      const survivor = queue[head++];
      queue.push(survivor);
      const removed = queue[head++];
      answer.push(removed);
      events.push(
        event(
          "READ_INDEX",
          [`array:${removed - 1}`],
          `After ${survivor} survives, remove child ${removed}.`,
          { value: removed },
          2,
        ),
      );
      events.push(
        event(
          "MARK",
          [`array:${removed - 1}`],
          `Child ${removed} leaves the circle.`,
          { status: "visited" },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${n - answer.length} children remain.`,
          { variable: "remaining", value: n - answer.length },
          3,
        ),
      );
    }
    return {
      initialState: numberState(values),
      events,
      output: answer.join(" "),
    };
  },
});

export const wave200DpSearchProblems = [
  entry(digitQueries),
  entry(arrayDivision),
  entry(removalGame),
  entry(longestCommonSubsequence),
  entry(josephusProblemI),
];
