import { emptyState } from "@sim/domain";
import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata, numbers } from "./extended-shared";

const MOD = 1_000_000_007n;
const PHI = MOD - 1n;
type Explain = (
  label: string,
  value: number,
  reason: string,
  equation?: string,
) => void;

function lesson<I>(spec: {
  meta: Parameters<typeof metadata>[0];
  defaultInput: I;
  source: string;
  parse: (raw: unknown) => I;
  solve: (input: I, explain: Explain) => string;
}) {
  return entry(
    defineProblem({
      metadata: metadata(spec.meta),
      defaultInput: spec.defaultInput,
      source: spec.source,
      parseInput: spec.parse,
      trace(input) {
        const state = emptyState(),
          events: EventDraft[] = [];
        state.variables = { progress: 0 };
        const explain: Explain = (label, value, reason, equation) => {
          events.push(
            event(
              "ANNOTATE",
              [],
              `${label}: ${reason}`,
              { variable: "progress", value },
              1,
              {
                schemaVersion: "0.1",
                reason,
                ...(equation ? { equation } : {}),
              },
            ),
          );
        };
        const output = spec.solve(input, explain);
        return { initialState: state, events, output };
      },
    }),
  );
}

function power(base: bigint, exponent: bigint, modulus = MOD) {
  let result = 1n,
    factor = base % modulus,
    remaining = exponent;
  while (remaining > 0n) {
    if (remaining & 1n) result = (result * factor) % modulus;
    factor = (factor * factor) % modulus;
    remaining >>= 1n;
  }
  return result;
}
function choose(a: number, b: number) {
  if (b < 0 || b > a) return 0n;
  const fact: bigint[] = [1n];
  for (let i = 1; i <= a; i++) fact[i] = (fact[i - 1] * BigInt(i)) % MOD;
  return (fact[a] * power((fact[b] * fact[a - b]) % MOD, MOD - 2n)) % MOD;
}
function tuples(raw: unknown, key: string, width: number, max = 1_000_000_000) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 6)
    throw new InputError(`${key} must contain 1–6 tuples`);
  return value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== width)
      throw new InputError(`${key}[${i}] must contain ${width} integers`);
    return item.map((cell, j) => integer(cell, `${key}[${i}][${j}]`, 0, max));
  });
}

const exponentiationII = lesson({
  meta: {
    id: "exponentiation-ii",
    title: "Exponentiation II",
    task: "1712",
    category: "Mathematics",
    renderer: "variables",
    summary:
      "Evaluate nested powers modulo a prime without constructing the enormous exponent.",
    limits: "1–6 triples with values 0–1,000,000,000",
    tags: ["modular arithmetic", "binary exponentiation", "Fermat theorem"],
    examples: [
      {
        input: '{"queries":[[3,7,1],[15,2,2],[3,4,5]]}',
        output: "2187\n50625\n763327764",
      },
    ],
    complexity: { time: "O(q log max(b,c))", space: "O(1) per query" },
    learning: {
      intuition:
        "Reduce the exponent modulo p−1, then use repeated squaring modulo p.",
      approach: [
        "Compute b^c modulo p−1.",
        "Treat a divisible by p separately when the true exponent is positive.",
        "Square the base along the binary digits of the reduced exponent.",
      ],
      explanation:
        "Fermat's theorem shortens exponents for nonzero residues. The zero-base exception preserves the difference between a zero and a positive exponent.",
    },
  },
  defaultInput: {
    queries: [
      [3, 7, 1],
      [15, 2, 2],
      [3, 4, 5],
    ],
  },
  source: `const P=1000000007n; function pow(a,b,m){let r=1n;for(a%=m;b>0n;b>>=1n,a=a*a%m)if(b&1n)r=r*a%m;return r;} return queries.map(([a,b,c])=>{const zero=b===0&&c>0;const e=pow(BigInt(b),BigInt(c),P-1n);return String(a%Number(P)===0&&!zero?0n:pow(BigInt(a),e,P));}).join('\\n');`,
  parse: (raw) => ({ queries: tuples(raw, "queries", 3) }),
  solve: ({ queries }, explain) =>
    queries
      .map(([a, b, c], i) => {
        const reduced = power(BigInt(b), BigInt(c), PHI),
          exponentZero = b === 0 && c > 0;
        const answer =
          a % Number(MOD) === 0 && !exponentZero
            ? 0n
            : power(BigInt(a), reduced);
        explain(
          `Query ${i + 1}`,
          Number(answer),
          `Reduce ${b}^${c} modulo p−1 to ${reduced}, then exponentiate ${a}.`,
          `${a}^(${b}^${c}) ≡ ${answer} (mod p)`,
        );
        return String(answer);
      })
      .join("\n"),
});

