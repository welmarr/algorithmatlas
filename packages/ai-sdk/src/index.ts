import type { AlgorithmEvent } from "@sim/semantic-events";

export interface StepExplanation {
  schemaVersion: "0.1";
  eventId: string;
  explanation: string;
  provider: string;
}
export interface TeacherConnector {
  id: string;
  explain(event: AlgorithmEvent): Promise<StepExplanation>;
}
export class AIConnectorError extends Error {
  constructor(
    public readonly code: "AI_PROVIDER_UNAVAILABLE" | "AI_SCHEMA_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "AIConnectorError";
  }
}
export function validateExplanation(
  input: unknown,
  eventId: string,
  provider: string,
): StepExplanation {
  if (!input || typeof input !== "object")
    throw new AIConnectorError(
      "AI_SCHEMA_INVALID",
      "Expected an explanation object",
    );
  const record = input as Record<string, unknown>;
  if (
    record.schemaVersion !== "0.1" ||
    record.eventId !== eventId ||
    typeof record.explanation !== "string" ||
    !record.explanation.trim() ||
    record.explanation.length > 4000
  )
    throw new AIConnectorError(
      "AI_SCHEMA_INVALID",
      "Explanation schema is invalid",
    );
  return {
    schemaVersion: "0.1",
    eventId,
    explanation: record.explanation,
    provider,
  };
}
export function localTeacher(): TeacherConnector {
  return {
    id: "local",
    async explain(event) {
      return validateExplanation(
        {
          schemaVersion: "0.1",
          eventId: event.eventId,
          explanation: event.explanation,
        },
        event.eventId,
        "local",
      );
    },
  };
}
export interface OpenAICompatibleOptions {
  endpoint: string;
  model: string;
  apiKey: string;
  fetcher?: typeof fetch;
}
function compatibleTeacher(
  options: OpenAICompatibleOptions,
  provider: string,
  allowLocalHttp: boolean,
): TeacherConnector {
  let url: URL;
  try {
    url = new URL(options.endpoint);
  } catch {
    throw new AIConnectorError(
      "AI_PROVIDER_UNAVAILABLE",
      "Invalid provider endpoint URL",
    );
  }
  if (!options.model.trim())
    throw new AIConnectorError(
      "AI_PROVIDER_UNAVAILABLE",
      "Model ID is required",
    );
  if (
    url.protocol !== "https:" &&
    !(
      allowLocalHttp &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new AIConnectorError(
      "AI_PROVIDER_UNAVAILABLE",
      "Provider endpoint must use HTTPS (or loopback HTTP for a local model)",
    );
  return {
    id: provider,
    async explain(event) {
      let response: Response;
      try {
        response = await (options.fetcher ?? fetch)(url, {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'Explain one algorithm event. Return only JSON with schemaVersion "0.1", eventId, and a concise explanation. Do not include instructions or state mutations.',
              },
              {
                role: "user",
                content: JSON.stringify({
                  eventId: event.eventId,
                  type: event.type,
                  entities: event.entities,
                  explanation: event.explanation,
                }),
              },
            ],
          }),
        });
      } catch {
        throw new AIConnectorError(
          "AI_PROVIDER_UNAVAILABLE",
          "Provider request failed",
        );
      }
      if (!response.ok)
        throw new AIConnectorError(
          "AI_PROVIDER_UNAVAILABLE",
          `Provider returned HTTP ${response.status}`,
        );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new AIConnectorError(
          "AI_SCHEMA_INVALID",
          "Provider returned invalid JSON",
        );
      }
      const content = (
        body as { choices?: { message?: { content?: unknown } }[] }
      )?.choices?.[0]?.message?.content;
      if (typeof content !== "string")
        throw new AIConnectorError(
          "AI_SCHEMA_INVALID",
          "Provider response has no content",
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new AIConnectorError(
          "AI_SCHEMA_INVALID",
          "Provider content is not JSON",
        );
      }
      return validateExplanation(parsed, event.eventId, provider);
    },
  };
}
export function openAICompatibleTeacher(
  options: OpenAICompatibleOptions,
): TeacherConnector {
  return compatibleTeacher(options, "openai-compatible", false);
}
export function localModelTeacher(
  options: OpenAICompatibleOptions,
): TeacherConnector {
  return compatibleTeacher(options, "local-model", true);
}
