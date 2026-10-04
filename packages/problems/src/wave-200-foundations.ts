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
  sortedItems,
} from "./extended-shared";

const palindromeReorder = defineProblem({
  metadata: metadata({
    id: "palindrome-reorder",
    title: "Palindrome Reorder",
    task: "1755",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Rearrange uppercase letters into a palindrome when their counts permit it.",
    limits: "1–32 uppercase letters",
    tags: ["frequency count", "palindrome"],
    examples: [{ input: '{"text":"AAAACACBA"}', output: "AAACBCAAA" }],
    complexity: { time: "O(n + alphabet)", space: "O(n + alphabet)" },
    learning: {
      intuition:
        "Every letter away from the center must appear in a mirrored pair.",
      approach: [
        "Count each letter.",
        "Reject more than one odd count.",
        "Place half of every count on each side of the optional middle letter.",
      ],
      explanation:
        "Mirroring the sorted half uses every even pair once; the only odd letter occupies the center.",
    },
  }),
  defaultInput: { text: "AAAACACBA" },
  source: `const count = Array(26).fill(0); for (const letter of text) count[letter.charCodeAt(0)-65]++;
const odd=count.filter(value=>value%2).length; if (odd>1) return 'NO SOLUTION';
let half='', middle=''; for(let i=0;i<26;i++){half+=String.fromCharCode(65+i).repeat(Math.floor(count[i]/2)); if(count[i]%2) middle=String.fromCharCode(65+i);}
return half+middle+[...half].reverse().join('');`,
  parseInput(raw) {
    const text = readObject(raw).text;
    if (typeof text !== "string" || !/^[A-Z]{1,32}$/.test(text))
      throw new InputError("text must contain 1–32 uppercase letters");
    return { text };
  },
  trace({ text }) {
    const counts = Array<number>(26).fill(0);
    const events: EventDraft[] = [];
    [...text].forEach((letter, index) => {
      counts[letter.charCodeAt(0) - 65]++;
      events.push(
        event(
          "READ_INDEX",
          [`array:${index}`],
          `Count ${letter}; it now appears ${counts[letter.charCodeAt(0) - 65]} time(s).`,
          { value: letter.charCodeAt(0) },
          1,
        ),
      );
    });
    const odd = counts.flatMap((count, i) =>
      count % 2 ? [String.fromCharCode(65 + i)] : [],
    );
    let output = "NO SOLUTION";
    if (odd.length > 1) {
      events.push(
        event(
          "ANNOTATE",
          [],
          `${odd.length} letters have odd counts; only one can occupy the center.`,
          {},
          2,
        ),
      );
    } else {
      let half = "";
      counts.forEach((count, i) => {
        if (!count) return;
        const letter = String.fromCharCode(65 + i);
        half += letter.repeat(Math.floor(count / 2));
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `Place ${Math.floor(count / 2)} ${letter} pair(s) around the center.`,
            { variable: "pairedLetters", value: half.length * 2 },
            3,
          ),
        );
      });
      output = half + (odd[0] ?? "") + [...half].reverse().join("");
      events.push(
        event(
          "ANNOTATE",
          [],
          `Mirror the left half${odd.length ? ` around ${odd[0]}` : ""}: ${output}.`,
          {},
          3,
        ),
      );
    }
    const initialState = numberState(
      [...text].map((letter) => letter.charCodeAt(0)),
    );
    [...text].forEach((letter, i) => {
      initialState.entities[`array:${i}`].label = letter;
    });
    return { initialState, events, output };
  },
});

