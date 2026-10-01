import { describe, expect, it, vi } from "vitest";
import { createEvents } from "@sim/semantic-events";
import {
  localModelTeacher,
  localTeacher,
  openAICompatibleTeacher,
  validateExplanation,
} from "@sim/ai-sdk";

const event = createEvents(
  [
    {
      type: "VISIT_NODE",
      entities: ["graph:node:A"],
      payload: {},
      explanation: "Visit A.",
    },
  ],
  "run",
)[0];
describe("optional teacher connectors", () => {
  it("normalizes local explanations", async () => {
    expect(await localTeacher().explain(event)).toEqual({
      schemaVersion: "0.1",
      eventId: "run:1",
      explanation: "Visit A.",
      provider: "local",
    });
  });
  it("normalizes compatible provider output without accepting state fields", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    schemaVersion: "0.1",
                    eventId: "run:1",
                    explanation: "A enters the traversal.",
                    state: { hacked: true },
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const connector = openAICompatibleTeacher({
      endpoint: "https://example.com/chat/completions",
      model: "test",
      apiKey: "secret",
      fetcher,
    });
    expect(await connector.explain(event)).toEqual({
      schemaVersion: "0.1",
      eventId: "run:1",
      explanation: "A enters the traversal.",
      provider: "openai-compatible",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("rejects mismatched or malformed model output", () => {
    expect(() =>
      validateExplanation(
        { schemaVersion: "0.1", eventId: "other", explanation: "wrong" },
        event.eventId,
        "test",
      ),
    ).toThrow("schema is invalid");
    expect(() =>
      openAICompatibleTeacher({
        endpoint: "http://localhost:9999",
        model: "test",
        apiKey: "",
      }),
    ).toThrow("HTTPS");
  });
  it("allows a local hosted model over loopback HTTP", () => {
    expect(
      localModelTeacher({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "local",
        apiKey: "",
      }).id,
    ).toBe("local-model");
    expect(() =>
      localModelTeacher({
        endpoint: "http://example.com/v1/chat/completions",
        model: "local",
        apiKey: "",
      }),
    ).toThrow("HTTPS");
  });
});