const fibonacciNumbers = lesson({
  meta: {
    id: "fibonacci-numbers",
    title: "Fibonacci Numbers",
    task: "1722",
    category: "Mathematics",
    renderer: "variables",
    summary: "Find a distant Fibonacci number with fast doubling.",
    limits: "Index 0–1,000,000 for the interactive trace",
    tags: ["modular arithmetic", "fast doubling", "recurrence"],
    examples: [{ input: '{"index":10}', output: "55" }],
    complexity: { time: "O(log n)", space: "O(log n)" },
    learning: {
      intuition: "A pair (Fₙ,Fₙ₊₁) determines the pair at twice the index.",
      approach: [
        "Recurse on half the index.",
        "Use the doubling identities for even and odd indices.",
        "Return the first component modulo p.",
      ],
      explanation:
        "The pair identities follow from Fibonacci addition formulas and halve the index at each level.",
    },
  },
  defaultInput: { index: 10 },
  source: `const P=1000000007n; function fib(n){if(n===0n)return [0n,1n];const [a,b]=fib(n/2n),c=a*(2n*b-a+P)%P,d=(a*a+b*b)%P;return n%2n?[d,(c+d)%P]:[c,d];}return String(fib(BigInt(index))[0]);`,
  parse(raw) {
    const o = readObject(raw);
    return { index: integer(o.index, "index", 0, 1_000_000) };
  },
  solve({ index }, explain) {
    function fib(n: number): [bigint, bigint] {
      if (n === 0) return [0n, 1n];
      const [a, b] = fib(Math.floor(n / 2)),
        c = (a * (2n * b - a + MOD)) % MOD,
        d = (a * a + b * b) % MOD;
      const pair: [bigint, bigint] = n % 2 ? [d, (c + d) % MOD] : [c, d];
      explain(
        `Index ${n}`,
        Number(pair[0]),
        `Double the half-index pair to obtain F${n}.`,
        `F${n} = ${pair[0]} (mod p)`,
      );
      return pair;
    }
    const answer = fib(index)[0];
    if (index === 0) explain("Base case", 0, "F₀ is zero.", "F₀ = 0");
    return String(answer);
  },
});

const countingDivisors = lesson({
  meta: {
    id: "counting-divisors",
    title: "Counting Divisors",
    task: "1713",
    category: "Mathematics",
    renderer: "variables",
    summary: "Count divisors from the exponents in each prime factorization.",
    limits: "1–6 values from 1 to 1,000,000",
    tags: ["number theory", "prime factorization", "sieve"],
    examples: [{ input: '{"values":[16,17,18]}', output: "5\n2\n6" }],
    complexity: { time: "O(M log log M + q log M)", space: "O(M)" },
    learning: {
      intuition: "For pᵉ, a divisor chooses any exponent from 0 through e.",
      approach: [
        "Build smallest prime factors through the largest input.",
        "Factor each value by repeated smallest-prime division.",
        "Multiply e+1 for every prime.",
      ],
      explanation:
        "Prime factorization is unique, and independent exponent choices multiply.",
    },
  },
  defaultInput: { values: [16, 17, 18] },
  source: `const max=Math.max(...values),spf=Array(max+1).fill(0);for(let p=2;p<=max;p++)if(!spf[p])for(let x=p;x<=max;x+=p)if(!spf[x])spf[x]=p;return values.map(v=>{let ways=1;while(v>1){const p=spf[v];let e=0;do{v/=p;e++;}while(v>1&&v%p===0);ways*=e+1;}return ways;}).join(String.fromCharCode(10));`,
  parse: (raw) => ({ values: numbers(raw, "values", 1, 6, 1, 1_000_000) }),
  solve({ values }, explain) {
    const max = Math.max(...values),
      spf = Array<number>(max + 1).fill(0);
    for (let p = 2; p <= max; p++)
      if (!spf[p]) for (let x = p; x <= max; x += p) if (!spf[x]) spf[x] = p;
    return values
      .map((value, i) => {
        let remaining = value,
          ways = 1;
        while (remaining > 1) {
          const p = spf[remaining];
          let exponent = 0;
          do {
            remaining /= p;
            exponent++;
          } while (remaining > 1 && remaining % p === 0);
          ways *= exponent + 1;
          explain(
            `Value ${i + 1}`,
            ways,
            `Prime ${p} occurs ${exponent} times; multiply by ${exponent + 1}.`,
            `divisors so far = ${ways}`,
          );
        }
        if (value === 1)
          explain(
            `Value ${i + 1}`,
            1,
            "One has exactly one positive divisor.",
            "τ(1)=1",
          );
        return String(ways);
      })
      .join("\n");
  },
});

