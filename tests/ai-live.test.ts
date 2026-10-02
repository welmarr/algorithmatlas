import { describe, expect, it } from "vitest";
import {
  createAIRequest,
  createCapabilities,
  localCompatibleProvider,
  requestCanonicalAI,
} from "@sim/ai-sdk";

const configured = Boolean(
  process.env.AI_LIVE_ENDPOINT && process.env.AI_LIVE_MODEL,
);
describe.skipIf(!configured)("configured live compatible provider", () => {
  it("returns one validated canonical explanation", async () => {
    const provider = localCompatibleProvider({
      id: "configured-live",
      endpoint: process.env.AI_LIVE_ENDPOINT!,
      model: process.env.AI_LIVE_MODEL!,
      apiKey: process.env.AI_LIVE_API_KEY,
    });
    const capabilities = createCapabilities({
      supportedConcepts: ["array-scan"],
      supportedVisuals: ["array"],
      supportedSemanticEvents: ["READ_INDEX"],
      availableAlgorithms: ["linear-search"],
      problemContext: {
        problemId: "local-integration",
        title: "Linear Search",
        summary: "Inspect values until one matches.",
      },
    });
    const response = await requestCanonicalAI(
      provider,
      createAIRequest("explanation", capabilities, {
        eventId: "live:1",
        eventType: "READ_INDEX",
        eventExplanation: "Read index 0 with value 8.",
      }),
    );
    expect(response.kind).toBe("explanation");
    expect(response).toHaveProperty("eventId", "live:1");
  });
});