const grayCode = defineProblem({
  metadata: metadata({
    id: "gray-code",
    title: "Gray Code",
    task: "2205",
    category: "Introductory Problems",
    renderer: "variables",
    summary:
      "Generate every bit string so consecutive strings change exactly one bit.",
    limits: "1–8 bits for interactive tracing",
    tags: ["bitwise", "construction"],
    examples: [{ input: '{"n":2}', output: "00\n01\n11\n10" }],
    complexity: { time: "O(n 2^n)", space: "O(n 2^n) for output" },
    learning: {
      intuition:
        "XORing a binary index with itself shifted right reflects each higher-bit transition.",
      approach: [
        "Enumerate indices from zero to 2^n−1.",
        "Compute index XOR (index shifted right one).",
        "Pad every result to n bits.",
      ],
      explanation:
        "The reflected binary construction changes one bit at each boundary and visits every code once.",
    },
  }),
  defaultInput: { n: 3 },
  source: `const codes=[]; for(let i=0;i<2**n;i++) codes.push((i^(i>>1)).toString(2).padStart(n,'0')); return codes.join('\\n');`,
  parseInput(raw) {
    return { n: integer(readObject(raw).n, "n", 1, 8) };
  },
  trace({ n }) {
    const initialState = emptyState();
    initialState.variables = { code: 0 };
    const events: EventDraft[] = [];
    const codes: string[] = [];
    for (let index = 0; index < 2 ** n; index++) {
      const value = index ^ (index >> 1);
      const code = value.toString(2).padStart(n, "0");
      codes.push(code);
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Index ${index} maps to Gray code ${code}.`,
          { variable: "code", value },
          1,
          {
            schemaVersion: "0.1",
            equation: `${index} XOR (${index} >> 1) = ${value}`,
            reason: "A reflected-code transition flips one bit.",
          },
        ),
      );
    }
    return { initialState, events, output: codes.join("\n") };
  },
});

const creatingStrings = defineProblem({
  metadata: metadata({
    id: "creating-strings",
    title: "Creating Strings",
    task: "1622",
    category: "Introductory Problems",
    renderer: "variables",
    summary:
      "List each distinct permutation of a lowercase string in lexical order.",
    limits: "1–6 lowercase letters for interactive tracing",
    tags: ["backtracking", "multiset"],
    examples: [{ input: '{"text":"aab"}', output: "3\naab\naba\nbaa" }],
    complexity: {
      time: "O(n × number of distinct permutations)",
      space: "O(n + output)",
    },
    learning: {
      intuition:
        "Choosing from remaining letter counts avoids duplicate branches.",
      approach: [
        "Count letters.",
        "Try available letters in alphabetical order at every depth.",
        "Emit a word when all positions are filled.",
      ],
      explanation:
        "A prefix determines a unique remaining multiset, and sorted choices yield lexically ordered distinct results.",
    },
  }),
  defaultInput: { text: "aab" },
  source: `const count=Array(26).fill(0), out=[]; for(const ch of text) count[ch.charCodeAt(0)-97]++;
function visit(prefix){if(prefix.length===text.length){out.push(prefix);return;} for(let i=0;i<26;i++) if(count[i]){count[i]--;visit(prefix+String.fromCharCode(97+i));count[i]++;}}
visit(''); return out.length+'\\n'+out.join('\\n');`,
  parseInput(raw) {
    const text = readObject(raw).text;
    if (typeof text !== "string" || !/^[a-z]{1,6}$/.test(text))
      throw new InputError("text must contain 1–6 lowercase letters");
    return { text };
  },
  trace({ text }) {
    const counts = Array<number>(26).fill(0),
      words: string[] = [],
      events: EventDraft[] = [];
    for (const letter of text) counts[letter.charCodeAt(0) - 97]++;
    function visit(prefix: string) {
      if (prefix.length === text.length) {
        words.push(prefix);
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `Complete distinct word ${prefix} (#${words.length}).`,
            { variable: "generated", value: words.length },
            2,
          ),
        );
        return;
      }
      for (let i = 0; i < 26; i++)
        if (counts[i]) {
          counts[i]--;
          visit(prefix + String.fromCharCode(97 + i));
          counts[i]++;
        }
    }
    visit("");
    const initialState = emptyState();
    initialState.variables = { generated: 0 };
    return {
      initialState,
      events,
      output: `${words.length}\n${words.join("\n")}`,
    };
  },
});

