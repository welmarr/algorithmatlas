import { emptyState } from "@sim/domain";
import {
  defineProblem,
  InputError,
  integer,
  readObject,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import {
  entry,
  event,
  metadata,
  numberState,
  stringValue,
} from "./extended-shared";

const editDistance = defineProblem({
  metadata: metadata({
    id: "edit-distance",
    title: "Edit Distance",
    task: "1639",
    category: "Dynamic Programming 2D",
    renderer: "dp",
    summary:
      "Find the minimum inserts, deletes, and replacements between two words.",
    limits: "Two uppercase words, each 1–8 characters",
    tags: ["DP", "strings"],
    examples: [{ input: '{"first":"LOVE","second":"MOVIE"}', output: "2" }],
    complexity: { time: "O(nm)", space: "O(nm)" },
    learning: {
      intuition: "A prefix pair can end with a match or one final edit.",
      approach: [
        "Fill empty-prefix base cases.",
        "For each pair of prefixes, compare delete, insert, and replace/match.",
        "Read the bottom-right cell.",
      ],
      explanation:
        "The recurrence chooses the cheapest valid final operation for each prefix pair.",
    },
  }),
  defaultInput: { first: "LOVE", second: "MOVIE" },
  source: `const dp = Array.from({length:first.length+1},()=>Array(second.length+1).fill(0));\nfor (let i=0;i<=first.length;i++) dp[i][0]=i;\nfor (let j=0;j<=second.length;j++) dp[0][j]=j;\nfor (let i=1;i<=first.length;i++) for (let j=1;j<=second.length;j++) {\n  dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(first[i-1]===second[j-1]?0:1));\n}\nreturn dp[first.length][second.length];`,
  parseInput(raw) {
    return {
      first: stringValue(raw, "first", 8),
      second: stringValue(raw, "second", 8),
    };
  },
  trace({ first, second }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      dp = Array.from({ length: first.length + 1 }, () =>
        Array<number>(second.length + 1).fill(0),
      );
    for (let i = 0; i <= first.length; i++)
      for (let j = 0; j <= second.length; j++) {
        const id = `dp:${i}:${j}`;
        state.entities[id] = {
          id,
          kind: "dp",
          label: `${i},${j}`,
          value: 0,
          status: "idle",
          metadata: {
            row: i,
            col: j,
            rowLabel: i ? first[i - 1] : "∅",
            colLabel: j ? second[j - 1] : "∅",
          },
        };
      }
    for (let i = 1; i <= first.length; i++) {
      dp[i][0] = i;
      events.push(
        event(
          "DP_BASE_CASE",
          [`dp:${i}:0`],
          `Delete ${i} letters to reach an empty word.`,
          { value: i },
          2,
        ),
      );
    }
    for (let j = 1; j <= second.length; j++) {
      dp[0][j] = j;
      events.push(
        event(
          "DP_BASE_CASE",
          [`dp:0:${j}`],
          `Insert ${j} letters from an empty word.`,
          { value: j },
          3,
        ),
      );
    }
    for (let i = 1; i <= first.length; i++)
      for (let j = 1; j <= second.length; j++) {
        const cost = first[i - 1] === second[j - 1] ? 0 : 1;
        const value = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
        dp[i][j] = value;
        events.push(
          event(
            "DP_UPDATE",
            [
              `dp:${i}:${j}`,
              `dp:${i - 1}:${j}`,
              `dp:${i}:${j - 1}`,
              `dp:${i - 1}:${j - 1}`,
            ],
            `${first.slice(0, i)} → ${second.slice(0, j)} needs ${value} edits; ${cost === 0 ? "letters match" : "letters differ"}.`,
            { value },
            5,
            {
              schemaVersion: "0.1",
              equation: `min(delete ${dp[i - 1][j]} + 1, insert ${dp[i][j - 1]} + 1, ${cost ? "replace" : "match"} ${dp[i - 1][j - 1]} + ${cost}) = ${value}`,
              reason: `${first[i - 1]} ${cost ? "≠" : "="} ${second[j - 1]}. Choose the cheapest last operation for these prefixes.`,
            },
          ),
        );
      }
    return {
      initialState: state,
      events,
      output: String(dp[first.length][second.length]),
    };
  },
});

const stringMatching = defineProblem({
  metadata: metadata({
    id: "string-matching",
    title: "String Matching",
    task: "1753",
    category: "Strings",
    renderer: "array",
    summary: "Count pattern occurrences in text with the KMP prefix table.",
    limits: "Uppercase text 1–32 letters; pattern 1–16 letters",
    tags: ["KMP", "prefix function"],
    examples: [{ input: '{"text":"ABABABA","pattern":"ABA"}', output: "3" }],
    complexity: { time: "O(n + m)", space: "O(m)" },
    learning: {
      intuition: "A mismatch can reuse a known matching prefix.",
      approach: [
        "Build the pattern prefix table.",
        "Scan text while carrying the matched-prefix length.",
        "On a full match, count it and fall back to the next border.",
      ],
      explanation:
        "The prefix table avoids re-reading text after a mismatch or overlapping match.",
    },
  }),
  defaultInput: { text: "ABABABA", pattern: "ABA" },
  source: `const pi=Array(pattern.length).fill(0); for (let i=1;i<pattern.length;i++) { let j=pi[i-1]; while (j && pattern[i]!==pattern[j]) j=pi[j-1]; if (pattern[i]===pattern[j]) j++; pi[i]=j; }\nlet matched=0,count=0;\nfor (const char of text) {\n  while (matched && char!==pattern[matched]) matched=pi[matched-1];\n  if (char===pattern[matched]) matched++;\n  if (matched===pattern.length) { count++; matched=pi[matched-1]; }\n}\nreturn count;`,
  parseInput(raw) {
    return {
      text: stringValue(raw, "text", 32),
      pattern: stringValue(raw, "pattern", 16),
    };
  },
  trace({ text, pattern }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      pi = Array<number>(pattern.length).fill(0);
    [...text].forEach((char, i) => {
      const id = `array:${i}`;
      state.entities[id] = {
        id,
        kind: "array",
        label: String(i),
        value: char,
        status: "idle",
      };
    });
    [...pattern].forEach((char, i) => {
      const id = `dp:${i}`;
      state.entities[id] = {
        id,
        kind: "dp",
        label: String(i),
        value: 0,
        status: "idle",
        metadata: { colLabel: char },
      };
    });
    for (let i = 1; i < pattern.length; i++) {
      let j = pi[i - 1];
      while (j > 0 && pattern[i] !== pattern[j]) j = pi[j - 1];
      if (pattern[i] === pattern[j]) j++;
      pi[i] = j;
      events.push(
        event(
          "DP_UPDATE",
          [`dp:${i}`],
          `Pattern prefix table at ${i} is ${j}.`,
          { variable: "border", value: j },
          1,
          {
            schemaVersion: "0.1",
            reason: `The longest proper prefix matching a suffix through pattern index ${i} has length ${j}.`,
            alignment: {
              text: pattern,
              pattern: pattern.slice(0, j),
              offset: i - j + 1,
              matched: j,
            },
          },
        ),
      );
    }
    let matched = 0,
      count = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      events.push(
        event(
          "MARK",
          [`array:${i}`],
          `Compare text ${char} with pattern at offset ${matched}.`,
          { status: "active" },
          4,
          {
            schemaVersion: "0.1",
            equation: `text[${i}] (${char}) ${char === pattern[matched] ? "=" : "≠"} pattern[${matched}] (${pattern[matched]})`,
            alignment: { text, pattern, offset: i - matched, matched },
          },
        ),
      );
      while (matched > 0 && char !== pattern[matched]) {
        matched = pi[matched - 1];
        events.push(
          event(
            "ANNOTATE",
            [],
            `Mismatch: reuse border of length ${matched}.`,
            { variable: "matched", value: matched },
            4,
            {
              schemaVersion: "0.1",
              reason:
                "Reuse the longest matching border from the prefix table. The text cursor does not move backward.",
              alignment: { text, pattern, offset: i - matched, matched },
            },
          ),
        );
      }
      if (char === pattern[matched]) matched++;
      if (matched === pattern.length) {
        count++;
        events.push(
          event(
            "MARK",
            [`array:${i}`],
            `Pattern occurrence ${count} ends here.`,
            { status: "path" },
            6,
          ),
        );
        matched = pi[matched - 1];
      } else
        events.push(
          event(
            "UNMARK",
            [`array:${i}`],
            `Matched prefix length is ${matched}.`,
            {},
            5,
          ),
        );
    }
    return { initialState: state, events, output: String(count) };
  },
});

