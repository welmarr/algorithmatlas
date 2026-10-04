import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata, numbers } from "./extended-shared";

const MOD = 1_000_000_007;

function towerInput(raw: unknown) {
  return { heights: numbers(raw, "heights", 1, 8, 1, 20) };
}
const countingTowers = defineProblem({
  metadata: metadata({
    id: "counting-towers",
    title: "Counting Towers",
    task: "2413",
    category: "Dynamic Programming",
    renderer: "dp",
    summary: "Count ways to build width-two towers at several heights.",
    limits: "1–8 heights from 1 to 20",
    tags: ["2D DP", "state compression", "tilings"],
    examples: [{ input: '{"heights":[2,6,13]}', output: "8\n2864\n93433178" }],
    complexity: { time: "O(max height + queries)", space: "O(max height)" },
    learning: {
      intuition:
        "At the top boundary, the two columns are either tied together or separate.",
      approach: [
        "Start with one configuration of each boundary type at height 1.",
        "Extend a tied boundary in four tied ways or one separate way.",
        "Extend a separate boundary in one tied way or two separate ways; add both counts.",
      ],
      explanation:
        "The two boundary states partition all possible towers. Their local extension counts give a complete, nonoverlapping recurrence.",
    },
  }),
  defaultInput: { heights: [2, 6, 13] },
  source: `const max=Math.max(...heights),tied=Array(max+1).fill(0),split=Array(max+1).fill(0);tied[1]=split[1]=1;for(let h=2;h<=max;h++){tied[h]=(4*tied[h-1]+split[h-1])%1000000007;split[h]=(tied[h-1]+2*split[h-1])%1000000007;}return heights.map(h=>(tied[h]+split[h])%1000000007).join('\\n');`,
  parseInput: towerInput,
  trace({ heights }) {
    const max = Math.max(...heights),
      state = emptyState(),
      events: EventDraft[] = [],
      tied = Array<number>(max + 1).fill(0),
      split = Array<number>(max + 1).fill(0);
    for (let h = 1; h <= max; h++)
      for (let kind = 0; kind < 2; kind++) {
        const id = `dp:${h}:${kind}`;
        state.entities[id] = {
          id,
          kind: "dp",
          label: `${h},${kind ? "split" : "tied"}`,
          value: 0,
          status: "idle",
        };
      }
    tied[1] = split[1] = 1;
    events.push(
      event(
        "DP_UPDATE",
        ["dp:1:0"],
        "Height 1 has one tied-boundary tower.",
        { variable: "tied", value: 1 },
        1,
      ),
    );
    events.push(
      event(
        "DP_UPDATE",
        ["dp:1:1"],
        "Height 1 has one separate-boundary tower.",
        { variable: "split", value: 1 },
        1,
      ),
    );
    for (let h = 2; h <= max; h++) {
      tied[h] = (4 * tied[h - 1] + split[h - 1]) % MOD;
      split[h] = (tied[h - 1] + 2 * split[h - 1]) % MOD;
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${h}:0`],
          `Height ${h}: ${tied[h]} tied-boundary towers.`,
          { variable: "tied", value: tied[h] },
          1,
          {
            schemaVersion: "0.1",
            equation: `4·${tied[h - 1]} + ${split[h - 1]} ≡ ${tied[h]} (mod M)`,
            reason:
              "Append one level according to the tied-boundary transitions.",
          },
        ),
      );
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${h}:1`],
          `Height ${h}: ${split[h]} separate-boundary towers.`,
          { variable: "split", value: split[h] },
          1,
          {
            schemaVersion: "0.1",
            equation: `${tied[h - 1]} + 2·${split[h - 1]} ≡ ${split[h]} (mod M)`,
            reason:
              "Append one level according to the separate-boundary transitions.",
          },
        ),
      );
    }
    return {
      initialState: state,
      events,
      output: heights.map((h) => String((tied[h] + split[h]) % MOD)).join("\n"),
    };
  },
});

