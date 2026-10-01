import { describe, expect, it } from "vitest";
import { runArrayScript } from "@sim/code-runtime";
import { getProblem } from "@sim/problems";

describe("executed code trace", () => {
  const problem = getProblem("increasing-array")!;

  it("replays the exact edited source and input", () => {
    const input = { values: [8, 2, 5, 1, 7] };
    const run = problem.runCode!(input, problem.source);
    expect(run.output).toBe("17");
    expect(
      run.events.some(
        (event) => event.type === "WRITE_INDEX" && event.sourceRef?.line === 7,
      ),
    ).toBe(true);
    run.timeline.seek(run.timeline.length);
    expect(input.values).toEqual([8, 2, 5, 1, 7]);
    expect(
      Array.from(
        { length: 5 },
        (_, i) => run.timeline.state.entities[`array:${i}`].value,
      ),
    ).toEqual([8, 8, 8, 8, 8]);
    expect(run.timeline.state.variables.moves).toBe(17);
  });

  it("edits produce a different trace, final array, and result", () => {
    const code = `let total = 0;
for (let i = 0; i < values.length; i++) {
  values[i] = values[i] + 1;
  total = total + values[i];
}
return total;`;
    const result = runArrayScript([8, 2, 5, 1, 7], code);
    expect(result.output).toBe("28");
    expect(result.finalValues).toEqual([9, 3, 6, 2, 8]);
    expect(
      result.events.filter((event) => event.type === "WRITE_INDEX"),
    ).toHaveLength(5);
    expect(
      result.rawTrace.some(
        (item) => item.operation === "write" && item.sourceRef?.line === 3,
      ),
    ).toBe(true);
    const secondInput = problem.runCode!({ values: [1, 1] }, code);
    expect(secondInput.output).toBe("4");
  });

  it("rejects host calls, unsupported syntax, and unbounded loops", () => {
    for (const source of [
      "fetch('https://example.com'); return 0;",
      "globalThis.alert(1); return 0;",
      "import('x'); return 0;",
      "values.constructor; return 0;",
    ])
      expect(() => runArrayScript([1], source)).toThrow();
    expect(() => runArrayScript([1], "for (;;) {} return 1;")).toThrow(
      "20,000 operations",
    );
  });

  it("honors lexical block and loop scope", () => {
    const block = runArrayScript([4], "let x = 1; { let x = 2; } return x;");
    expect(block.output).toBe("1");
    expect(
      block.rawTrace
        .filter((item) => item.data.variable === "x")
        .map((item) => item.data.value),
    ).toEqual([1, 2, 1]);
    expect(() =>
      runArrayScript(
        [4],
        "for (let cursor = 0; cursor < 1; cursor++) {} return cursor;",
      ),
    ).toThrow("Unknown or uninitialized variable");
    expect(() =>
      runArrayScript([4], "let x = 1; { let x = x + 1; } return x;"),
    ).toThrow("Unknown or uninitialized variable");
  });

  it("marks a variable as a pointer only when used to index values", () => {
    const plain = runArrayScript([4], "let i = 2; return i;");
    expect(plain.events.some((event) => event.type === "MOVE_POINTER")).toBe(
      false,
    );
    const indexed = runArrayScript(
      [4],
      "let sum = 0; for (let cursor = 0; cursor < values.length; cursor++) { sum = sum + values[cursor]; } return sum;",
    );
    expect(
      indexed.events.some(
        (event) =>
          event.type === "MOVE_POINTER" && event.payload.variable === "cursor",
      ),
    ).toBe(true);
    const shadowed = runArrayScript(
      [4],
      "let i = 7; for (let i = 0; i < values.length; i++) { values[i] = values[i] + 1; } return i;",
    );
    expect(shadowed.output).toBe("7");
    expect(
      shadowed.events.some(
        (event) =>
          event.type === "UPDATE_VALUE" &&
          event.payload.variable === "i" &&
          event.payload.value === 7,
      ),
    ).toBe(true);
  });
});