const appleDivision = defineProblem({
  metadata: metadata({
    id: "apple-division",
    title: "Apple Division",
    task: "1623",
    category: "Introductory Problems",
    renderer: "array",
    summary:
      "Split apple weights into two groups with minimum total-weight difference.",
    limits: "1–16 apples, weights 1–1,000,000,000",
    tags: ["subset enumeration", "backtracking"],
    examples: [{ input: '{"weights":[3,2,7,4,1]}', output: "1" }],
    complexity: {
      time: "O(n 2^n)",
      space: "O(n) for the trace and current choice",
    },
    learning: {
      intuition:
        "Every division is represented by choosing one subset for the first group.",
      approach: [
        "Compute the total weight.",
        "Try both group choices for every apple.",
        "Minimize the absolute difference between chosen and remaining weight.",
      ],
      explanation:
        "Enumerating all subset choices covers each possible division; complementary subsets have the same difference.",
    },
  }),
  defaultInput: { weights: [3, 2, 7, 4, 1] },
  source: `const total=weights.reduce((a,b)=>a+b,0); let best=Infinity;
function visit(i,left){if(i===weights.length){best=Math.min(best,Math.abs(total-2*left));return;}visit(i+1,left);visit(i+1,left+weights[i]);}
visit(0,0); return best;`,
  parseInput(raw) {
    return { weights: numbers(raw, "weights", 1, 16, 1, 1_000_000_000) };
  },
  trace({ weights }) {
    const total = weights.reduce((sum, value) => sum + value, 0);
    let best = Infinity,
      bestMask = 0;
    const events: EventDraft[] = [];
    function visit(index: number, left: number, mask: number) {
      if (index === weights.length) {
        const difference = Math.abs(total - 2 * left);
        if (difference < best) {
          best = difference;
          bestMask = mask;
          events.push(
            event(
              "UPDATE_VALUE",
              [],
              `A group weighing ${left} versus ${total - left} improves the gap to ${best}.`,
              { variable: "bestGap", value: best },
              2,
              {
                schemaVersion: "0.1",
                equation: `|${left} − ${total - left}| = ${best}`,
                reason:
                  "Remember the smallest gap found among completed choices.",
              },
            ),
          );
        }
        return;
      }
      visit(index + 1, left, mask);
      visit(index + 1, left + weights[index], mask | (1 << index));
    }
    visit(0, 0, 0);
    weights.forEach((weight, index) => {
      events.push(
        event(
          "READ_INDEX",
          [`array:${index}`],
          `In the best split, apple ${index + 1} (${weight}) goes to group ${bestMask & (1 << index) ? "A" : "B"}.`,
          { value: weight },
          3,
        ),
      );
    });
    return { initialState: numberState(weights), events, output: String(best) };
  },
});

