import {
  defineProblem,
  integer,
  readObject,
  InputError,
} from "@sim/problem-sdk";
import type { EventDraft } from "@sim/semantic-events";
import { entry, event, metadata } from "./extended-shared";
import { graphState } from "./graph-foundations";

export type Edge = [number, number];
export type Weighted = [number, number, number];
export type Step = (node: number, value: number, reason: string) => void;
export function graphLesson<
  I extends { nodes: number; edges: Edge[] | Weighted[] },
>(spec: {
  meta: Parameters<typeof metadata>[0];
  defaultInput: I;
  parse: (raw: unknown) => I;
  solve: (input: I, step?: Step) => string;
  sourceArgs: string;
  directed?: boolean;
  helpers?: string;
}) {
  return entry(
    defineProblem({
      metadata: metadata(spec.meta),
      defaultInput: spec.defaultInput,
      parseInput: spec.parse,
      source: `${spec.helpers ?? ""}\nreturn (${spec.solve.toString()})(${spec.sourceArgs});`,
      trace(input) {
        const state = graphState(
            input.nodes,
            input.edges,
            spec.directed ?? true,
          ),
          events: EventDraft[] = [];
        state.variables = { answer: 0 };
        const step: Step = (node, value, reason) => {
          events.push(
            event("VISIT_NODE", [`graph:node:${node}`], reason, {}, 1),
          );
          events.push(
            event("ANNOTATE", [], reason, { variable: "answer", value }, 1, {
              schemaVersion: "0.1",
              reason,
            }),
          );
        };
        return { initialState: state, events, output: spec.solve(input, step) };
      },
    }),
  );
}
export function directedWeighted(raw: unknown, negative = false) {
  const o = readObject(raw),
    nodes = integer(o.nodes, "nodes", 1, 10),
    value = o.edges;
  if (!Array.isArray(value) || value.length < 1 || value.length > 24)
    throw new InputError("edges must contain 1–24 directed weighted edges");
  const edges: Weighted[] = value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 3)
      throw new InputError(`edges[${i}] must be [from,to,weight]`);
    return [
      integer(item[0], "from", 1, nodes),
      integer(item[1], "to", 1, nodes),
      integer(item[2], "weight", negative ? -100 : 1, 100),
    ];
  });
  return { nodes, edges };
}
export function requireRoute(nodes: number, edges: Edge[] | Weighted[]) {
  const adj = Array.from({ length: nodes + 1 }, () => [] as number[]);
  for (const [a, b] of edges) adj[a].push(b);
  const seen = new Set([1]),
    queue = [1];
  for (let i = 0; i < queue.length; i++)
    for (const next of adj[queue[i]])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  if (!seen.has(nodes))
    throw new InputError("A route from node 1 to node n is required");
}
export function pairQueries(
  raw: unknown,
  key: string,
  nodes: number,
  maxStep = 100,
) {
  const value = readObject(raw)[key];
  if (!Array.isArray(value) || value.length < 1 || value.length > 16)
    throw new InputError(`${key} must contain 1–16 pairs`);
  return value.map((item, i) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new InputError(`${key}[${i}] must be a pair`);
    return [
      integer(item[0], "start", 1, nodes),
      integer(item[1], "steps", 0, maxStep),
    ];
  });
}