const commonDivisors = lesson({
  meta: {
    id: "common-divisors",
    title: "Common Divisors",
    task: "1081",
    category: "Mathematics",
    renderer: "variables",
    summary: "Find the largest divisor shared by some pair of values.",
    limits: "2–12 values from 1 to 10,000",
    tags: ["number theory", "multiples", "GCD"],
    examples: [{ input: '{"values":[3,14,15,7,9]}', output: "7" }],
    complexity: { time: "O(M log M+n)", space: "O(M)" },
    learning: {
      intuition:
        "A candidate divisor works once at least two input values are its multiples.",
      approach: [
        "Count each input value, including duplicates.",
        "Scan candidate divisors from largest to smallest.",
        "Sum frequencies at its multiples and stop at two.",
      ],
      explanation:
        "Descending order makes the first qualifying candidate the maximum possible pairwise GCD.",
    },
  },
  defaultInput: { values: [3, 14, 15, 7, 9] },
  source: `const max=Math.max(...values),count=Array(max+1).fill(0);for(const x of values)count[x]++;for(let d=max;d>=1;d--){let matches=0;for(let x=d;x<=max;x+=d)matches+=count[x];if(matches>=2)return d;}`,
  parse: (raw) => ({ values: numbers(raw, "values", 2, 12, 1, 10_000) }),
  solve({ values }, explain) {
    const max = Math.max(...values),
      count = Array<number>(max + 1).fill(0);
    for (const x of values) count[x]++;
    for (let d = max; d >= 1; d--) {
      let matches = 0;
      for (let x = d; x <= max; x += d) matches += count[x];
      if (matches >= 2) {
        explain(
          "Largest common divisor",
          d,
          `At least ${matches} values are divisible by ${d}; all larger candidates failed.`,
          `max gcd = ${d}`,
        );
        return String(d);
      }
    }
    throw new Error("Every pair shares divisor one");
  },
});

const binomialCoefficients = lesson({
  meta: {
    id: "binomial-coefficients",
    title: "Binomial Coefficients",
    task: "1079",
    category: "Mathematics",
    renderer: "variables",
    summary: "Count selections with factorials and modular inverses.",
    limits: "1–6 pairs with 0 ≤ b ≤ a ≤ 40",
    tags: ["combinatorics", "modular arithmetic", "factorials"],
    examples: [
      { input: '{"queries":[[5,3],[8,1],[9,5]]}', output: "10\n8\n126" },
    ],
    complexity: { time: "O(max a + q log p)", space: "O(max a)" },
    learning: {
      intuition:
        "Order all a items, then divide away the order within chosen and unchosen groups.",
      approach: [
        "Compute factorials modulo the prime.",
        "Use Fermat's inverse for the denominator.",
        "Answer each pair with a!/(b!(a−b)!).",
      ],
      explanation:
        "The denominator is invertible because all official a values are below the prime modulus.",
    },
  },
  defaultInput: {
    queries: [
      [5, 3],
      [8, 1],
      [9, 5],
    ],
  },
  source: `const P=1000000007n,maxA=Math.max(...queries.map(([a])=>a)),fact=[1n];function pow(a,b){let r=1n;for(;b>0n;b>>=1n,a=a*a%P)if(b&1n)r=r*a%P;return r;}for(let i=1;i<=maxA;i++)fact[i]=fact[i-1]*BigInt(i)%P;return queries.map(([a,b])=>String(fact[a]*pow(fact[b]*fact[a-b]%P,P-2n)%P)).join(String.fromCharCode(10));`,
  parse(raw) {
    const queries = tuples(raw, "queries", 2, 40);
    for (const [a, b] of queries)
      if (b > a) throw new InputError("Selection size cannot exceed set size");
    return { queries };
  },
  solve({ queries }, explain) {
    return queries
      .map(([a, b], i) => {
        const result = choose(a, b);
        explain(
          `Selection ${i + 1}`,
          Number(result),
          `Choose ${b} of ${a} items via factorials and an inverse.`,
          `C(${a},${b}) = ${result}`,
        );
        return String(result);
      })
      .join("\n");
  },
});

