import { parse } from "acorn";
import { emptyState, type Primitive, type RawTraceEvent } from "@sim/domain";
import type { EventDraft } from "@sim/semantic-events";

type Value = number | boolean;
type Node = {
  type: string;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
};
type Binding = { value: Value; mutable: boolean };

export class CodeRuntimeError extends Error {
  constructor(
    public readonly code: "SYNTAX" | "UNSUPPORTED" | "RUNTIME" | "LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "CodeRuntimeError";
  }
}

function node(value: unknown): Node {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as Node).type !== "string"
  )
    throw new CodeRuntimeError("UNSUPPORTED", "Unsupported code structure");
  return value as Node;
}
function children(value: unknown): Node[] {
  if (!Array.isArray(value))
    throw new CodeRuntimeError("UNSUPPORTED", "Unsupported code structure");
  return value.map(node);
}
function name(value: unknown): string {
  const identifier = node(value);
  if (identifier.type !== "Identifier" || typeof identifier.name !== "string")
    throw new CodeRuntimeError("UNSUPPORTED", "Use a simple variable name");
  if (
    ["values", "__proto__", "constructor", "prototype"].includes(
      identifier.name,
    )
  )
    throw new CodeRuntimeError(
      "UNSUPPORTED",
      `Reserved name: ${identifier.name}`,
    );
  return identifier.name;
}
function number(value: Value): number {
  if (typeof value !== "number")
    throw new CodeRuntimeError("RUNTIME", "Expected a number");
  return value;
}
function finite(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12)
    throw new CodeRuntimeError(
      "RUNTIME",
      "Number must be finite and within ±1e12",
    );
  return value;
}

export interface ArrayScriptResult {
  initialState: ReturnType<typeof emptyState>;
  rawTrace: RawTraceEvent[];
  events: EventDraft[];
  finalValues: number[];
  output: string;
}

