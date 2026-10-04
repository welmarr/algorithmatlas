import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata, numbers } from "./extended-shared";

const mod = 1_000_000_007;
function dpState(length: number, columns?: number) {
  const state = emptyState();
  for (let i = 0; i < length; i++)
    for (let j = 0; j < (columns ?? 1); j++) {
      const id = columns === undefined ? `dp:${i}` : `dp:${i}:${j}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: columns === undefined ? String(i) : `${i},${j}`,
        value: 0,
        status: "idle",
      };
    }
  return state;
}
function coinInput(raw: unknown) {
  const coins = numbers(raw, "coins", 1, 8, 1, 30);
  if (new Set(coins).size !== coins.length)
    throw new InputError("coin values must be distinct");
  return { coins, target: integer(readObject(raw).target, "target", 1, 30) };
}
function coinMetadata(input: {
  id: string;
  title: string;
  task: string;
  summary: string;
  tags: string[];
  example: string;
  output: string;
  intuition: string;
  approach: string[];
  explanation: string;
}) {
  return metadata({
    id: input.id,
    title: input.title,
    task: input.task,
    category: "Dynamic Programming",
    renderer: "dp",
    summary: input.summary,
    limits: "1–8 distinct coin values (1–30); target 1–30",
    tags: input.tags,
    examples: [{ input: input.example, output: input.output }],
    complexity: { time: "O(coins × target)", space: "O(target)" },
    learning: {
      intuition: input.intuition,
      approach: input.approach,
      explanation: input.explanation,
    },
  });
}

const minimizingCoins = defineProblem({
  metadata: coinMetadata({
    id: "minimizing-coins",
    title: "Minimizing Coins",
    task: "1634",
    summary:
      "Use unlimited coin values to make a target with as few coins as possible.",
    tags: ["DP", "coin change"],
    example: '{"coins":[1,5,7],"target":11}',
    output: "3",
    intuition:
      "The last coin leaves a smaller amount that must itself use as few coins as possible.",
    approach: [
      "Set dp[0] to zero coins.",
      "For each amount, try every coin that fits.",
      "Take one plus the cheapest reachable predecessor.",
    ],
    explanation:
      "Every solution has some last coin, so the best predecessor plus one covers all possibilities.",
  }),
  defaultInput: { coins: [1, 5, 7], target: 11 },
  source: `const dp=Array(target+1).fill(Infinity); dp[0]=0;\nfor(let sum=1;sum<=target;sum++) for(const coin of coins) if(sum>=coin) dp[sum]=Math.min(dp[sum],dp[sum-coin]+1);\nreturn Number.isFinite(dp[target])?dp[target]:-1;`,
  parseInput: coinInput,
  trace({ coins, target }) {
    const state = dpState(target + 1),
      events: EventDraft[] = [],
      dp = Array<number>(target + 1).fill(Infinity);
    dp[0] = 0;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "Zero coins are needed to make zero.",
        { value: 0 },
        1,
      ),
    );
    for (let sum = 1; sum <= target; sum++)
      for (const coin of coins)
        if (sum >= coin && Number.isFinite(dp[sum - coin])) {
          events.push(
            event(
              "DP_READ",
              [`dp:${sum - coin}`],
              `Try coin ${coin} after amount ${sum - coin}.`,
              { variable: "previous", value: dp[sum - coin] },
              2,
            ),
          );
          const candidate = dp[sum - coin] + 1;
          if (candidate < dp[sum]) {
            dp[sum] = candidate;
            events.push(
              event(
                "DP_UPDATE",
                [`dp:${sum}`, `dp:${sum - coin}`],
                `Amount ${sum} now needs ${candidate} coins using ${coin} last.`,
                { value: candidate },
                3,
                {
                  schemaVersion: "0.1",
                  equation: `dp[${sum - coin}] + 1 = ${candidate}`,
                  reason: "Choose the best last coin seen so far.",
                },
              ),
            );
          }
        }
    return {
      initialState: state,
      events,
      output: Number.isFinite(dp[target]) ? String(dp[target]) : "-1",
    };
  },
});

const coinCombinationsI = defineProblem({
  metadata: coinMetadata({
    id: "coin-combinations-i",
    title: "Coin Combinations I",
    task: "1635",
    summary:
      "Count ordered sequences of unlimited coins that reach the target.",
    tags: ["DP", "ordered counting"],
    example: '{"coins":[2,3,5],"target":9}',
    output: "8",
    intuition:
      "The final coin distinguishes ordered sequences with the same total.",
    approach: [
      "Count the empty sequence for sum zero.",
      "For each amount, add predecessor counts for every possible last coin.",
      "Reduce each count modulo one billion and seven.",
    ],
    explanation:
      "Every ordered sequence has one last coin, so predecessor families are disjoint.",
  }),
  defaultInput: { coins: [2, 3, 5], target: 9 },
  source: `const dp=Array(target+1).fill(0); dp[0]=1;\nfor(let sum=1;sum<=target;sum++) for(const coin of coins) if(sum>=coin) dp[sum]=(dp[sum]+dp[sum-coin])%1000000007;\nreturn dp[target];`,
  parseInput: coinInput,
  trace({ coins, target }) {
    const state = dpState(target + 1),
      events: EventDraft[] = [],
      dp = Array<number>(target + 1).fill(0);
    dp[0] = 1;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "The empty sequence makes sum zero in one way.",
        { value: 1 },
        1,
      ),
    );
    for (let sum = 1; sum <= target; sum++)
      for (const coin of coins)
        if (sum >= coin) {
          const previous = dp[sum];
          dp[sum] = (dp[sum] + dp[sum - coin]) % mod;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${sum}`, `dp:${sum - coin}`],
              `For ${sum}, append coin ${coin}: ${previous} + ${dp[sum - coin]} gives ${dp[sum]} ordered ways.`,
              { value: dp[sum] },
              2,
              {
                schemaVersion: "0.1",
                equation: `${previous} + ${dp[sum - coin]} ≡ ${dp[sum]} (mod ${mod})`,
                reason: "The last coin fixes a unique ordered-sequence family.",
              },
            ),
          );
        }
    return { initialState: state, events, output: String(dp[target]) };
  },
});

