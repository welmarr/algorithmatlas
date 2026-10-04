import { emptyState } from "@sim/domain";
import { defineProblem, readObject, InputError } from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";

function textInput(raw: unknown) {
  const value = readObject(raw).text;
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 32 ||
    !/^[a-z]+$/.test(value)
  )
    throw new InputError("text must contain 1–32 lowercase letters");
  return { text: value };
}
function stringState(text: string) {
  const state = emptyState();
  [...text].forEach((letter, index) => {
    const id = `array:${index}`;
    state.entities[id] = {
      id,
      kind: "array",
      label: String(index + 1),
      value: letter,
      status: "idle",
    };
  });
  return state;
}
function prefixFunction(text: string, events?: EventDraft[]) {
  const pi = Array<number>(text.length).fill(0);
  for (let i = 1; i < text.length; i++) {
    let matched = pi[i - 1];
    while (matched && text[i] !== text[matched]) matched = pi[matched - 1];
    if (text[i] === text[matched]) matched++;
    pi[i] = matched;
    events?.push(
      event(
        "MARK",
        [`array:${i}`],
        `At position ${i + 1}, the longest matching proper prefix has length ${matched}.`,
        { status: "active" },
        1,
        {
          schemaVersion: "0.1",
          equation: `π(${i + 1}) = ${matched}`,
          reason:
            "Fall back through previously known borders after a mismatch.",
        },
      ),
    );
  }
  return pi;
}
function zFunction(text: string, events?: EventDraft[]) {
  const z = Array<number>(text.length).fill(0);
  let left = 0,
    right = 0;
  for (let i = 1; i < text.length; i++) {
    if (i <= right) z[i] = Math.min(right - i + 1, z[i - left]);
    while (i + z[i] < text.length && text[z[i]] === text[i + z[i]]) z[i]++;
    if (i + z[i] - 1 > right) {
      left = i;
      right = i + z[i] - 1;
    }
    events?.push(
      event(
        "MARK",
        [`array:${i}`],
        `Suffix starting at ${i + 1} matches the prefix for ${z[i]} letters.`,
        { status: "active" },
        1,
        {
          schemaVersion: "0.1",
          equation: `z(${i + 1}) = ${z[i]}`,
          reason:
            "Reuse the current matching window, then extend character by character.",
        },
      ),
    );
  }
  return z;
}