const creatingStringsII = lesson({
  meta: {
    id: "creating-strings-ii",
    title: "Creating Strings II",
    task: "1715",
    category: "Mathematics",
    renderer: "variables",
    summary: "Count distinct permutations of a string with repeated letters.",
    limits: "1–20 lowercase English letters",
    tags: ["combinatorics", "multinomial", "modular arithmetic"],
    examples: [{ input: '{"text":"aabac"}', output: "20" }],
    complexity: { time: "O(n+log p)", space: "O(n+alphabet)" },
    learning: {
      intuition:
        "Equal letters make several ordinary permutations indistinguishable.",
      approach: [
        "Count occurrences of each letter.",
        "Compute n! and divide by every frequency factorial.",
        "Use a modular inverse for the combined denominator.",
      ],
      explanation:
        "Each distinct arrangement appears exactly ∏ frequency! times among labeled permutations.",
    },
  },
  defaultInput: { text: "aabac" },
  source: `const P=1000000007n;function pow(a,b){let r=1n;for(;b>0n;b>>=1n,a=a*a%P)if(b&1n)r=r*a%P;return r;}let top=1n,den=1n;const freq=new Map();for(const c of text)freq.set(c,(freq.get(c)||0)+1);for(let i=1;i<=text.length;i++)top=top*BigInt(i)%P;for(const count of freq.values())for(let i=1;i<=count;i++)den=den*BigInt(i)%P;return String(top*pow(den,P-2n)%P);`,
  parse(raw) {
    const text = readObject(raw).text;
    if (
      typeof text !== "string" ||
      !text.length ||
      text.length > 20 ||
      !/^[a-z]+$/.test(text)
    )
      throw new InputError("text must contain 1–20 lowercase letters");
    return { text };
  },
  solve({ text }, explain) {
    const freq = new Map<string, number>();
    for (const c of text) freq.set(c, (freq.get(c) || 0) + 1);
    let top = 1n,
      den = 1n;
    for (let i = 2; i <= text.length; i++) top = (top * BigInt(i)) % MOD;
    for (const [letter, count] of freq) {
      for (let i = 2; i <= count; i++) den = (den * BigInt(i)) % MOD;
      explain(
        `Letter ${letter}`,
        count,
        `${letter} occurs ${count} times, creating ${count}! interchangeable orders.`,
        `frequency(${letter})=${count}`,
      );
    }
    const result = (top * power(den, MOD - 2n)) % MOD;
    explain(
      "Distinct strings",
      Number(result),
      "Divide all labeled permutations by equal-letter rearrangements.",
      `${text.length}! / ∏ frequency! = ${result}`,
    );
    return String(result);
  },
});

const distributingApples = lesson({
  meta: {
    id: "distributing-apples",
    title: "Distributing Apples",
    task: "1716",
    category: "Mathematics",
    renderer: "variables",
    summary:
      "Count nonnegative distributions of identical apples among children.",
    limits: "1–20 children, 1–20 apples",
    tags: ["combinatorics", "stars and bars", "modular arithmetic"],
    examples: [{ input: '{"children":3,"apples":2}', output: "6" }],
    complexity: { time: "O(n+m+log p)", space: "O(n+m)" },
    learning: {
      intuition:
        "Place n−1 separators among m apples to create one portion per child.",
      approach: [
        "Imagine m stars and n−1 bars.",
        "Choose where the bars go among n+m−1 slots.",
        "Compute the binomial coefficient modulo p.",
      ],
      explanation:
        "Every separator arrangement corresponds to exactly one nonnegative distribution.",
    },
  },
  defaultInput: { children: 3, apples: 2 },
  source: `const P=1000000007n;function pow(a,b){let r=1n;for(;b>0n;b>>=1n,a=a*a%P)if(b&1n)r=r*a%P;return r;}const total=children+apples-1,selected=children-1;let top=1n,den=1n;for(let i=1;i<=total;i++)top=top*BigInt(i)%P;for(let i=1;i<=selected;i++)den=den*BigInt(i)%P;for(let i=1;i<=total-selected;i++)den=den*BigInt(i)%P;return String(top*pow(den,P-2n)%P);`,
  parse(raw) {
    const o = readObject(raw);
    return {
      children: integer(o.children, "children", 1, 20),
      apples: integer(o.apples, "apples", 1, 20),
    };
  },
  solve({ children, apples }, explain) {
    const result = choose(children + apples - 1, children - 1);
    explain(
      "Stars and bars",
      Number(result),
      `Arrange ${apples} stars and ${children - 1} separators.`,
      `C(${children + apples - 1},${children - 1}) = ${result}`,
    );
    return String(result);
  },
});

export const advancedMathematicsProblems = [
  exponentiationII,
  fibonacciNumbers,
  countingDivisors,
  commonDivisors,
  binomialCoefficients,
  creatingStringsII,
  distributingApples,
];