const coinCombinationsII = defineProblem({
  metadata: coinMetadata({
    id: "coin-combinations-ii",
    title: "Coin Combinations II",
    task: "1636",
    summary: "Count coin multisets that reach the target, ignoring order.",
    tags: ["DP", "unordered counting"],
    example: '{"coins":[2,3,5],"target":9}',
    output: "3",
    intuition:
      "Processing one coin type at a time gives each multiset one construction order.",
    approach: [
      "Count the empty multiset for sum zero.",
      "For each coin type, scan sums upward so it may be reused.",
      "Add ways from the current sum minus that coin.",
    ],
    explanation:
      "The outer coin loop prevents counting permutations of the same multiset more than once.",
  }),
  defaultInput: { coins: [2, 3, 5], target: 9 },
  source: `const dp=Array(target+1).fill(0); dp[0]=1;\nfor(const coin of coins) for(let sum=coin;sum<=target;sum++) dp[sum]=(dp[sum]+dp[sum-coin])%1000000007;\nreturn dp[target];`,
  parseInput: coinInput,
  trace({ coins, target }) {
    const state = dpState(target + 1),
      events: EventDraft[] = [],
      dp = Array<number>(target + 1).fill(0);
    dp[0] = 1;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "The empty multiset makes sum zero in one way.",
        { value: 1 },
        1,
      ),
    );
    for (const coin of coins)
      for (let sum = coin; sum <= target; sum++) {
        const previous = dp[sum];
        dp[sum] = (dp[sum] + dp[sum - coin]) % mod;
        events.push(
          event(
            "DP_UPDATE",
            [`dp:${sum}`, `dp:${sum - coin}`],
            `After allowing coin ${coin}, sum ${sum} has ${dp[sum]} combinations.`,
            { value: dp[sum] },
            2,
            {
              schemaVersion: "0.1",
              equation: `${previous} + ${dp[sum - coin]} ≡ ${dp[sum]} (mod ${mod})`,
              reason:
                "Reuse this coin while keeping coin types in one fixed order.",
            },
          ),
        );
      }
    return { initialState: state, events, output: String(dp[target]) };
  },
});