const findingBorders = defineProblem({
  metadata: metadata({
    id: "finding-borders",
    title: "Finding Borders",
    task: "1732",
    category: "Strings",
    renderer: "array",
    summary: "List proper prefix lengths that are also suffix lengths.",
    limits: "1–32 lowercase letters",
    tags: ["prefix function", "borders", "KMP"],
    examples: [{ input: '{"text":"abcababcab"}', output: "2 5" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "The longest border of a prefix points to the next shorter border of that same prefix.",
      approach: [
        "Compute the KMP prefix function.",
        "Start from the final prefix-function value.",
        "Follow links to shorter borders and reverse the collected lengths.",
      ],
      explanation:
        "Any border of the full string must be a border of its longest border, so the prefix-function chain lists all and only proper borders.",
    },
  }),
  defaultInput: { text: "abcababcab" },
  source: `const pi=Array(text.length).fill(0);for(let i=1;i<text.length;i++){let j=pi[i-1];while(j&&text[i]!==text[j])j=pi[j-1];if(text[i]===text[j])j++;pi[i]=j;}const borders=[];for(let len=pi[text.length-1];len;len=pi[len-1])borders.push(len);return borders.reverse().join(' ');`,
  parseInput: textInput,
  trace({ text }) {
    const state = stringState(text),
      events: EventDraft[] = [],
      pi = prefixFunction(text, events),
      borders: number[] = [];
    for (let length = pi[text.length - 1]; length; length = pi[length - 1]) {
      borders.push(length);
      events.push(
        event(
          "ANNOTATE",
          [],
          `Length ${length} is both a proper prefix and a suffix.`,
          {},
          1,
        ),
      );
    }
    if (!borders.length)
      events.push(
        event("ANNOTATE", [], "No proper prefix equals a suffix.", {}, 1),
      );
    return { initialState: state, events, output: borders.reverse().join(" ") };
  },
});

const findingPeriods = defineProblem({
  metadata: metadata({
    id: "finding-periods",
    title: "Finding Periods",
    task: "1733",
    category: "Strings",
    renderer: "array",
    summary:
      "Find every prefix length whose repetition generates the full string.",
    limits: "1–32 lowercase letters",
    tags: ["Z-function", "periodicity", "string matching"],
    examples: [{ input: '{"text":"abcabca"}', output: "3 6 7" }],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "A candidate period p works exactly when the suffix from p onward equals the string's prefix.",
      approach: [
        "Compute the Z-function for every starting position.",
        "Test each period p shorter than the string with z[p] ≥ n−p.",
        "Include the whole length, which always generates the string.",
      ],
      explanation:
        "The final repetition may be partial, so matching the suffix of length n−p is sufficient and necessary.",
    },
  }),
  defaultInput: { text: "abcabca" },
  source: `const z=Array(text.length).fill(0);let left=0,right=0;for(let i=1;i<text.length;i++){if(i<=right)z[i]=Math.min(right-i+1,z[i-left]);while(i+z[i]<text.length&&text[z[i]]===text[i+z[i]])z[i]++;if(i+z[i]-1>right){left=i;right=i+z[i]-1;}}const periods=[];for(let p=1;p<=text.length;p++)if(p===text.length||z[p]>=text.length-p)periods.push(p);return periods.join(' ');`,
  parseInput: textInput,
  trace({ text }) {
    const state = stringState(text),
      events: EventDraft[] = [],
      z = zFunction(text, events),
      periods: number[] = [];
    for (let p = 1; p <= text.length; p++)
      if (p === text.length || z[p] >= text.length - p) {
        periods.push(p);
        events.push(
          event(
            "ANNOTATE",
            [],
            `Prefix length ${p} generates the full string, including a possible partial ending.`,
            {},
            1,
          ),
        );
      }
    return { initialState: state, events, output: periods.join(" ") };
  },
});