type Project = [number, number, number];
function projectInput(raw: unknown) {
  const value = readObject(raw).projects;
  if (!Array.isArray(value) || value.length < 1 || value.length > 10)
    throw new InputError(
      "projects must contain 1–10 [start,end,reward] triples",
    );
  const projects: Project[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3)
      throw new InputError(`projects[${i}] must be a triple`);
    const start = integer(item[0], `projects[${i}][0]`, 1, 100),
      end = integer(item[1], `projects[${i}][1]`, start, 100),
      reward = integer(item[2], `projects[${i}][2]`, 1, 100_000);
    return [start, end, reward];
  });
  return { projects };
}
const projects = defineProblem({
  metadata: metadata({
    id: "projects",
    title: "Projects",
    task: "1140",
    category: "Dynamic Programming",
    renderer: "dp",
    summary: "Choose nonoverlapping projects for maximum total reward.",
    limits: "1–10 projects, days 1–100, rewards 1–100,000",
    tags: ["weighted interval scheduling", "binary search", "DP"],
    examples: [
      { input: '{"projects":[[2,4,4],[3,6,6],[6,8,2],[5,7,3]]}', output: "7" },
    ],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "For each project, either take its reward plus the best compatible earlier plan or skip it.",
      approach: [
        "Sort projects by ending day.",
        "Binary-search the last project ending strictly before the current start.",
        "Set dp[i] to the better of skipping or taking project i.",
      ],
      explanation:
        "Any optimal schedule among the first i projects either excludes project i or includes it with an optimal compatible prefix.",
    },
  }),
  defaultInput: {
    projects: [
      [2, 4, 4],
      [3, 6, 6],
      [6, 8, 2],
      [5, 7, 3],
    ] as Project[],
  },
  source: `const sorted=[...projects].sort((a,b)=>a[1]-b[1]||a[0]-b[0]),ends=sorted.map(p=>p[1]),dp=Array(sorted.length+1).fill(0);for(let i=1;i<=sorted.length;i++){const [start,,reward]=sorted[i-1];let left=0,right=i-1;while(left<right){const mid=Math.ceil((left+right)/2);if(ends[mid-1]<start)left=mid;else right=mid-1;}dp[i]=Math.max(dp[i-1],reward+dp[left]);}return dp[sorted.length];`,
  parseInput: projectInput,
  trace({ projects }) {
    const sorted = [...projects].sort((a, b) => a[1] - b[1] || a[0] - b[0]),
      ends = sorted.map((item) => item[1]),
      dp = Array<number>(sorted.length + 1).fill(0),
      state = emptyState(),
      events: EventDraft[] = [];
    for (let i = 0; i <= sorted.length; i++) {
      const id = `dp:${i}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: String(i),
        value: 0,
        status: "idle",
      };
    }
    for (let i = 1; i <= sorted.length; i++) {
      const [start, end, reward] = sorted[i - 1];
      let left = 0,
        right = i - 1;
      while (left < right) {
        const mid = Math.ceil((left + right) / 2);
        if (ends[mid - 1] < start) left = mid;
        else right = mid - 1;
      }
      const take = reward + dp[left],
        skip = dp[i - 1];
      dp[i] = Math.max(skip, take);
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${i}`],
          `Project ${start}–${end} pays ${reward}: take ${take} or skip ${skip}; best ${dp[i]}.`,
          { variable: "reward", value: dp[i] },
          1,
          {
            schemaVersion: "0.1",
            equation: `max(${skip}, ${reward} + ${dp[left]}) = ${dp[i]}`,
            reason:
              "The compatible earlier prefix ends before this project's first day.",
          },
        ),
      );
    }
    return { initialState: state, events, output: String(dp[sorted.length]) };
  },
});