const removingDigits = defineProblem({
  metadata: metadata({
    id: "removing-digits",
    title: "Removing Digits",
    task: "1637",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Find the fewest steps to reach zero by subtracting a digit currently present.",
    limits: "starting number 1–64",
    tags: ["DP", "digit recurrence"],
    examples: [{ input: '{"n":27}', output: "5" }],
    complexity: { time: "O(n × digits(n))", space: "O(n)" },
    learning: {
      intuition:
        "Each legal digit subtraction reaches a smaller number whose best answer is already known.",
      approach: [
        "Set dp[0] to zero steps.",
        "For each positive number, inspect its nonzero digits.",
        "Take one plus the fewest steps of a reachable predecessor.",
      ],
      explanation:
        "Every first move subtracts one of the current digits, and the recurrence compares all such moves.",
    },
  }),
  defaultInput: { n: 27 },
  source: `const dp=Array(n+1).fill(Infinity); dp[0]=0;\nfor(let value=1;value<=n;value++) for(const char of String(value)) { const digit=Number(char); if(digit) dp[value]=Math.min(dp[value],dp[value-digit]+1); }\nreturn dp[n];`,
  parseInput(raw) {
    return { n: integer(readObject(raw).n, "n", 1, 64) };
  },
  trace({ n }) {
    const state = dpState(n + 1),
      events: EventDraft[] = [],
      dp = Array<number>(n + 1).fill(Infinity);
    dp[0] = 0;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "Zero takes no subtraction steps.",
        { value: 0 },
        1,
      ),
    );
    for (let value = 1; value <= n; value++)
      for (const char of String(value)) {
        const digit = Number(char);
        if (!digit) continue;
        const candidate = dp[value - digit] + 1;
        if (candidate < dp[value]) {
          dp[value] = candidate;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${value}`, `dp:${value - digit}`],
              `Subtract digit ${digit} from ${value}; best is ${candidate} steps.`,
              { value: candidate },
              2,
              {
                schemaVersion: "0.1",
                equation: `1 + dp[${value - digit}] = ${candidate}`,
                reason: "Choose the best legal first digit subtraction.",
              },
            ),
          );
        }
      }
    return { initialState: state, events, output: String(dp[n]) };
  },
});

function bookInput(raw: unknown) {
  const prices = numbers(raw, "prices", 1, 10, 1, 30),
    pages = numbers(raw, "pages", prices.length, prices.length, 1, 100);
  return {
    prices,
    pages,
    budget: integer(readObject(raw).budget, "budget", 1, 40),
  };
}
const bookShop = defineProblem({
  metadata: metadata({
    id: "book-shop",
    title: "Book Shop",
    task: "1158",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Maximize purchased pages while buying each book at most once within budget.",
    limits: "1–10 books, price 1–30, pages 1–100, budget 1–40",
    tags: ["DP", "0/1 knapsack"],
    examples: [
      {
        input: '{"prices":[4,8,5,3],"pages":[5,12,8,1],"budget":10}',
        output: "13",
      },
    ],
    complexity: { time: "O(books × budget)", space: "O(budget)" },
    learning: {
      intuition:
        "For each book, a budget state either keeps its old value or buys this book once.",
      approach: [
        "Initialize all budgets to zero pages.",
        "For each book, scan budgets downward.",
        "Compare skipping with buying from the previous budget state.",
      ],
      explanation:
        "Descending budget order prevents the current book from being reused in the same iteration.",
    },
  }),
  defaultInput: { prices: [4, 8, 5, 3], pages: [5, 12, 8, 1], budget: 10 },
  source: `const dp=Array(budget+1).fill(0);\nfor(let i=0;i<prices.length;i++) for(let money=budget;money>=prices[i];money--) dp[money]=Math.max(dp[money],dp[money-prices[i]]+pages[i]);\nreturn dp[budget];`,
  parseInput: bookInput,
  trace({ prices, pages, budget }) {
    const state = dpState(budget + 1),
      events: EventDraft[] = [],
      dp = Array<number>(budget + 1).fill(0);
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "No spending yields zero pages.",
        { value: 0 },
        1,
      ),
    );
    for (let i = 0; i < prices.length; i++)
      for (let money = budget; money >= prices[i]; money--) {
        const candidate = dp[money - prices[i]] + pages[i];
        if (candidate > dp[money]) {
          dp[money] = candidate;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${money}`, `dp:${money - prices[i]}`],
              `Book ${i + 1} gives ${candidate} pages within budget ${money}.`,
              { value: candidate },
              2,
              {
                schemaVersion: "0.1",
                equation: `${dp[money - prices[i]]} + ${pages[i]} = ${candidate}`,
                reason:
                  "Descending budgets ensure this book is bought at most once.",
              },
            ),
          );
        }
      }
    return { initialState: state, events, output: String(dp[budget]) };
  },
});