const stringFunctions = defineProblem({
  metadata: metadata({
    id: "string-functions",
    title: "String Functions",
    task: "2107",
    category: "Strings",
    renderer: "array",
    summary: "Compute the Z and KMP prefix functions for every position.",
    limits: "1–32 lowercase letters",
    tags: ["Z-function", "prefix function", "KMP"],
    examples: [
      { input: '{"text":"abaabca"}', output: "0 0 1 2 0 0 1\n0 0 1 1 2 0 1" },
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    learning: {
      intuition:
        "Two complementary arrays record matching prefixes from a starting position and matching borders ending at a position.",
      approach: [
        "Build Z values with a reusable matching window.",
        "Build prefix-function values by following border fallbacks.",
        "Compare the two arrays at each string position.",
      ],
      explanation:
        "Z reuses a rightmost prefix-matching interval; the prefix function reuses earlier border lengths. Each index advances or falls back only linearly overall.",
    },
  }),
  defaultInput: { text: "abaabca" },
  source: `const z=Array(text.length).fill(0);let l=0,r=0;for(let i=1;i<text.length;i++){if(i<=r)z[i]=Math.min(r-i+1,z[i-l]);while(i+z[i]<text.length&&text[z[i]]===text[i+z[i]])z[i]++;if(i+z[i]-1>r){l=i;r=i+z[i]-1;}}const pi=Array(text.length).fill(0);for(let i=1;i<text.length;i++){let j=pi[i-1];while(j&&text[i]!==text[j])j=pi[j-1];if(text[i]===text[j])j++;pi[i]=j;}return z.join(' ')+'\\n'+pi.join(' ');`,
  parseInput: textInput,
  trace({ text }) {
    const state = stringState(text),
      events: EventDraft[] = [],
      z = zFunction(text, events),
      pi = prefixFunction(text, events);
    if (!events.length)
      events.push(
        event(
          "ANNOTATE",
          [],
          "A single letter has zero Z and proper-border lengths.",
          {},
          1,
        ),
      );
    return {
      initialState: state,
      events,
      output: `${z.join(" ")}\n${pi.join(" ")}`,
    };
  },
});

function wordsInput(raw: unknown) {
  const text = textInput(raw).text,
    value = readObject(raw).words;
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 10 ||
    !value.every(
      (word) =>
        typeof word === "string" &&
        word.length >= 1 &&
        word.length <= 12 &&
        /^[a-z]+$/.test(word),
    ) ||
    new Set(value).size !== value.length
  )
    throw new InputError(
      "words must contain 1–10 distinct lowercase words of length 1–12",
    );
  return { text, words: value as string[] };
}
function trie(words: string[]) {
  const next: Array<Map<string, number>> = [new Map()],
    terminal = [false];
  for (const word of words) {
    let at = 0;
    for (const char of word) {
      if (!next[at].has(char)) {
        next[at].set(char, next.length);
        next.push(new Map());
        terminal.push(false);
      }
      at = next[at].get(char)!;
    }
    terminal[at] = true;
  }
  return { next, terminal };
}
const wordCombinations = defineProblem({
  metadata: metadata({
    id: "word-combinations",
    title: "Word Combinations",
    task: "1731",
    category: "Strings",
    renderer: "dp",
    summary:
      "Count ways to construct a string by concatenating dictionary words.",
    limits: "1–32 lowercase letters and 1–10 distinct words of length 1–12",
    tags: ["trie", "prefix DP", "string segmentation"],
    examples: [
      { input: '{"text":"ababc","words":["ab","abab","c","cb"]}', output: "2" },
    ],
    complexity: {
      time: "O(total word length + n·L)",
      space: "O(total word length + n)",
    },
    learning: {
      intuition:
        "Every valid prefix can be extended by any dictionary word matching at its end.",
      approach: [
        "Insert dictionary words into a trie.",
        "At each reachable text position, walk the trie along subsequent letters.",
        "When a word ends, add this prefix's way count to the ending position.",
      ],
      explanation:
        "Every complete segmentation has a unique final word, so adding counts from valid prefix boundaries counts each construction once.",
    },
  }),
  defaultInput: { text: "ababc", words: ["ab", "abab", "c", "cb"] },
  source: `const next=[new Map()],end=[false];for(const word of words){let at=0;for(const char of word){if(!next[at].has(char)){next[at].set(char,next.length);next.push(new Map());end.push(false);}at=next[at].get(char);}end[at]=true;}const dp=Array(text.length+1).fill(0);dp[0]=1;for(let i=0;i<text.length;i++){if(!dp[i])continue;let at=0;for(let j=i;j<text.length;j++){at=next[at].get(text[j]);if(at===undefined)break;if(end[at])dp[j+1]=(dp[j+1]+dp[i])%1000000007;}}return dp[text.length];`,
  parseInput: wordsInput,
  trace({ text, words }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      dp = Array<number>(text.length + 1).fill(0),
      { next, terminal } = trie(words);
    for (let index = 0; index <= text.length; index++) {
      const id = `dp:${index}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: String(index),
        value: 0,
        status: "idle",
        metadata: { colLabel: text[index - 1] ?? "start" },
      };
    }
    dp[0] = 1;
    events.push(
      event(
        "DP_UPDATE",
        ["dp:0"],
        "There is one way to build the empty prefix.",
        { variable: "ways", value: 1 },
        1,
      ),
    );
    for (let i = 0; i < text.length; i++) {
      if (!dp[i]) continue;
      let at = 0;
      for (let j = i; j < text.length; j++) {
        const child = next[at].get(text[j]);
        if (child === undefined) break;
        at = child;
        if (terminal[at]) {
          dp[j + 1] = (dp[j + 1] + dp[i]) % 1_000_000_007;
          events.push(
            event(
              "DP_UPDATE",
              [`dp:${j + 1}`],
              `Word ${text.slice(i, j + 1)} extends ${dp[i]} ways at position ${i} to ${dp[j + 1]} ways at ${j + 1}.`,
              { variable: "ways", value: dp[j + 1] },
              1,
              {
                schemaVersion: "0.1",
                equation: `dp[${j + 1}] = ${dp[j + 1]}`,
                reason:
                  "Append this complete dictionary word to every construction of the preceding prefix.",
              },
            ),
          );
        }
      }
    }
    return { initialState: state, events, output: String(dp[text.length]) };
  },
});

export const stringAlgorithmProblems = [
  entry(findingBorders),
  entry(findingPeriods),
  entry(stringFunctions),
  entry(wordCombinations),
];