const apartments = defineProblem({
  metadata: metadata({
    id: "apartments",
    title: "Apartments",
    task: "1084",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Match the most applicants to distinct apartments within a size tolerance.",
    limits: "1–24 applicants and apartments; nonnegative tolerance",
    tags: ["sorting", "two pointers", "matching"],
    examples: [
      {
        input: '{"desired":[60,45,80,60],"apartments":[30,60,75],"k":5}',
        output: "2",
      },
    ],
    complexity: { time: "O(n log n + m log m)", space: "O(n + m) for sorting" },
    learning: {
      intuition:
        "After sorting both sides, an apartment that is too small cannot help any later applicant.",
      approach: [
        "Sort desired and available sizes.",
        "Advance the side whose current size cannot match.",
        "On a match, consume both entries.",
      ],
      explanation:
        "The two-pointer exchange argument never discards a feasible match for a later, larger applicant.",
    },
  }),
  defaultInput: { desired: [60, 45, 80, 60], apartments: [30, 60, 75], k: 5 },
  source: `const a=[...desired].sort((x,y)=>x-y), b=[...apartments].sort((x,y)=>x-y); let i=0,j=0,matched=0;
while(i<a.length&&j<b.length){if(b[j]<a[i]-k)j++;else if(b[j]>a[i]+k)i++;else{matched++;i++;j++;}} return matched;`,
  parseInput(raw) {
    const k = integer(readObject(raw).k, "k", 0, 1_000_000_000);
    return {
      desired: numbers(raw, "desired", 1, 24, 1, 1_000_000_000),
      apartments: numbers(raw, "apartments", 1, 24, 1, 1_000_000_000),
      k,
    };
  },
  trace({ desired, apartments: available, k }) {
    const applicants = [...desired].sort((a, b) => a - b),
      flats = [...available].sort((a, b) => a - b);
    const initialState = numberState([...applicants, ...flats]);
    applicants.forEach((_, i) => {
      initialState.entities[`array:${i}`].label = `A${i + 1}`;
    });
    flats.forEach((_, i) => {
      initialState.entities[`array:${applicants.length + i}`].label =
        `F${i + 1}`;
    });
    const events: EventDraft[] = [];
    let i = 0,
      j = 0,
      matched = 0;
    while (i < applicants.length && j < flats.length) {
      const desiredSize = applicants[i],
        flatSize = flats[j];
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Applicant ${i + 1} requests size ${desiredSize}.`,
          { value: desiredSize },
          2,
        ),
      );
      events.push(
        event(
          "READ_INDEX",
          [`array:${applicants.length + j}`],
          `Compare apartment ${flatSize} with requested ${desiredSize} (tolerance ${k}).`,
          { value: flatSize },
          2,
        ),
      );
      if (flatSize < desiredSize - k) j++;
      else if (flatSize > desiredSize + k) i++;
      else {
        matched++;
        i++;
        j++;
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `Assign this apartment; ${matched} applicant(s) matched.`,
            { variable: "matched", value: matched },
            3,
          ),
        );
      }
    }
    return { initialState, events, output: String(matched) };
  },
});

const ferrisWheel = defineProblem({
  metadata: metadata({
    id: "ferris-wheel",
    title: "Ferris Wheel",
    task: "1090",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Seat children in the fewest gondolas, at most two per gondola.",
    limits: "1–32 weights, each at most the gondola limit",
    tags: ["sorting", "two pointers", "greedy"],
    examples: [{ input: '{"weights":[7,2,3,9],"limit":10}', output: "3" }],
    complexity: { time: "O(n log n)", space: "O(n) for sorting" },
    learning: {
      intuition:
        "The heaviest remaining child must ride; pairing them with the lightest is the only useful chance to save a gondola.",
      approach: [
        "Sort weights.",
        "Seat the heaviest child.",
        "Include the lightest remaining child if their sum fits.",
      ],
      explanation:
        "If the lightest cannot ride with the heaviest, no one can; if they fit, that pairing cannot hurt an optimal solution.",
    },
  }),
  defaultInput: { weights: [7, 2, 3, 9], limit: 10 },
  source: `const a=[...weights].sort((x,y)=>x-y); let left=0,right=a.length-1,riders=0;
while(left<=right){if(a[left]+a[right]<=limit)left++;right--;riders++;} return riders;`,
  parseInput(raw) {
    const limit = integer(readObject(raw).limit, "limit", 1, 1_000_000_000);
    const weights = numbers(raw, "weights", 1, 32, 1, limit);
    return { weights, limit };
  },
  trace({ weights, limit }) {
    const events: EventDraft[] = [];
    const sorted = sortedItems(weights, events).map((item) => item.value);
    let left = 0,
      right = sorted.length - 1,
      rides = 0;
    while (left <= right) {
      const light = sorted[left],
        heavy = sorted[right];
      const fits = left < right && light + heavy <= limit;
      if (left < right)
        events.push(
          event(
            "READ_INDEX",
            [`array:${left}`],
            `The lightest remaining child weighs ${light}.`,
            { value: light },
            2,
          ),
        );
      events.push(
        event(
          "READ_INDEX",
          [`array:${right}`],
          fits
            ? `Pair ${light} and ${heavy} within limit ${limit}.`
            : `${heavy} rides without ${left < right ? light : "another child"}.`,
          { value: heavy },
          2,
          {
            schemaVersion: "0.1",
            equation:
              left === right
                ? `one child remains: ${heavy} ≤ ${limit}`
                : `${light} + ${heavy} ${fits ? "≤" : ">"} ${limit}`,
            reason:
              "Always allocate a gondola to the heaviest remaining child.",
          },
        ),
      );
      if (fits) left++;
      right--;
      rides++;
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${rides} gondola(s) allocated.`,
          { variable: "gondolas", value: rides },
          3,
        ),
      );
    }
    return {
      initialState: numberState(weights),
      events,
      output: String(rides),
    };
  },
});