function gridInput(raw: unknown) {
  const rows = readObject(raw).rows;
  if (
    !Array.isArray(rows) ||
    rows.length < 1 ||
    rows.length > 8 ||
    !rows.every(
      (row) =>
        typeof row === "string" &&
        row.length === rows.length &&
        /^[.*]+$/.test(row),
    )
  )
    throw new InputError("rows must be a square 1–8 grid of . and *");
  return { rows: rows as string[] };
}
const gridPathsI = defineProblem({
  metadata: metadata({
    id: "grid-paths-i",
    title: "Grid Paths I",
    task: "1638",
    category: "Dynamic Programming",
    renderer: "grid",
    summary: "Count right/down paths around blocked cells in a square grid.",
    limits: "square grid 1–8 with . open and * blocked",
    tags: ["DP", "grid paths"],
    examples: [
      { input: '{"rows":["....",".*..","...*","*..."]}', output: "3" },
    ],
    complexity: { time: "O(n²)", space: "O(n²) for the visual grid" },
    learning: {
      intuition:
        "An open cell receives paths only from the cell above and the one to its left.",
      approach: [
        "Set the start to one way if it is open.",
        "Skip traps.",
        "For each open cell, add counts from top and left modulo one billion and seven.",
      ],
      explanation:
        "Every right/down path has exactly one final move into a cell, so the two predecessor path sets are disjoint.",
    },
  }),
  defaultInput: { rows: ["....", ".*..", "...*", "*..."] },
  source: `const n=rows.length,dp=Array.from({length:n},()=>Array(n).fill(0)); if(rows[0][0]==='.')dp[0][0]=1;\nfor(let r=0;r<n;r++) for(let c=0;c<n;c++) if(rows[r][c]==='.' && (r||c)) dp[r][c]=((r?dp[r-1][c]:0)+(c?dp[r][c-1]:0))%1000000007;\nreturn dp[n-1][n-1];`,
  parseInput: gridInput,
  trace({ rows }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      n = rows.length,
      dp = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const id = `grid:${r}:${c}`;
        state.entities[id] = {
          id,
          kind: "grid",
          label: rows[r][c],
          status: rows[r][c] === "*" ? "blocked" : "idle",
          value: 0,
          metadata: { row: r, col: c },
        };
      }
    if (rows[0][0] === ".") {
      dp[0][0] = 1;
      events.push(
        event(
          "SET_CELL_DISTANCE",
          ["grid:0:0"],
          "One empty path starts at the upper-left cell.",
          { value: 1 },
          1,
        ),
      );
    } else
      events.push(
        event(
          "ANNOTATE",
          [],
          "The start is blocked; no route can begin.",
          {},
          1,
        ),
      );
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (rows[r][c] === "." && (r || c)) {
          const fromTop = r ? dp[r - 1][c] : 0,
            fromLeft = c ? dp[r][c - 1] : 0;
          dp[r][c] = (fromTop + fromLeft) % mod;
          events.push(
            event(
              "SET_CELL_DISTANCE",
              [`grid:${r}:${c}`],
              `Cell (${r + 1},${c + 1}) gets ${fromTop} paths from above and ${fromLeft} from left.`,
              { value: dp[r][c] },
              2,
              {
                schemaVersion: "0.1",
                equation: `${fromTop} + ${fromLeft} ≡ ${dp[r][c]} (mod ${mod})`,
                reason: "A path's last move is either down or right.",
              },
            ),
          );
        }
    return { initialState: state, events, output: String(dp[n - 1][n - 1]) };
  },
});