const queens = defineProblem({
  metadata: metadata({
    id: "chessboard-and-queens",
    title: "Chessboard and Queens",
    task: "1624",
    category: "Backtracking",
    renderer: "grid",
    summary:
      "Count nonattacking queen placements on an interactive 1–6 square board with blocked cells, adapted from the CSES eight-queen task.",
    limits: "Square board of size 1–6 using . and *",
    tags: ["recursion", "backtracking"],
    examples: [
      { input: '{"rows":["....","....","....","...."]}', output: "2" },
    ],
    complexity: { time: "O(n!·n) upper bound", space: "O(n)" },
    learning: {
      intuition:
        "Choose one legal column for each row, then undo it before trying the next.",
      approach: [
        "Track occupied columns and diagonals.",
        "Place a queen in each legal square of the next row.",
        "Count a complete board, then backtrack.",
      ],
      explanation:
        "Trying every legal choice and undoing it explores each valid arrangement exactly once.",
    },
  }),
  defaultInput: { rows: ["....", "....", "....", "...."] },
  source: `const n=rows.length, columns=new Set(), down=new Set(), up=new Set(); let solutions=0;\nfunction search(row) { if (row===n) { solutions++; return; }\n  for (let col=0;col<n;col++) {\n    if (rows[row][col]==='*' || columns.has(col) || down.has(row-col) || up.has(row+col)) continue;\n    columns.add(col); down.add(row-col); up.add(row+col); search(row+1); columns.delete(col); down.delete(row-col); up.delete(row+col);\n  }\n}\nsearch(0); return solutions;`,
  parseInput(raw) {
    const rows = readObject(raw).rows;
    if (
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > 6 ||
      !rows.every(
        (row) =>
          typeof row === "string" &&
          row.length === rows.length &&
          /^[.*]+$/.test(row),
      )
    )
      throw new InputError("rows must be a square 1–6 board using . and *");
    return { rows: rows as string[] };
  },
  trace({ rows }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      n = rows.length,
      columns = new Set<number>(),
      down = new Set<number>(),
      up = new Set<number>();
    rows.forEach((row, r) =>
      [...row].forEach((char, c) => {
        const id = `grid:${r}:${c}`;
        state.entities[id] = {
          id,
          kind: "grid",
          label: char === "*" ? "#" : ".",
          status: char === "*" ? "blocked" : "idle",
          metadata: { row: r, col: c, queen: true },
        };
      }),
    );
    let solutions = 0;
    const search = (row: number) => {
      if (row === n) {
        solutions++;
        events.push(
          event(
            "ANNOTATE",
            [],
            `Complete arrangement ${solutions}.`,
            { variable: "solutions", value: solutions },
            2,
          ),
        );
        return;
      }
      for (let col = 0; col < n; col++) {
        const id = `grid:${row}:${col}`;
        const conflict =
          rows[row][col] === "*"
            ? "This square is blocked."
            : columns.has(col)
              ? "A queen already occupies this column."
              : down.has(row - col) || up.has(row + col)
                ? "A queen attacks this square along a diagonal."
                : null;
        events.push(
          event(
            "ANNOTATE",
            [],
            conflict
              ? `Reject row ${row + 1}, column ${col + 1}: ${conflict}`
              : `Consider row ${row + 1}, column ${col + 1}.`,
            { variable: "depth", value: row },
            4,
            {
              schemaVersion: "0.1",
              reason:
                conflict ??
                "This column and both diagonals are free; the candidate can be placed.",
              labels: [
                {
                  entityId: id,
                  label: conflict ? "Rejected ×" : "Candidate",
                  role: conflict ? "rejected" : "current",
                },
              ],
            },
          ),
        );
        if (conflict) continue;
        columns.add(col);
        down.add(row - col);
        up.add(row + col);
        events.push(
          event(
            "MARK",
            [id],
            `Place a queen at row ${row + 1}, column ${col + 1}.`,
            { status: "path" },
            5,
            {
              schemaVersion: "0.1",
              reason: `Row ${row + 1}: column ${col + 1} and both diagonals are free. Choose this square and descend to row ${row + 2}.`,
              labels: [{ entityId: id, label: "Choose ♛", role: "accepted" }],
            },
          ),
        );
        search(row + 1);
        events.push(
          event(
            "UNMARK",
            [id],
            `Backtrack from row ${row + 1}, column ${col + 1}.`,
            {},
            5,
            {
              schemaVersion: "0.1",
              reason:
                "Return from the recursive branch. Remove this queen and release its column and diagonals before trying another choice.",
              labels: [{ entityId: id, label: "Undo ♛", role: "rejected" }],
            },
          ),
        );
        columns.delete(col);
        down.delete(row - col);
        up.delete(row + col);
      }
    };
    search(0);
    return { initialState: state, events, output: String(solutions) };
  },
});