function elevatorInput(raw: unknown) {
  const object = readObject(raw),
    capacity = integer(object.capacity, "capacity", 1, 100),
    weights = numbers(raw, "weights", 1, 7, 1, capacity);
  return { capacity, weights };
}
const elevatorRides = defineProblem({
  metadata: metadata({
    id: "elevator-rides",
    title: "Elevator Rides",
    task: "1653",
    category: "Dynamic Programming",
    renderer: "dp",
    summary: "Minimize elevator trips subject to a weight limit.",
    limits: "1–7 people, capacity 1–100, each weight ≤ capacity",
    tags: ["bitmask DP", "subset optimization", "lexicographic state"],
    examples: [{ input: '{"capacity":10,"weights":[4,8,6,1]}', output: "2" }],
    complexity: { time: "O(n·2ⁿ)", space: "O(2ⁿ)" },
    learning: {
      intuition:
        "For every selected group, track both the number of rides and the current ride's load.",
      approach: [
        "Represent chosen people by a bitmask.",
        "For each selected last person, extend the best state of the smaller mask.",
        "Prefer fewer rides, then a lighter final ride.",
      ],
      explanation:
        "The final person belongs either in the current ride or a new one. Considering every possible last person covers all orders; the lighter tie state leaves more room for future people.",
    },
  }),
  defaultInput: { capacity: 10, weights: [4, 8, 6, 1] },
  source: `const limit=1<<weights.length,dp=Array.from({length:limit},()=>[Infinity,Infinity]);dp[0]=[1,0];for(let mask=1;mask<limit;mask++)for(let i=0;i<weights.length;i++)if(mask&(1<<i)){const [rides,load]=dp[mask^(1<<i)],candidate=load+weights[i]<=capacity?[rides,load+weights[i]]:[rides+1,weights[i]];if(candidate[0]<dp[mask][0]||candidate[0]===dp[mask][0]&&candidate[1]<dp[mask][1])dp[mask]=candidate;}return dp[limit-1][0];`,
  parseInput: elevatorInput,
  trace({ capacity, weights }) {
    const limit = 1 << weights.length,
      dp: Array<[number, number]> = Array.from({ length: limit }, () => [
        Infinity,
        Infinity,
      ]),
      state = emptyState(),
      events: EventDraft[] = [];
    for (let mask = 0; mask < limit; mask++) {
      const id = `dp:${mask}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: mask.toString(2).padStart(weights.length, "0"),
        value: 0,
        status: "idle",
      };
    }
    dp[0] = [1, 0];
    events.push(
      event(
        "DP_UPDATE",
        ["dp:0"],
        "An empty group starts with one unused ride of load 0.",
        { variable: "rides", value: 1 },
        1,
      ),
    );
    for (let mask = 1; mask < limit; mask++) {
      for (let person = 0; person < weights.length; person++)
        if (mask & (1 << person)) {
          const [rides, load] = dp[mask ^ (1 << person)];
          const candidate: [number, number] =
            load + weights[person] <= capacity
              ? [rides, load + weights[person]]
              : [rides + 1, weights[person]];
          if (
            candidate[0] < dp[mask][0] ||
            (candidate[0] === dp[mask][0] && candidate[1] < dp[mask][1])
          )
            dp[mask] = candidate;
        }
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${mask}`],
          `Group ${mask.toString(2).padStart(weights.length, "0")} needs ${dp[mask][0]} rides; final load ${dp[mask][1]}.`,
          { variable: "rides", value: dp[mask][0] },
          1,
          {
            schemaVersion: "0.1",
            equation: `(${dp[mask][0]} rides, ${dp[mask][1]} load)`,
            reason:
              "Prefer fewer rides, then lower current load among equal-ride plans.",
          },
        ),
      );
    }
    return { initialState: state, events, output: String(dp[limit - 1][0]) };
  },
});

export const dynamicAdvancedProblems = [
  entry(countingTowers),
  entry(projects),
  entry(elevatorRides),
];
