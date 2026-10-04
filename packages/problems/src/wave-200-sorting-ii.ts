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

const concertTickets = defineProblem({
  metadata: metadata({
    id: "concert-tickets",
    title: "Concert Tickets",
    task: "1091",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Give each arriving customer the most expensive still-available ticket within their budget.",
    limits: "1–32 tickets and 1–32 customers",
    tags: ["binary search", "disjoint set union", "predecessor"],
    examples: [
      {
        input: '{"tickets":[5,3,7,8,5],"budgets":[4,8,3]}',
        output: "3\n8\n-1",
      },
    ],
    complexity: { time: "O(n log n + m log n + (n+m) α(n))", space: "O(n)" },
    learning: {
      intuition:
        "Sort ticket prices and use a predecessor link to skip any ticket already sold.",
      approach: [
        "Sort ticket prices with duplicates retained.",
        "Binary-search the last affordable index for each customer.",
        "Find its nearest unsold predecessor, sell it, and link that slot to the next predecessor.",
      ],
      explanation:
        "Each sold slot is removed exactly once; predecessor compression finds the greatest still-available affordable price.",
    },
  }),
  defaultInput: { tickets: [5, 3, 7, 8, 5], budgets: [4, 8, 3] },
  source: `const prices=[...tickets].sort((a,b)=>a-b),parent=Array.from({length:prices.length+1},(_,i)=>i);
function find(x){return parent[x]===x?x:(parent[x]=find(parent[x]));} const answer=[];
for(const budget of budgets){let lo=0,hi=prices.length;while(lo<hi){const mid=(lo+hi)>>1;if(prices[mid]<=budget)lo=mid+1;else hi=mid;}
const slot=find(lo);if(!slot){answer.push(-1);continue;}answer.push(prices[slot-1]);parent[slot]=find(slot-1);}
return answer.join('\\n');`,
  parseInput(raw) {
    return {
      tickets: numbers(raw, "tickets", 1, 32, 1, 1_000_000_000),
      budgets: numbers(raw, "budgets", 1, 32, 1, 1_000_000_000),
    };
  },
  trace({ tickets, budgets }) {
    const prices = [...tickets].sort((a, b) => a - b),
      parent = Array.from({ length: prices.length + 1 }, (_, i) => i);
    const find = (x: number): number =>
      parent[x] === x ? x : (parent[x] = find(parent[x]));
    const events: EventDraft[] = [],
      answer: number[] = [];
    for (const budget of budgets) {
      let low = 0,
        high = prices.length;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (prices[middle] <= budget) low = middle + 1;
        else high = middle;
      }
      const slot = find(low);
      if (!slot) {
        answer.push(-1);
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `Budget ${budget} has no affordable unsold ticket.`,
            { variable: "lastSale", value: -1 },
            2,
          ),
        );
        continue;
      }
      const price = prices[slot - 1];
      answer.push(price);
      events.push(
        event(
          "READ_INDEX",
          [`array:${slot - 1}`],
          `Budget ${budget} buys the highest available ticket, ${price}.`,
          { value: price },
          2,
        ),
      );
      events.push(
        event(
          "MARK",
          [`array:${slot - 1}`],
          `Ticket ${slot} is sold; future searches skip it.`,
          { status: "visited" },
          3,
        ),
      );
      parent[slot] = find(slot - 1);
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Record sale price ${price}.`,
          { variable: "lastSale", value: price },
          3,
        ),
      );
    }
    return {
      initialState: numberState(prices),
      events,
      output: answer.join("\n"),
    };
  },
});

const trafficLights = defineProblem({
  metadata: metadata({
    id: "traffic-lights",
    title: "Traffic Lights",
    task: "1163",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Report the longest unlit street segment after each new light is added.",
    limits: "street length 2–1,000,000,000; 1–32 distinct interior positions",
    tags: ["reverse processing", "sorting", "linked neighbors"],
    examples: [{ input: '{"length":8,"positions":[3,6,2]}', output: "5 3 3" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "Adding lights splits passages; reversing the sequence turns each operation into an easy merge of neighboring passages.",
      approach: [
        "Sort every final light position with the street endpoints.",
        "Track the longest final gap.",
        "Remove lights in reverse order, merging their two neighboring gaps and recording the forward answers.",
      ],
      explanation:
        "Removing one light changes only its adjacent passages, so the maximum can only stay or grow during the reverse sweep.",
    },
  }),
  defaultInput: { length: 8, positions: [3, 6, 2] },
  source: `const sorted=[0,...positions,length].sort((a,b)=>a-b),index=new Map(sorted.map((p,i)=>[p,i]));
const prev=sorted.map((_,i)=>i-1),next=sorted.map((_,i)=>i+1),answer=Array(positions.length);let longest=0;
for(let i=1;i<sorted.length;i++)longest=Math.max(longest,sorted[i]-sorted[i-1]);
for(let i=positions.length-1;i>=0;i--){answer[i]=longest;const at=index.get(positions[i]),left=prev[at],right=next[at];longest=Math.max(longest,sorted[right]-sorted[left]);next[left]=right;prev[right]=left;}
return answer.join(' ');`,
  parseInput(raw) {
    const length = integer(readObject(raw).length, "length", 2, 1_000_000_000);
    const positions = numbers(raw, "positions", 1, 32, 1, length - 1);
    if (new Set(positions).size !== positions.length)
      throw new InputError("positions must be distinct");
    return { length, positions };
  },
  trace({ length, positions }) {
    const sorted = [0, ...positions, length].sort((a, b) => a - b),
      index = new Map(sorted.map((value, i) => [value, i]));
    const previous = sorted.map((_, i) => i - 1),
      next = sorted.map((_, i) => i + 1),
      answer = Array<number>(positions.length),
      events: EventDraft[] = [];
    let longest = 0;
    for (let i = 1; i < sorted.length; i++)
      longest = Math.max(longest, sorted[i] - sorted[i - 1]);
    for (let i = positions.length - 1; i >= 0; i--) {
      answer[i] = longest;
      const at = index.get(positions[i])!,
        left = previous[at],
        right = next[at];
      const joined = sorted[right] - sorted[left];
      longest = Math.max(longest, joined);
      next[left] = right;
      previous[right] = left;
    }
    positions.forEach((position, i) => {
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Add a light at ${position}. Reverse processing has already computed this passage length.`,
          { value: position },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `The longest passage after light ${i + 1} is ${answer[i]}.`,
          { variable: "longestGap", value: answer[i] },
          3,
        ),
      );
    });
    return {
      initialState: numberState(positions),
      events,
      output: answer.join(" "),
    };
  },
});