const moneySums = defineProblem({
  metadata: metadata({
    id: "money-sums",
    title: "Money Sums",
    task: "1745",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "List every positive total obtainable by choosing each coin at most once.",
    limits: "1–8 coins, each value 1–12",
    tags: ["DP", "subset sum"],
    examples: [
      { input: '{"coins":[4,2,5,2]}', output: "9\n2 4 5 6 7 8 9 11 13" },
    ],
    complexity: { time: "O(coins × total sum)", space: "O(total sum)" },
    learning: {
      intuition:
        "Each coin can extend every sum reachable before that coin was considered.",
      approach: [
        "Mark sum zero as reachable.",
        "For each coin, scan totals downward and mark old sum plus coin.",
        "Print all positive marked sums in increasing order.",
      ],
      explanation:
        "Descending order ensures a coin is used at most once in a subset.",
    },
  }),
  defaultInput: { coins: [4, 2, 5, 2] },
  source: `const total=coins.reduce((a,b)=>a+b,0),possible=Array(total+1).fill(false); possible[0]=true;\nfor(const coin of coins) for(let sum=total;sum>=coin;sum--) if(possible[sum-coin]) possible[sum]=true;\nconst sums=[]; for(let sum=1;sum<=total;sum++) if(possible[sum]) sums.push(sum);\nreturn sums.length+'\\n'+sums.join(' ');`,
  parseInput(raw) {
    return { coins: numbers(raw, "coins", 1, 8, 1, 12) };
  },
  trace({ coins }) {
    const total = coins.reduce((a, b) => a + b, 0),
      state = dpState(total + 1),
      events: EventDraft[] = [],
      possible = Array<boolean>(total + 1).fill(false);
    possible[0] = true;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "The empty subset creates sum zero.",
        { value: 1 },
        1,
      ),
    );
    for (const coin of coins)
      for (let sum = total; sum >= coin; sum--)
        if (possible[sum - coin] && !possible[sum]) {
          possible[sum] = true;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${sum}`, `dp:${sum - coin}`],
              `Using coin ${coin}, total ${sum} becomes reachable.`,
              { value: 1 },
              2,
              {
                schemaVersion: "0.1",
                equation: `${sum - coin} + ${coin} = ${sum}`,
                reason:
                  "The predecessor total was reachable before this coin was used.",
              },
            ),
          );
        }
    const sums = possible.flatMap((yes, sum) => (yes && sum > 0 ? [sum] : []));
    return {
      initialState: state,
      events,
      output: `${sums.length}\n${sums.join(" ")}`,
    };
  },
});

const twoSetsII = defineProblem({
  metadata: metadata({
    id: "two-sets-ii",
    title: "Two Sets II",
    task: "1093",
    category: "Dynamic Programming",
    renderer: "dp",
    summary: "Count partitions of one through n into two equal-sum sets.",
    limits: "n 1–12",
    tags: ["DP", "subset sum"],
    examples: [{ input: '{"n":7}', output: "4" }],
    complexity: { time: "O(n × n²)", space: "O(n²) for the half-sum states" },
    learning: {
      intuition:
        "Choose a half-sum subset from 1…n−1; the set containing n is then the complement.",
      approach: [
        "If the total is odd, return zero.",
        "Count subsets of 1…n−1 that reach half the total.",
        "Scan sums downward for each number to use it once.",
      ],
      explanation:
        "Excluding n from the counted side counts each unordered partition exactly once without modular division by two.",
    },
  }),
  defaultInput: { n: 7 },
  source: `const total=n*(n+1)/2; if(total%2) return 0; const target=total/2,dp=Array(target+1).fill(0); dp[0]=1;\nfor(let value=1;value<n;value++) for(let sum=target;sum>=value;sum--) dp[sum]=(dp[sum]+dp[sum-value])%1000000007;\nreturn dp[target];`,
  parseInput(raw) {
    return { n: integer(readObject(raw).n, "n", 1, 12) };
  },
  trace({ n }) {
    const total = (n * (n + 1)) / 2,
      target = Math.floor(total / 2),
      state = dpState(target + 1),
      events: EventDraft[] = [],
      dp = Array<number>(target + 1).fill(0);
    if (total % 2) {
      events.push(
        event(
          "ANNOTATE",
          [],
          `The total ${total} is odd, so no equal partition exists.`,
          {},
          1,
        ),
      );
      return { initialState: state, events, output: "0" };
    }
    dp[0] = 1;
    events.push(
      event(
        "DP_BASE_CASE",
        ["dp:0"],
        "The empty subset reaches sum zero once.",
        { value: 1 },
        1,
      ),
    );
    for (let value = 1; value < n; value++)
      for (let sum = target; sum >= value; sum--)
        if (dp[sum - value]) {
          dp[sum] = (dp[sum] + dp[sum - value]) % mod;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${sum}`, `dp:${sum - value}`],
              `Including ${value} gives ${dp[sum]} subsets for ${sum}.`,
              { value: dp[sum] },
              2,
              {
                schemaVersion: "0.1",
                equation: `dp[${sum}] += dp[${sum - value}]`,
                reason:
                  "Scan downward so each value is used at most once; exclude n to avoid double counting partitions.",
              },
            ),
          );
        }
    return { initialState: state, events, output: String(dp[target]) };
  },
});