const exponentiation = defineProblem({
  metadata: metadata({
    id: "exponentiation",
    title: "Exponentiation",
    task: "1095",
    category: "Mathematics",
    renderer: "variables",
    summary:
      "Compute one modular power with repeated squaring, adapted from the CSES batch task.",
    limits: "Base and exponent 0–1,000,000,000",
    tags: ["modular arithmetic", "binary exponentiation"],
    examples: [{ input: '{"base":3,"exponent":4}', output: "81" }],
    complexity: { time: "O(log exponent)", space: "O(1)" },
    learning: {
      intuition:
        "Each exponent bit decides whether to include the current power of two.",
      approach: [
        "Start with result 1.",
        "Multiply by the current base when the exponent is odd.",
        "Square the base and halve the exponent.",
      ],
      explanation:
        "Repeated squaring visits only the binary digits of the exponent.",
    },
  }),
  defaultInput: { base: 3, exponent: 4 },
  source: `const MOD=1000000007n; let result=1n, power=BigInt(base)%MOD, remaining=exponent;\nwhile (remaining>0) {\n  if (remaining%2===1) result=result*power%MOD;\n  power=power*power%MOD;\n  remaining=Math.floor(remaining/2);\n}\nreturn result;`,
  parseInput(raw) {
    const obj = readObject(raw);
    return {
      base: integer(obj.base, "base", 0, 1000000000),
      exponent: integer(obj.exponent, "exponent", 0, 1000000000),
    };
  },
  trace({ base, exponent }) {
    const state = emptyState(),
      events: EventDraft[] = [],
      mod = 1000000007n;
    let result = 1n,
      power = BigInt(base) % mod,
      remaining = exponent;
    state.variables = { result: 1, power: Number(power), remaining };
    while (remaining > 0) {
      if (remaining % 2 === 1) {
        result = (result * power) % mod;
        events.push(
          event(
            "ANNOTATE",
            [],
            `Odd exponent: multiply result by ${power} modulo 1,000,000,007.`,
            { variable: "result", value: Number(result) },
            3,
            {
              schemaVersion: "0.1",
              equation: `exponent ${remaining} is odd · result × ${power} mod 1,000,000,007 = ${result}`,
              reason:
                "An odd low bit contributes the current power to the product.",
            },
          ),
        );
      }
      power = (power * power) % mod;
      remaining = Math.floor(remaining / 2);
      events.push(
        event(
          "ANNOTATE",
          [],
          `Square power to ${power}; remaining exponent ${remaining}.`,
          { variable: "power", value: Number(power) },
          4,
          {
            schemaVersion: "0.1",
            equation: `power² mod 1,000,000,007 = ${power}`,
            reason:
              "Squaring advances to the next binary place; halve the remaining exponent.",
          },
        ),
      );
      events.push(
        event(
          "ANNOTATE",
          [],
          `Remaining exponent is ${remaining}.`,
          { variable: "remaining", value: remaining },
          5,
        ),
      );
    }
    return { initialState: state, events, output: String(result) };
  },
});

