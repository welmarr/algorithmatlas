import { describe, expect, it, vi } from "vitest";
import {
  AIProtocolError,
  AI_RESPONSE_KINDS,
  builtInAIProvider,
  createAIRequest,
  createCapabilities,
  externalCompatibleProvider,
  localCompatibleProvider,
  normalizeAIResponse,
  requestCanonicalAI,
  type AIResponseKind,
} from "@sim/ai-sdk";

const capabilities = createCapabilities({
  supportedConcepts: ["bfs", "shortest-path"],
  supportedVisuals: ["graph", "queue"],
  supportedSemanticEvents: ["VISIT_NODE", "DISCOVER_NODE"],
  availableAlgorithms: ["graph-bfs", "graph-dfs"],
  problemContext: {
    problemId: "message-route",
    title: "Message Route",
    summary: "Find a shortest unweighted route.",
  },
  currentTeachingStep: {
    title: "Visit node A",
    summary: "Explore A before moving to its neighbors.",
    eventIds: ["run:1"],
  },
});
function request(kind: AIResponseKind) {
  return createAIRequest(kind, capabilities, {
    eventId: "run:1",
    eventType: "VISIT_NODE",
    eventExplanation: "Visit A.",
    conceptId: "bfs",
    source: "function solve() { return 1; }",
  });
}

describe("AI-agnostic canonical protocol", () => {
  const fixtures = {
    explanation: { eventId: "run:1", text: "A is visited." },
    hint: { level: 1, text: "Look at the queue front." },
    "alternative-algorithm": {
      algorithmId: "graph-dfs",
      name: "Depth-first search",
      summary: "Explore one branch first.",
      timeComplexity: "O(V+E)",
      spaceComplexity: "O(V)",
    },
    "concept-explanation": { conceptId: "bfs", text: "BFS explores layers." },
    "code-review": {
      summary: "The loop is bounded.",
      findings: [{ line: 1, severity: "info", message: "Return is constant." }],
    },
    "debug-explanation": {
      cause: "Queue was emptied early.",
      evidence: "The visit event stopped before B.",
      nextStep: "Check the neighbor condition.",
    },
    "semantic-classification": {
      eventId: "run:1",
      eventType: "visit vertex",
      confidence: 0.91,
      rationale: "The node enters the visited set.",
    },
  } as const;

  it.each(AI_RESPONSE_KINDS)("validates and normalizes %s", (kind) => {
    const result = normalizeAIResponse(
      {
        schemaVersion: "0.1",
        kind,
        ...fixtures[kind],
        state: { mutate: true },
        visualCommand: "flash-red",
      },
      request(kind),
      "mock",
    );
    expect(result.schemaVersion).toBe("0.1");
    expect(result.provider).toBe("mock");
    expect(result.kind).toBe(kind);
    expect(result).not.toHaveProperty("state");
    expect(result).not.toHaveProperty("visualCommand");
    if (kind === "semantic-classification")
      expect(result).toHaveProperty("eventType", "VISIT_NODE");
  });

  it("rejects event, concept, algorithm, and visual vocabulary outside negotiation", () => {
    expect(() =>
      createAIRequest("hint", capabilities, { conceptId: "invented" }),
    ).toThrow(AIProtocolError);
    expect(() =>
      normalizeAIResponse(
        {
          schemaVersion: "0.1",
          kind: "semantic-classification",
          eventId: "run:1",
          eventType: "DELETE_STATE",
          confidence: 0.8,
          rationale: "bad",
        },
        request("semantic-classification"),
        "mock",
      ),
    ).toThrow(/Unsupported semantic event/);
    expect(() =>
      normalizeAIResponse(
        {
          schemaVersion: "0.1",
          kind: "alternative-algorithm",
          ...fixtures["alternative-algorithm"],
          algorithmId: "unlisted",
        },
        request("alternative-algorithm"),
        "mock",
      ),
    ).toThrow(/outside negotiated/);
    expect(() =>
      normalizeAIResponse(
        {
          schemaVersion: "0.1",
          kind: "explanation",
          eventId: "different",
          text: "wrong",
        },
        request("explanation"),
        "mock",
      ),
    ).toThrow(/does not match/);
    expect(() =>
      normalizeAIResponse(
        {
          schemaVersion: "0.1",
          kind: "code-review",
          summary: "Wrong line",
          findings: [
            { line: 99, severity: "error", message: "Imagined issue" },
          ],
        },
        request("code-review"),
        "mock",
      ),
    ).toThrow(/finding is invalid/);
  });

  it("keeps the built-in teacher keyless and limited to deterministic families", async () => {
    const provider = builtInAIProvider();
    expect((await requestCanonicalAI(provider, request("hint"))).kind).toBe(
      "hint",
    );
    await expect(
      requestCanonicalAI(provider, request("code-review")),
    ).rejects.toThrow(/does not support/);
  });

  it("adapts a compatible provider without exposing its transport shape", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    schemaVersion: "0.1",
                    kind: "explanation",
                    eventId: "run:1",
                    text: "Node A becomes visited.",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const provider = localCompatibleProvider({
      id: "local-test",
      endpoint: "http://localhost:11434/v1/chat/completions",
      model: "example",
      fetcher,
    });
    expect(await requestCanonicalAI(provider, request("explanation"))).toEqual({
      schemaVersion: "0.1",
      kind: "explanation",
      eventId: "run:1",
      text: "Node A becomes visited.",
      provider: "local-test",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.model).toBe("example");
    expect(body.messages[1].content).toContain("supportedSemanticEvents");
  });

  it("blocks external plain HTTP and oversized or malformed provider content", async () => {
    expect(() =>
      externalCompatibleProvider({
        id: "external",
        endpoint: "http://example.com/chat/completions",
        model: "model",
      }),
    ).toThrow(/HTTPS/);
    const provider = externalCompatibleProvider({
      id: "external",
      endpoint: "https://example.com/chat/completions",
      model: "model",
      fetcher: async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
          {
            status: 200,
          },
        ),
    });
    await expect(requestCanonicalAI(provider, request("hint"))).rejects.toThrow(
      /not JSON/,
    );
  });
});