const increasingSubsequence = defineProblem({
  metadata: metadata({
    id: "increasing-subsequence",
    title: "Increasing Subsequence",
    task: "1145",
    category: "Dynamic Programming",
    renderer: "dp",
    summary: "Find the length of the longest strictly increasing subsequence.",
    limits: "1–32 positive integers",
    tags: ["DP", "patience sorting", "lower bound"],
    examples: [{ input: '{"values":[7,3,5,3,6,2,9,8]}', output: "4" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "A smaller tail is a better starting point for any future extension of the same length.",
      approach: [
        "Keep the smallest tail value for each subsequence length.",
        "Binary-search the first tail at least as large as the new value.",
        "Replace that tail or extend the list.",
      ],
      explanation:
        "Replacing a tail preserves its length and can only improve future extension opportunities; the tail list length equals the LIS length.",
    },
  }),
  defaultInput: { values: [7, 3, 5, 3, 6, 2, 9, 8] },
  source: `const tails=[];\nfor(const value of values){let low=0,high=tails.length;while(low<high){const mid=(low+high)>>1;if(tails[mid]<value)low=mid+1;else high=mid;}tails[low]=value;}\nreturn tails.length;`,
  parseInput(raw) {
    return { values: numbers(raw, "values", 1, 32, 1, 100_000) };
  },
  trace({ values }) {
    const state = dpState(values.length),
      events: EventDraft[] = [],
      tails: number[] = [];
    for (const value of values) {
      let low = 0,
        high = tails.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (tails[mid] < value) low = mid + 1;
        else high = mid;
      }
      const old = tails[low];
      tails[low] = value;
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${low}`],
          `Tail for length ${low + 1} ${old === undefined ? "starts" : "improves"} at ${value}; longest length ${tails.length}.`,
          { value },
          2,
          {
            schemaVersion: "0.1",
            equation: `tail[${low + 1}] = ${value}`,
            reason:
              "A smaller tail gives future values more room to extend the subsequence.",
          },
        ),
      );
    }
    return { initialState: state, events, output: String(tails.length) };
  },
});

const rectangleCutting = defineProblem({
  metadata: metadata({
    id: "rectangle-cutting",
    title: "Rectangle Cutting",
    task: "1744",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Minimize straight cuts needed to divide an integer rectangle into squares.",
    limits: "side lengths 1–8",
    tags: ["DP", "2D recurrence"],
    examples: [{ input: '{"a":3,"b":5}', output: "3" }],
    complexity: { time: "O(ab(a+b))", space: "O(ab)" },
    learning: {
      intuition:
        "A square needs no cut; every nonsquare's first cut is horizontal or vertical.",
      approach: [
        "Set square states to zero.",
        "Try every horizontal split and every vertical split.",
        "Add one for the first cut and take the cheapest two resulting states.",
      ],
      explanation:
        "Every valid cutting plan begins with one of these integer-coordinate splits, so comparing all first cuts is complete.",
    },
  }),
  defaultInput: { a: 3, b: 5 },
  source: `const dp=Array.from({length:a+1},()=>Array(b+1).fill(0));\nfor(let h=1;h<=a;h++)for(let w=1;w<=b;w++){if(h===w)continue;let best=Infinity;for(let cut=1;cut<h;cut++)best=Math.min(best,1+dp[cut][w]+dp[h-cut][w]);for(let cut=1;cut<w;cut++)best=Math.min(best,1+dp[h][cut]+dp[h][w-cut]);dp[h][w]=best;}\nreturn dp[a][b];`,
  parseInput(raw) {
    const o = readObject(raw);
    return { a: integer(o.a, "a", 1, 8), b: integer(o.b, "b", 1, 8) };
  },
  trace({ a, b }) {
    const state = dpState(a + 1, b + 1),
      events: EventDraft[] = [],
      dp = Array.from({ length: a + 1 }, () => Array<number>(b + 1).fill(0));
    for (let h = 1; h <= a; h++)
      for (let w = 1; w <= b; w++) {
        if (h === w) {
          events.push(
            event(
              "DP_BASE_CASE",
              [`dp:${h}:${w}`],
              `${h}×${w} is already a square; zero cuts.`,
              { value: 0 },
              1,
            ),
          );
          continue;
        }
        let best = Infinity,
          split = "";
        for (let cut = 1; cut < h; cut++) {
          const candidate = 1 + dp[cut][w] + dp[h - cut][w];
          if (candidate < best) {
            best = candidate;
            split = `horizontal at ${cut}`;
          }
        }
        for (let cut = 1; cut < w; cut++) {
          const candidate = 1 + dp[h][cut] + dp[h][w - cut];
          if (candidate < best) {
            best = candidate;
            split = `vertical at ${cut}`;
          }
        }
        dp[h][w] = best;
        events.push(
          event(
            "DP_UPDATE",
            [`dp:${h}:${w}`],
            `Rectangle ${h}×${w}: ${split} needs ${best} cuts.`,
            { value: best },
            2,
            {
              schemaVersion: "0.1",
              equation: `1 + cuts(first piece) + cuts(second piece) = ${best}`,
              reason: "Compare every possible first straight cut.",
            },
          ),
        );
      }
    return { initialState: state, events, output: String(dp[a][b]) };
  },
});

const arrayDescription = defineProblem({
  metadata: metadata({
    id: "array-description",
    title: "Array Description",
    task: "1746",
    category: "Dynamic Programming",
    renderer: "dp",
    summary:
      "Count bounded arrays matching fixed entries and adjacent differences of at most one.",
    limits: "1–8 positions, values 0–6 where 0 means unknown, maximum 1–6",
    tags: ["DP", "2D recurrence"],
    examples: [{ input: '{"values":[2,0,2],"maxValue":5}', output: "3" }],
    complexity: { time: "O(nm)", space: "O(nm) for the visual DP table" },
    learning: {
      intuition:
        "A chosen value can follow only itself or one of its immediate neighbors.",
      approach: [
        "Initialize every allowed first value.",
        "At each next position, sum counts for previous values one lower, equal, and one higher.",
        "Sum counts in the final row.",
      ],
      explanation:
        "The final value partitions all valid arrays into disjoint predecessor choices.",
    },
  }),
  defaultInput: { values: [2, 0, 2], maxValue: 5 },
  source: `const n=values.length,m=maxValue,dp=Array.from({length:n},()=>Array(m+1).fill(0));\nfor(let v=1;v<=m;v++)if(values[0]===0||values[0]===v)dp[0][v]=1;\nfor(let i=1;i<n;i++)for(let v=1;v<=m;v++)if(values[i]===0||values[i]===v)dp[i][v]=((v>1?dp[i-1][v-1]:0)+dp[i-1][v]+(v<m?dp[i-1][v+1]:0))%1000000007;\nreturn dp[n-1].reduce((a,b)=>(a+b)%1000000007,0);`,
  parseInput(raw) {
    const maxValue = integer(readObject(raw).maxValue, "maxValue", 1, 6),
      values = numbers(raw, "values", 1, 8, 0, maxValue);
    return { values, maxValue };
  },
  trace({ values, maxValue }) {
    const n = values.length,
      m = maxValue,
      state = dpState(n, m + 1),
      events: EventDraft[] = [],
      dp = Array.from({ length: n }, () => Array<number>(m + 1).fill(0));
    for (let value = 1; value <= m; value++)
      if (values[0] === 0 || values[0] === value) {
        dp[0][value] = 1;
        events.push(
          event(
            "DP_BASE_CASE",
            [`dp:0:${value}`],
            `First value ${value} is allowed.`,
            { value: 1 },
            1,
          ),
        );
      }
    for (let i = 1; i < n; i++)
      for (let value = 1; value <= m; value++)
        if (values[i] === 0 || values[i] === value) {
          const left = value > 1 ? dp[i - 1][value - 1] : 0,
            same = dp[i - 1][value],
            right = value < m ? dp[i - 1][value + 1] : 0;
          dp[i][value] = (left + same + right) % mod;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${i}:${value}`],
              `Position ${i + 1} ending in ${value} has ${dp[i][value]} valid prefixes.`,
              { value: dp[i][value] },
              2,
              {
                schemaVersion: "0.1",
                equation: `${left} + ${same} + ${right} ≡ ${dp[i][value]} (mod ${mod})`,
                reason:
                  "Only adjacent values within one can precede this value.",
              },
            ),
          );
        }
    const answer = dp[n - 1].reduce((sum, count) => (sum + count) % mod, 0);
    return { initialState: state, events, output: String(answer) };
  },
});

export const dynamicProgrammingProblems = [
  entry(minimizingCoins),
  entry(coinCombinationsI),
  entry(coinCombinationsII),
  entry(removingDigits),
  entry(bookShop),
  entry(gridPathsI),
  entry(moneySums),
  entry(twoSetsII),
  entry(increasingSubsequence),
  entry(rectangleCutting),
  entry(arrayDescription),
];