function targetArray(raw: unknown, minimum: number) {
  const values = numbers(raw, "values", minimum, 32, 1, 1_000_000_000);
  const target = integer(readObject(raw).target, "target", 1, 1_000_000_000);
  return { values, target };
}
const sumOfThreeValues = defineProblem({
  metadata: metadata({
    id: "sum-of-three-values",
    title: "Sum of Three Values",
    task: "1641",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Find three distinct array positions whose values reach a target.",
    limits: "3–32 positive values and a positive target",
    tags: ["sorting", "two pointers", "three sum"],
    examples: [{ input: '{"values":[2,7,5,1],"target":8}', output: "1 3 4" }],
    complexity: { time: "O(n²)", space: "O(n) for sorted indices" },
    learning: {
      intuition:
        "Fix one value and search for a complementary pair in the sorted suffix.",
      approach: [
        "Sort values with original positions.",
        "For each fixed value, compare the smallest and largest remaining values.",
        "Move a pointer according to whether their sum is too small or large.",
      ],
      explanation:
        "For a fixed value, sorted two-pointer movement rules out no possible complementary pair.",
    },
  }),
  defaultInput: { values: [2, 7, 5, 1], target: 8 },
  source: `const sorted=values.map((value,i)=>({value,index:i+1})).sort((a,b)=>a.value-b.value);
for(let fixed=0;fixed<sorted.length-2;fixed++){let left=fixed+1,right=sorted.length-1;
while(left<right){const sum=sorted[fixed].value+sorted[left].value+sorted[right].value;if(sum===target)return [sorted[fixed].index,sorted[left].index,sorted[right].index].sort((a,b)=>a-b).join(' ');if(sum<target)left++;else right--;}}
return 'IMPOSSIBLE';`,
  parseInput(raw) {
    return targetArray(raw, 3);
  },
  trace({ values, target }) {
    const sorted = values
        .map((value, i) => ({ value, index: i + 1 }))
        .sort((a, b) => a.value - b.value || a.index - b.index),
      events: EventDraft[] = [];
    let answer = "IMPOSSIBLE";
    outer: for (let fixed = 0; fixed < sorted.length - 2; fixed++) {
      let left = fixed + 1,
        right = sorted.length - 1;
      while (left < right) {
        const sum =
          sorted[fixed].value + sorted[left].value + sorted[right].value;
        events.push(
          event(
            "READ_INDEX",
            [`array:${fixed}`],
            `Fix ${sorted[fixed].value}; compare ${sorted[left].value} + ${sorted[right].value}, total ${sum}.`,
            { value: sorted[fixed].value },
            2,
            {
              schemaVersion: "0.1",
              equation: `${sorted[fixed].value} + ${sorted[left].value} + ${sorted[right].value} = ${sum}`,
              reason:
                sum < target
                  ? "Increase the smaller suffix value."
                  : sum > target
                    ? "Decrease the larger suffix value."
                    : "Three distinct positions reach the target.",
            },
          ),
        );
        if (sum === target) {
          answer = [
            sorted[fixed].index,
            sorted[left].index,
            sorted[right].index,
          ]
            .sort((a, b) => a - b)
            .join(" ");
          break outer;
        }
        if (sum < target) left++;
        else right--;
      }
    }
    if (answer === "IMPOSSIBLE")
      events.push(
        event(
          "ANNOTATE",
          [],
          "Every fixed value and complementary pair was ruled out.",
          {},
          3,
        ),
      );
    else
      events.push(
        event(
          "ANNOTATE",
          [],
          `Original positions ${answer} form a valid triple.`,
          {},
          3,
        ),
      );
    return { initialState: numberState(values), events, output: answer };
  },
});