function intervals(
  raw: unknown,
  key: string,
  distinctTimes = false,
): [number, number][] {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 32)
    throw new InputError(`${key} must contain 1–32 intervals`);
  const times = new Set<number>();
  return value.map((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2)
      throw new InputError(`${key}[${i}] must contain a start and end`);
    const start = integer(pair[0], `${key}[${i}][0]`, 1, 1_000_000_000);
    const end = integer(pair[1], `${key}[${i}][1]`, start + 1, 1_000_000_000);
    if (distinctTimes && (times.has(start) || times.has(end)))
      throw new InputError("all arrival and departure times must be distinct");
    times.add(start);
    times.add(end);
    return [start, end];
  });
}

const restaurantCustomers = defineProblem({
  metadata: metadata({
    id: "restaurant-customers",
    title: "Restaurant Customers",
    task: "1619",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Find the peak number of customers present across arrival and departure events.",
    limits: "1–32 visits with distinct arrival/departure times",
    tags: ["sweep line", "sorting"],
    examples: [{ input: '{"visits":[[5,8],[2,4],[3,9]]}', output: "2" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition: "Occupancy changes only at a person's arrival or departure.",
      approach: [
        "Turn each visit into a +1 arrival and −1 departure.",
        "Sort all events by time.",
        "Sweep once while tracking the highest occupancy.",
      ],
      explanation:
        "Between consecutive event times occupancy is constant, so the sweep examines every possible peak.",
    },
  }),
  defaultInput: {
    visits: [
      [5, 8],
      [2, 4],
      [3, 9],
    ],
  },
  source: `const events=visits.flatMap(([a,b])=>[[a,1],[b,-1]]).sort((x,y)=>x[0]-y[0]); let inside=0,best=0;
for(const [,change] of events){inside+=change;best=Math.max(best,inside);} return best;`,
  parseInput(raw) {
    return { visits: intervals(raw, "visits", true) };
  },
  trace({ visits }) {
    const points = visits
      .flatMap(([start, end]) => [
        { time: start, change: 1 },
        { time: end, change: -1 },
      ])
      .sort((a, b) => a.time - b.time);
    const initialState = numberState(points.map((point) => point.time));
    points.forEach((point, i) => {
      initialState.entities[`array:${i}`].label =
        `${point.change > 0 ? "+" : "−"}${point.time}`;
    });
    const events: EventDraft[] = [];
    let inside = 0,
      best = 0;
    points.forEach((point, i) => {
      inside += point.change;
      best = Math.max(best, inside);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `${point.change > 0 ? "Arrival" : "Departure"} at ${point.time}: ${inside} inside.`,
          { value: point.time },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Peak occupancy so far is ${best}.`,
          { variable: "peak", value: best },
          3,
        ),
      );
    });
    return { initialState, events, output: String(best) };
  },
});

const movieFestival = defineProblem({
  metadata: metadata({
    id: "movie-festival",
    title: "Movie Festival",
    task: "1629",
    category: "Sorting and Searching",
    renderer: "array",
    summary: "Watch the most whole movies without overlapping showtimes.",
    limits: "1–32 showtimes",
    tags: ["interval scheduling", "sorting", "greedy"],
    examples: [{ input: '{"movies":[[3,5],[4,9],[5,8]]}', output: "2" }],
    complexity: { time: "O(n log n)", space: "O(n) for sorting" },
    learning: {
      intuition:
        "The movie that ends earliest leaves the most time for later choices.",
      approach: [
        "Sort by finishing time.",
        "Accept a movie if it starts at or after the previous accepted ending.",
        "Count accepted movies.",
      ],
      explanation:
        "Replacing any first choice with the earliest finishing compatible movie never reduces later opportunities.",
    },
  }),
  defaultInput: {
    movies: [
      [3, 5],
      [4, 9],
      [5, 8],
    ],
  },
  source: `const ordered=[...movies].sort((a,b)=>a[1]-b[1]||a[0]-b[0]); let end=0,count=0;
for(const [start,finish] of ordered) if(start>=end){count++;end=finish;} return count;`,
  parseInput(raw) {
    return { movies: intervals(raw, "movies") };
  },
  trace({ movies }) {
    const ordered = [...movies].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const initialState = numberState(ordered.map((movie) => movie[1]));
    ordered.forEach(([start, end], i) => {
      initialState.entities[`array:${i}`].label = `${start}–${end}`;
    });
    const events: EventDraft[] = [];
    let end = 0,
      count = 0;
    ordered.forEach(([start, finish], i) => {
      const fits = start >= end;
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `${start}–${finish} ${fits ? "starts after the last selected film" : "overlaps a selected film"}.`,
          { value: finish },
          2,
        ),
      );
      if (fits) {
        count++;
        end = finish;
        events.push(
          event(
            "UPDATE_VALUE",
            [],
            `Watch this film; ${count} film(s) selected.`,
            { variable: "watched", value: count },
            3,
          ),
        );
      }
    });
    return { initialState, events, output: String(count) };
  },
});

const towers = defineProblem({
  metadata: metadata({
    id: "towers",
    title: "Towers",
    task: "1073",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Place cubes in arrival order while minimizing strictly descending towers.",
    limits: "1–32 positive cube sizes",
    tags: ["binary search", "greedy", "patience sorting"],
    examples: [{ input: '{"values":[3,8,2,1,5]}', output: "2" }],
    complexity: { time: "O(n log n)", space: "O(n)" },
    learning: {
      intuition:
        "Replace the smallest tower top greater than the new cube to preserve larger tops for later cubes.",
      approach: [
        "Maintain sorted tower tops.",
        "Binary-search the first top strictly greater than the cube.",
        "Replace that top, or create a new tower.",
      ],
      explanation:
        "A smaller available top dominates a larger one for all later placements, so this greedy choice preserves future options.",
    },
  }),
  defaultInput: { values: [3, 8, 2, 1, 5] },
  source: `const tops=[]; for(const cube of values){let l=0,r=tops.length;while(l<r){const m=(l+r)>>1;if(tops[m]>cube)r=m;else l=m+1;}tops[l]=cube;}return tops.length;`,
  parseInput(raw) {
    return { values: numbers(raw, "values", 1, 32, 1, 1_000_000_000) };
  },
  trace({ values }) {
    const events: EventDraft[] = [],
      tops: number[] = [];
    values.forEach((cube, i) => {
      let low = 0,
        high = tops.length;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (tops[middle] > cube) high = middle;
        else low = middle + 1;
      }
      const creates = low === tops.length;
      tops[low] = cube;
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `${cube} ${creates ? "starts a new tower" : `replaces tower top ${low + 1}`}.`,
          { value: cube },
          2,
          {
            schemaVersion: "0.1",
            equation: `tops = [${tops.join(", ")}]`,
            reason: "Use the first top strictly larger than this cube.",
          },
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `${tops.length} tower(s) needed after ${i + 1} cubes.`,
          { variable: "towers", value: tops.length },
          3,
        ),
      );
    });
    return {
      initialState: numberState(values),
      events,
      output: String(tops.length),
    };
  },
});

const tasksAndDeadlines = defineProblem({
  metadata: metadata({
    id: "tasks-and-deadlines",
    title: "Tasks and Deadlines",
    task: "1630",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Order all tasks to maximize deadline minus completion-time rewards.",
    limits: "1–24 duration/deadline pairs",
    tags: ["scheduling", "sorting", "greedy"],
    examples: [{ input: '{"tasks":[[6,10],[8,15],[5,12]]}', output: "2" }],
    complexity: { time: "O(n log n)", space: "O(n) for sorting" },
    learning: {
      intuition:
        "Finishing a shorter task first saves its duration from every later completion time.",
      approach: [
        "Sort tasks by duration.",
        "Accumulate completion time.",
        "Add deadline minus completion time for every task.",
      ],
      explanation:
        "Swapping adjacent out-of-order durations improves or preserves the sum of completion times, independent of deadlines.",
    },
  }),
  defaultInput: {
    tasks: [
      [6, 10],
      [8, 15],
      [5, 12],
    ],
  },
  source: `const ordered=[...tasks].sort((a,b)=>a[0]-b[0]);let finish=0,reward=0;
for(const [duration,deadline] of ordered){finish+=duration;reward+=deadline-finish;}return reward;`,
  parseInput(raw) {
    const value = readObject(raw).tasks;
    if (!Array.isArray(value) || value.length < 1 || value.length > 24)
      throw new InputError("tasks must contain 1–24 duration/deadline pairs");
    const tasks = value.map((pair, i) => {
      if (!Array.isArray(pair) || pair.length !== 2)
        throw new InputError(
          `tasks[${i}] must contain a duration and deadline`,
        );
      return [
        integer(pair[0], `tasks[${i}][0]`, 1, 1_000_000),
        integer(pair[1], `tasks[${i}][1]`, 1, 1_000_000),
      ] as [number, number];
    });
    return { tasks };
  },
  trace({ tasks }) {
    const ordered = [...tasks].sort((a, b) => a[0] - b[0]);
    const initialState = numberState(ordered.map((task) => task[0]));
    ordered.forEach(([duration, deadline], i) => {
      initialState.entities[`array:${i}`].label = `${duration}/${deadline}`;
    });
    const events: EventDraft[] = [];
    let finish = 0,
      reward = 0;
    ordered.forEach(([duration, deadline], i) => {
      finish += duration;
      reward += deadline - finish;
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Duration ${duration} finishes at ${finish}; deadline ${deadline} yields ${deadline - finish}.`,
          { value: duration },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Total reward is ${reward}.`,
          { variable: "reward", value: reward },
          3,
        ),
      );
    });
    return { initialState, events, output: String(reward) };
  },
});

const readingBooks = defineProblem({
  metadata: metadata({
    id: "reading-books",
    title: "Reading Books",
    task: "1631",
    category: "Sorting and Searching",
    renderer: "array",
    summary:
      "Find the shortest time for two readers to each finish every book without sharing one simultaneously.",
    limits: "1–32 reading times",
    tags: ["scheduling", "lower bound"],
    examples: [{ input: '{"times":[2,8,3]}', output: "16" }],
    complexity: { time: "O(n)", space: "O(1) beyond the input" },
    learning: {
      intuition:
        "Both readers need the total reading time; the longest book also blocks both readers for twice its length.",
      approach: [
        "Sum all book times.",
        "Find the longest book.",
        "Take the larger of total time and twice the longest time.",
      ],
      explanation:
        "Those are unavoidable lower bounds, and scheduling the longest book appropriately attains their maximum.",
    },
  }),
  defaultInput: { times: [2, 8, 3] },
  source: `const total=times.reduce((a,b)=>a+b,0), longest=Math.max(...times);return Math.max(total,2*longest);`,
  parseInput(raw) {
    return { times: numbers(raw, "times", 1, 32, 1, 1_000_000_000) };
  },
  trace({ times }) {
    const events: EventDraft[] = [];
    let total = 0,
      longest = 0;
    times.forEach((duration, i) => {
      total += duration;
      longest = Math.max(longest, duration);
      events.push(
        event(
          "READ_INDEX",
          [`array:${i}`],
          `Book ${i + 1} needs ${duration}; total work ${total}, longest ${longest}.`,
          { value: duration },
          2,
        ),
      );
      events.push(
        event(
          "UPDATE_VALUE",
          [],
          `Current lower bound is max(${total}, 2 × ${longest}) = ${Math.max(total, 2 * longest)}.`,
          { variable: "minimumTime", value: Math.max(total, 2 * longest) },
          3,
        ),
      );
    });
    return {
      initialState: numberState(times),
      events,
      output: String(Math.max(total, 2 * longest)),
    };
  },
});

export const wave200FoundationProblems = [
  entry(palindromeReorder),
  entry(grayCode),
  entry(creatingStrings),
  entry(appleDivision),
  entry(apartments),
  entry(ferrisWheel),
  entry(restaurantCustomers),
  entry(movieFestival),
  entry(towers),
  entry(tasksAndDeadlines),
  entry(readingBooks),
];