/** Interpret a deliberately small JavaScript subset. No host code is evaluated. */
export function runArrayScript(
  inputValues: number[],
  source: string,
): ArrayScriptResult {
  if (source.length > 4096)
    throw new CodeRuntimeError("LIMIT", "Code is limited to 4,096 characters");
  if (
    inputValues.length < 1 ||
    inputValues.length > 64 ||
    !inputValues.every(
      (value) => Number.isSafeInteger(value) && Math.abs(value) <= 100000,
    )
  )
    throw new CodeRuntimeError(
      "RUNTIME",
      "values must contain 1–64 integers within ±100,000",
    );
  let program: Node;
  try {
    program = parse(source, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
      allowReturnOutsideFunction: true,
    }) as unknown as Node;
  } catch (cause) {
    throw new CodeRuntimeError(
      "SYNTAX",
      cause instanceof Error ? cause.message : "Invalid code",
    );
  }

  const values = [...inputValues];
  const bindings = new Map<string, Binding>();
  const rawTrace: RawTraceEvent[] = [];
  let operations = 0;
  let returned: Value | undefined;
  const tick = () => {
    operations++;
    if (operations > 20000)
      throw new CodeRuntimeError(
        "LIMIT",
        "Execution exceeded 20,000 operations",
      );
  };
  const record = (
    operation: string,
    data: Record<string, Primitive>,
    at: Node,
  ) => {
    if (rawTrace.length >= 5000)
      throw new CodeRuntimeError("LIMIT", "Trace exceeded 5,000 events");
    rawTrace.push({
      operation,
      data,
      sourceRef: {
        file: "solution.js",
        line: at.loc?.start.line ?? 1,
        column: (at.loc?.start.column ?? 0) + 1,
      },
    });
  };
  const indexOf = (member: Node): number => {
    if (
      member.type !== "MemberExpression" ||
      member.optional ||
      node(member.object).type !== "Identifier" ||
      node(member.object).name !== "values" ||
      member.computed !== true
    )
      throw new CodeRuntimeError(
        "UNSUPPORTED",
        "Only values[i] and values.length are supported",
      );
    const index = number(evaluate(node(member.property)));
    if (!Number.isSafeInteger(index) || index < 0 || index >= values.length)
      throw new CodeRuntimeError(
        "RUNTIME",
        `Array index ${index} is outside values`,
      );
    return index;
  };
  const evaluate = (expression: Node): Value => {
    tick();
    switch (expression.type) {
      case "Literal":
        if (typeof expression.value === "number")
          return finite(expression.value);
        if (typeof expression.value === "boolean") return expression.value;
        break;
      case "Identifier": {
        const binding = bindings.get(name(expression));
        if (!binding)
          throw new CodeRuntimeError(
            "RUNTIME",
            `Unknown variable: ${expression.name}`,
          );
        return binding.value;
      }
      case "MemberExpression": {
        if (
          node(expression.object).type === "Identifier" &&
          node(expression.object).name === "values" &&
          expression.computed === false &&
          node(expression.property).name === "length"
        )
          return values.length;
        const index = indexOf(expression);
        const value = values[index];
        record("read", { index, value }, expression);
        return value;
      }
      case "BinaryExpression": {
        const left = evaluate(node(expression.left));
        const right = evaluate(node(expression.right));
        switch (expression.operator) {
          case "+":
            return finite(number(left) + number(right));
          case "-":
            return finite(number(left) - number(right));
          case "*":
            return finite(number(left) * number(right));
          case "/":
            return finite(number(left) / number(right));
          case "%":
            return finite(number(left) % number(right));
          case "<":
            return number(left) < number(right);
          case "<=":
            return number(left) <= number(right);
          case ">":
            return number(left) > number(right);
          case ">=":
            return number(left) >= number(right);
          case "===":
            return left === right;
          case "!==":
            return left !== right;
        }
        break;
      }
      case "LogicalExpression": {
        const left = evaluate(node(expression.left));
        if (expression.operator === "&&")
          return Boolean(left) ? evaluate(node(expression.right)) : left;
        if (expression.operator === "||")
          return Boolean(left) ? left : evaluate(node(expression.right));
        break;
      }
      case "UnaryExpression": {
        const value = evaluate(node(expression.argument));
        if (expression.operator === "!") return !Boolean(value);
        if (expression.operator === "-") return finite(-number(value));
        if (expression.operator === "+") return number(value);
        break;
      }
      case "AssignmentExpression": {
        if (expression.operator !== "=") break;
        const value = evaluate(node(expression.right));
        const left = node(expression.left);
        if (left.type === "MemberExpression") {
          const index = indexOf(left);
          const next = number(value);
          if (!Number.isSafeInteger(next) || Math.abs(next) > 1e9)
            throw new CodeRuntimeError(
              "RUNTIME",
              "Array writes must be integers within ±1e9",
            );
          const previous = values[index];
          values[index] = next;
          record("write", { index, before: previous, value: next }, expression);
        } else {
          const variable = name(left);
          const binding = bindings.get(variable);
          if (!binding)
            throw new CodeRuntimeError(
              "RUNTIME",
              `Unknown variable: ${variable}`,
            );
          if (!binding.mutable)
            throw new CodeRuntimeError(
              "RUNTIME",
              `Cannot assign to const ${variable}`,
            );
          binding.value = value;
          record("variable", { variable, value }, expression);
        }
        return value;
      }
      case "UpdateExpression": {
        const variable = name(expression.argument);
        const binding = bindings.get(variable);
        if (!binding || !binding.mutable)
          throw new CodeRuntimeError("RUNTIME", `Cannot update ${variable}`);
        const old = number(binding.value);
        const value = finite(
          old +
            (expression.operator === "++"
              ? 1
              : expression.operator === "--"
                ? -1
                : NaN),
        );
        binding.value = value;
        record("variable", { variable, value }, expression);
        return expression.prefix ? value : old;
      }
    }
    throw new CodeRuntimeError(
      "UNSUPPORTED",
      `Unsupported expression: ${expression.type}`,
    );
  };
  const execute = (statement: Node): void => {
    tick();
    if (returned !== undefined) return;
    switch (statement.type) {
      case "Program":
      case "BlockStatement":
        for (const child of children(statement.body)) {
          execute(child);
          if (returned !== undefined) break;
        }
        return;
      case "VariableDeclaration":
        if (statement.kind !== "let" && statement.kind !== "const") break;
        for (const declaration of children(statement.declarations)) {
          const variable = name(declaration.id);
          if (!declaration.init)
            throw new CodeRuntimeError(
              "UNSUPPORTED",
              "Initialize variables when declaring them",
            );
          const value = evaluate(node(declaration.init));
          bindings.set(variable, { value, mutable: statement.kind === "let" });
          record("variable", { variable, value }, declaration);
        }
        return;
      case "ExpressionStatement":
        evaluate(node(statement.expression));
        return;
      case "IfStatement": {
        const condition = Boolean(evaluate(node(statement.test)));
        record("branch", { taken: condition }, statement);
        if (condition) execute(node(statement.consequent));
        else if (statement.alternate) execute(node(statement.alternate));
        return;
      }
      case "ForStatement":
        if (statement.init) {
          const init = node(statement.init);
          if (init.type === "VariableDeclaration") execute(init);
          else evaluate(init);
        }
        for (;;) {
          tick();
          if (statement.test && !Boolean(evaluate(node(statement.test)))) break;
          execute(node(statement.body));
          if (returned !== undefined) break;
          if (statement.update) evaluate(node(statement.update));
        }
        return;
      case "ReturnStatement":
        if (!statement.argument)
          throw new CodeRuntimeError("UNSUPPORTED", "Return a value");
        returned = evaluate(node(statement.argument));
        record("return", { value: returned }, statement);
        return;
      case "EmptyStatement":
        return;
    }
    throw new CodeRuntimeError(
      "UNSUPPORTED",
      `Unsupported statement: ${statement.type}`,
    );
  };
  execute(program);
  if (returned === undefined)
    throw new CodeRuntimeError("RUNTIME", "Code must return a value");

  const initialState = emptyState();
  inputValues.forEach((value, index) => {
    initialState.entities[`array:${index}`] = {
      id: `array:${index}`,
      kind: "array",
      label: String(index),
      value,
      status: "idle",
    };
  });
  const events: EventDraft[] = rawTrace.map((raw): EventDraft => {
    const index =
      typeof raw.data.index === "number" ? raw.data.index : undefined;
    const entities = index === undefined ? [] : [`array:${index}`];
    const variable = String(raw.data.variable ?? "");
    switch (raw.operation) {
      case "read":
        return {
          type: "READ_INDEX",
          entities,
          payload: { value: raw.data.value },
          explanation: `Read index ${index}: ${raw.data.value}.`,
          sourceRef: raw.sourceRef,
        };
      case "write":
        return {
          type: "WRITE_INDEX",
          entities,
          payload: { value: raw.data.value },
          explanation: `Set index ${index}: ${raw.data.before} → ${raw.data.value}.`,
          sourceRef: raw.sourceRef,
        };
      case "variable":
        if (variable === "i") {
          const pointer = Number(raw.data.value);
          return {
            type: "MOVE_POINTER",
            entities:
              pointer >= 0 && pointer < values.length
                ? [`array:${pointer}`]
                : [],
            payload: { variable, value: raw.data.value },
            explanation: `Move index to ${pointer}.`,
            sourceRef: raw.sourceRef,
          };
        }
        return {
          type: "UPDATE_VALUE",
          entities: [],
          payload: { variable, value: raw.data.value },
          explanation: `Set ${variable} = ${raw.data.value}.`,
          sourceRef: raw.sourceRef,
        };
      case "branch":
        return {
          type: "COMPARE",
          entities: [],
          payload: { taken: raw.data.taken },
          explanation: `Condition is ${raw.data.taken ? "true" : "false"}; follow that branch.`,
          sourceRef: raw.sourceRef,
        };
      default:
        return {
          type: "FUNCTION_RETURN",
          entities: [],
          payload: { value: raw.data.value },
          explanation: `Return ${raw.data.value}.`,
          sourceRef: raw.sourceRef,
        };
    }
  });
  return {
    initialState,
    rawTrace,
    events,
    finalValues: values,
    output: String(returned),
  };
}