type Point = [number, number];
const polygonArea = defineProblem({
  metadata: metadata({
    id: "polygon-area",
    title: "Polygon Area",
    task: "2191",
    category: "Geometry",
    renderer: "array",
    summary:
      "Sum signed edge cross products to find twice a simple polygon's area.",
    limits:
      "3–12 distinct integer points within −1000…1000; supply a simple polygon",
    tags: ["shoelace formula", "cross product"],
    examples: [{ input: '{"points":[[0,0],[4,0],[4,3],[0,3]]}', output: "24" }],
    complexity: { time: "O(n)", space: "O(n) for the displayed edge terms" },
    learning: {
      intuition: "Each directed edge contributes a signed cross product.",
      approach: [
        "Pair each vertex with the next, including the closing edge.",
        "Add xᵢyᵢ₊₁ − yᵢxᵢ₊₁.",
        "Take the absolute value for twice the area.",
      ],
      explanation:
        "The signed edge contributions cancel outside the polygon and leave twice its oriented area.",
    },
  }),
  defaultInput: {
    points: [
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
    ] as Point[],
  },
  source: `let doubled = 0;\nfor (let i=0; i<points.length; i++) {\n  const [x1,y1] = points[i], [x2,y2] = points[(i+1)%points.length];\n  doubled += x1*y2-y1*x2;\n}\nreturn Math.abs(doubled);`,
  parseInput(raw) {
    const points = readObject(raw).points;
    if (
      !Array.isArray(points) ||
      points.length < 3 ||
      points.length > 12 ||
      !points.every(
        (point) =>
          Array.isArray(point) &&
          point.length === 2 &&
          point.every(
            (coordinate) =>
              Number.isSafeInteger(coordinate) &&
              coordinate >= -1000 &&
              coordinate <= 1000,
          ),
      ) ||
      new Set(points.map((point) => point.join(","))).size !== points.length
    )
      throw new InputError(
        "points must be 3–12 distinct [x,y] integer pairs within −1000…1000",
      );
    return { points: points as Point[] };
  },
  trace({ points }) {
    const state = numberState(points.map(() => 0)),
      events: EventDraft[] = [];
    points.forEach(([x, y], i) => {
      state.entities[`array:${i}`].metadata = { x, y };
    });
    let doubled = 0;
    points.forEach(([x1, y1], i) => {
      const [x2, y2] = points[(i + 1) % points.length];
      const cross = x1 * y2 - y1 * x2;
      doubled += cross;
      events.push(
        event(
          "WRITE_INDEX",
          [`array:${i}`],
          `Edge (${x1},${y1})→(${x2},${y2}) contributes ${cross}.`,
          { value: cross },
          4,
          {
            schemaVersion: "0.1",
            equation: `${x1} × ${y2} − ${y1} × ${x2} = ${cross}`,
            reason: `Add this directed edge's signed cross product. Running signed doubled area: ${doubled}. The final absolute value is twice the area.`,
          },
        ),
      );
      events.push(
        event(
          "ANNOTATE",
          [],
          `Signed doubled area so far: ${doubled}.`,
          { variable: "signedArea", value: doubled },
          4,
        ),
      );
    });
    return { initialState: state, events, output: String(Math.abs(doubled)) };
  },
});

export const mixedProblems = [
  entry(editDistance),
  entry(stringMatching),
  entry(queens),
  entry(exponentiation),
  entry(polygonArea),
];