const sumOfFourValues = defineProblem({
  metadata: metadata({
    id: "sum-of-four-values",
    title: "Sum of Four Values",
    task: "1642",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Find four distinct positions whose values sum to a target.",
    limits: "4–32 positive values and a positive target",
    tags: ["pair sums", "hash map"],
    examples: [
      { input: '{"values":[1,2,3,4],"target":10}', output: "1 2 3 4" },
    ],
    complexity: { time: "O(n²)", space: "O(n²) for pair sums" },
    learning: {
      intuition:
        "Store sums of pairs ending before the current pair, so any match automatically uses four positions.",
      approach: [
        "Sweep the second member of the current pair.",
        "Search earlier pair sums for the complement.",
        "Only after searching, add pairs ending at the current member.",
      ],
      explanation:
        "Every earlier stored pair ends before the current pair begins, making index distinctness automatic.",
    },
  }),
  defaultInput: { values: [1, 2, 3, 4], target: 10 },
  source: `const earlier=new Map();for(let j=1;j<values.length;j++){
for(let k=j+1;k<values.length;k++){const pair=earlier.get(target-values[j]-values[k]);if(pair)return [...pair,j+1,k+1].join(' ');}
for(let i=0;i<j;i++)earlier.set(values[i]+values[j],[i+1,j+1]);}return 'IMPOSSIBLE';`,
  parseInput(raw) {
    return targetArray(raw, 4);
  },
  trace({ values, target }) {
    const earlier = new Map<number, [number, number]>(),
      events: EventDraft[] = [];
    let answer = "IMPOSSIBLE";
    outer: for (let j = 1; j < values.length; j++) {
      for (let k = j + 1; k < values.length; k++) {
        const complement = target - values[j] - values[k];
        events.push(
          event(
            "READ_INDEX",
            [`array:${k}`],
            `Check pair ${j + 1}, ${k + 1}; an earlier pair would need sum ${complement}.`,
            { value: values[k] },
            2,
          ),
        );
        const pair = earlier.get(complement);
        if (pair) {
          answer = [...pair, j + 1, k + 1].join(" ");
          break outer;
        }
      }
      for (let i = 0; i < j; i++)
        earlier.set(values[i] + values[j], [i + 1, j + 1]);
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Store earlier pairs through position ${j + 1}.`,
          { variable: "pairSums", value: earlier.size },
          3,
        ),
      );
    }
    events.push(
      event(
        "ANNOTATE",
        [],
        answer === "IMPOSSIBLE"
          ? "No disjoint complementary pair sums were found."
          : `Positions ${answer} reach ${target}.`,
        {},
        4,
      ),
    );
    return { initialState: numberState(values), events, output: answer };
  },
});

const maximumSubarraySumII = defineProblem({
  metadata: metadata({
    id: "maximum-subarray-sum-ii",
    title: "Maximum Subarray Sum II",
    task: "1644",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Find the best contiguous sum whose length is between two bounds.",
    limits: "1–32 signed values with 1 ≤ minLength ≤ maxLength ≤ length",
    tags: ["prefix sums", "monotone deque"],
    examples: [
      {
        input: '{"values":[-1,3,-2,5,3,-5,2,2],"minLength":1,"maxLength":2}',
        output: "8",
      },
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A subarray ending at r is best when its allowed starting prefix sum is smallest.",
      approach: [
        "Build prefix sums.",
        "Maintain a monotone deque of allowed start prefixes.",
        "Subtract the deque minimum from each ending prefix.",
      ],
      explanation:
        "Every prefix enters and leaves the deque at most once, and a larger newer prefix can never beat a smaller one in an overlapping validity window.",
    },
  }),
  defaultInput: {
    values: [-1, 3, -2, 5, 3, -5, 2, 2],
    minLength: 1,
    maxLength: 2,
  },
  source: `const prefix=[0];for(const value of values)prefix.push(prefix.at(-1)+value);const deque=[];let head=0,best=-Infinity;
for(let right=minLength;right<=values.length;right++){const start=right-minLength;while(deque.length>head&&prefix[deque.at(-1)]>=prefix[start])deque.pop();deque.push(start);
while(deque[head]<right-maxLength)head++;best=Math.max(best,prefix[right]-prefix[deque[head]]);}return best;`,
  parseInput(raw) {
    const values = numbers(raw, "values", 1, 32, -1_000_000_000, 1_000_000_000);
    const minLength = integer(
      readObject(raw).minLength,
      "minLength",
      1,
      values.length,
    );
    const maxLength = integer(
      readObject(raw).maxLength,
      "maxLength",
      minLength,
      values.length,
    );
    return { values, minLength, maxLength };
  },
  trace({ values, minLength, maxLength }) {
    const prefix = [0];
    for (const value of values) prefix.push(prefix.at(-1)! + value);
    const deque: number[] = [],
      events: EventDraft[] = [];
    let head = 0,
      best = -Infinity;
    for (let right = minLength; right <= values.length; right++) {
      const start = right - minLength;
      while (deque.length > head && prefix[deque.at(-1)!] >= prefix[start])
        deque.pop();
      deque.push(start);
      while (deque[head] < right - maxLength) head++;
      const candidate = prefix[right] - prefix[deque[head]];
      best = Math.max(best, candidate);
      events.push(
        event(
          "READ_INDEX",
          [`array:${right - 1}`],
          `For right edge ${right}, the smallest allowed prefix is at ${deque[head]}; candidate sum ${candidate}.`,
          { value: values[right - 1] },
          2,
          {
            schemaVersion: "0.1",
            equation: `${prefix[right]} − ${prefix[deque[head]]} = ${candidate}`,
            reason: "Subtract the minimum valid starting prefix.",
          },
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Best allowed-length subarray sum is ${best}.`,
          { variable: "bestSum", value: best },
          3,
        ),
      );
    }
    return { initialState: numberState(values), events, output: String(best) };
  },
});

export const wave200SortingIIProblems = [
  entry(concertTickets),
  entry(trafficLights),
  entry(sumOfThreeValues),
  entry(sumOfFourValues),
  entry(maximumSubarraySumII),
];
