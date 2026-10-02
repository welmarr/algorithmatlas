import {
  EVENT_TYPES,
  type AlgorithmEvent,
  type EventType,
} from "@sim/semantic-events";

export const AI_RESPONSE_KINDS = [
  "explanation",
  "hint",
  "alternative-algorithm",
  "concept-explanation",
  "code-review",
  "debug-explanation",
  "semantic-classification",
] as const;
export type AIResponseKind = (typeof AI_RESPONSE_KINDS)[number];

export interface AICapabilities {
  schemaVersion: "0.1";
  supportedConcepts: string[];
  supportedVisuals: string[];
  supportedSemanticEvents: EventType[];
  availableAlgorithms: string[];
  problemContext: { problemId: string; title: string; summary: string };
  currentTeachingStep?: { title: string; summary: string; eventIds: string[] };
}
export interface AIRequest {
  schemaVersion: "0.1";
  kind: AIResponseKind;
  capabilities: AICapabilities;
  context: {
    eventId?: string;
    eventType?: EventType;
    eventExplanation?: string;
    conceptId?: string;
    source?: string;
    question?: string;
  };
}
interface ResponseBase {
  schemaVersion: "0.1";
  provider: string;
}
export interface ExplanationResponse extends ResponseBase {
  kind: "explanation";
  eventId: string;
  text: string;
}
export interface HintResponse extends ResponseBase {
  kind: "hint";
  level: 1 | 2 | 3;
  text: string;
}
export interface AlternativeAlgorithmResponse extends ResponseBase {
  kind: "alternative-algorithm";
  algorithmId: string;
  name: string;
  summary: string;
  timeComplexity: string;
  spaceComplexity: string;
}
export interface ConceptExplanationResponse extends ResponseBase {
  kind: "concept-explanation";
  conceptId: string;
  text: string;
}
export interface CodeReviewResponse extends ResponseBase {
  kind: "code-review";
  summary: string;
  findings: {
    line: number;
    severity: "info" | "warning" | "error";
    message: string;
  }[];
}
export interface DebugExplanationResponse extends ResponseBase {
  kind: "debug-explanation";
  cause: string;
  evidence: string;
  nextStep: string;
}
export interface SemanticClassificationResponse extends ResponseBase {
  kind: "semantic-classification";
  eventId: string;
  eventType: EventType;
  confidence: number;
  rationale: string;
}
export type CanonicalAIResponse =
  | ExplanationResponse
  | HintResponse
  | AlternativeAlgorithmResponse
  | ConceptExplanationResponse
  | CodeReviewResponse
  | DebugExplanationResponse
  | SemanticClassificationResponse;

export class AIProtocolError extends Error {
  constructor(
    public readonly code:
      | "INVALID_REQUEST"
      | "INVALID_RESPONSE"
      | "UNSUPPORTED_CAPABILITY"
      | "PROVIDER_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "AIProtocolError";
  }
}

function fail(code: AIProtocolError["code"], message: string): never {
  throw new AIProtocolError(code, message);
}
function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail("INVALID_RESPONSE", "Expected a response object");
  return raw as Record<string, unknown>;
}
function text(raw: unknown, label: string, max = 4000): string {
  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    raw.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw)
  )
    fail(
      "INVALID_RESPONSE",
      `${label} must be nonempty text within ${max} characters`,
    );
  return raw.trim();
}
function boundedStrings(values: unknown, label: string, max = 100): string[] {
  if (
    !Array.isArray(values) ||
    values.length > max ||
    !values.every(
      (value) =>
        typeof value === "string" && value.length > 0 && value.length <= 120,
    )
  )
    fail("INVALID_REQUEST", `${label} must be a bounded string list`);
  return [...new Set(values as string[])];
}

export function createCapabilities(input: {
  supportedConcepts: string[];
  supportedVisuals: string[];
  supportedSemanticEvents?: EventType[];
  availableAlgorithms: string[];
  problemContext: AICapabilities["problemContext"];
  currentTeachingStep?: AICapabilities["currentTeachingStep"];
}): AICapabilities {
  const supportedConcepts = boundedStrings(input.supportedConcepts, "Concepts");
  const supportedVisuals = boundedStrings(input.supportedVisuals, "Visuals");
  const availableAlgorithms = boundedStrings(
    input.availableAlgorithms,
    "Algorithms",
  );
  const supportedSemanticEvents = input.supportedSemanticEvents ?? [
    ...EVENT_TYPES,
  ];
  if (
    !Array.isArray(supportedSemanticEvents) ||
    supportedSemanticEvents.some((event) => !EVENT_TYPES.includes(event))
  )
    fail("INVALID_REQUEST", "Unsupported semantic event capability");
  if (
    !input.problemContext?.problemId ||
    !input.problemContext.title ||
    !input.problemContext.summary
  )
    fail("INVALID_REQUEST", "Problem context is incomplete");
  const step = input.currentTeachingStep;
  if (step && (!step.title || !step.summary || !Array.isArray(step.eventIds)))
    fail("INVALID_REQUEST", "Teaching step context is incomplete");
  return {
    schemaVersion: "0.1",
    supportedConcepts,
    supportedVisuals,
    supportedSemanticEvents: [...new Set(supportedSemanticEvents)],
    availableAlgorithms,
    problemContext: { ...input.problemContext },
    currentTeachingStep: step
      ? { ...step, eventIds: [...step.eventIds] }
      : undefined,
  };
}

export function createAIRequest(
  kind: AIResponseKind,
  capabilities: AICapabilities,
  context: AIRequest["context"],
): AIRequest {
  if (!AI_RESPONSE_KINDS.includes(kind) || capabilities.schemaVersion !== "0.1")
    fail("INVALID_REQUEST", "Unsupported request kind or capability version");
  if (context.source && context.source.length > 12000)
    fail("INVALID_REQUEST", "Code context is too long");
  if (context.question && context.question.length > 2000)
    fail("INVALID_REQUEST", "Question is too long");
  if (
    context.eventType &&
    !capabilities.supportedSemanticEvents.includes(context.eventType)
  )
    fail(
      "UNSUPPORTED_CAPABILITY",
      "Event type is outside negotiated capabilities",
    );
  if (
    context.conceptId &&
    !capabilities.supportedConcepts.includes(context.conceptId)
  )
    fail(
      "UNSUPPORTED_CAPABILITY",
      "Concept is outside negotiated capabilities",
    );
  if (
    ["explanation", "semantic-classification"].includes(kind) &&
    !context.eventId
  )
    fail("INVALID_REQUEST", `${kind} needs an eventId`);
  if (kind === "code-review" && !context.source)
    fail("INVALID_REQUEST", "Code review needs source text");
  return { schemaVersion: "0.1", kind, capabilities, context: { ...context } };
}

const eventAliases: Record<string, EventType> = {
  VISIT_VERTEX: "VISIT_NODE",
  READ_ARRAY: "READ_INDEX",
  WRITE_ARRAY: "WRITE_INDEX",
  DISCOVER_VERTEX: "DISCOVER_NODE",
};
function normalizeEventType(raw: unknown): EventType {
  if (typeof raw !== "string")
    fail("INVALID_RESPONSE", "Semantic event type must be text");
  const normalized = raw
    .trim()
    .toUpperCase()
    .replaceAll(/[\s-]+/g, "_");
  const resolved = eventAliases[normalized] ?? normalized;
  if (!EVENT_TYPES.includes(resolved as EventType))
    fail("UNSUPPORTED_CAPABILITY", `Unsupported semantic event ${raw}`);
  return resolved as EventType;
}

/** Raw provider JSON → schema parse → vocabulary normalization → capability validation. */
export function normalizeAIResponse(
  raw: unknown,
  request: AIRequest,
  provider: string,
): CanonicalAIResponse {
  const data = record(raw);
  if (data.schemaVersion !== "0.1" || data.kind !== request.kind)
    fail("INVALID_RESPONSE", "Response version or kind does not match request");
  const base = {
    schemaVersion: "0.1" as const,
    provider: text(provider, "Provider", 100),
  };
  switch (request.kind) {
    case "explanation": {
      const eventId = text(data.eventId, "Event ID", 160);
      if (eventId !== request.context.eventId)
        fail("INVALID_RESPONSE", "Explanation event ID does not match request");
      return {
        ...base,
        kind: "explanation",
        eventId,
        text: text(data.text, "Explanation"),
      };
    }
    case "hint": {
      if (![1, 2, 3].includes(data.level as number))
        fail("INVALID_RESPONSE", "Hint level must be 1, 2, or 3");
      return {
        ...base,
        kind: "hint",
        level: data.level as 1 | 2 | 3,
        text: text(data.text, "Hint", 2000),
      };
    }
    case "alternative-algorithm": {
      const algorithmId = text(data.algorithmId, "Algorithm ID", 120);
      if (!request.capabilities.availableAlgorithms.includes(algorithmId))
        fail(
          "UNSUPPORTED_CAPABILITY",
          "Algorithm is outside negotiated capabilities",
        );
      return {
        ...base,
        kind: "alternative-algorithm",
        algorithmId,
        name: text(data.name, "Algorithm name", 120),
        summary: text(data.summary, "Algorithm summary", 2000),
        timeComplexity: text(data.timeComplexity, "Time complexity", 120),
        spaceComplexity: text(data.spaceComplexity, "Space complexity", 120),
      };
    }
    case "concept-explanation": {
      const conceptId = text(data.conceptId, "Concept ID", 120);
      if (!request.capabilities.supportedConcepts.includes(conceptId))
        fail(
          "UNSUPPORTED_CAPABILITY",
          "Concept is outside negotiated capabilities",
        );
      return {
        ...base,
        kind: "concept-explanation",
        conceptId,
        text: text(data.text, "Concept explanation"),
      };
    }
    case "code-review": {
      if (!Array.isArray(data.findings) || data.findings.length > 12)
        fail("INVALID_RESPONSE", "Code review findings must be a bounded list");
      const findings = data.findings.map((rawFinding) => {
        const finding = record(rawFinding);
        const sourceLines = request.context.source?.split("\n").length ?? 0;
        if (
          !Number.isSafeInteger(finding.line) ||
          (finding.line as number) < 1 ||
          (finding.line as number) > sourceLines ||
          !["info", "warning", "error"].includes(finding.severity as string)
        )
          fail("INVALID_RESPONSE", "Code review finding is invalid");
        return {
          line: finding.line as number,
          severity: finding.severity as "info" | "warning" | "error",
          message: text(finding.message, "Finding", 1000),
        };
      });
      return {
        ...base,
        kind: "code-review",
        summary: text(data.summary, "Review summary", 2000),
        findings,
      };
    }
    case "debug-explanation":
      return {
        ...base,
        kind: "debug-explanation",
        cause: text(data.cause, "Debug cause", 2000),
        evidence: text(data.evidence, "Debug evidence", 2000),
        nextStep: text(data.nextStep, "Debug next step", 2000),
      };
    case "semantic-classification": {
      const eventId = text(data.eventId, "Event ID", 160);
      if (eventId !== request.context.eventId)
        fail(
          "INVALID_RESPONSE",
          "Classification event ID does not match request",
        );
      const eventType = normalizeEventType(data.eventType);
      if (!request.capabilities.supportedSemanticEvents.includes(eventType))
        fail(
          "UNSUPPORTED_CAPABILITY",
          "Event type is outside negotiated capabilities",
        );
      if (
        typeof data.confidence !== "number" ||
        !Number.isFinite(data.confidence) ||
        data.confidence < 0 ||
        data.confidence > 1
      )
        fail(
          "INVALID_RESPONSE",
          "Classification confidence must be between 0 and 1",
        );
      return {
        ...base,
        kind: "semantic-classification",
        eventId,
        eventType,
        confidence: data.confidence,
        rationale: text(data.rationale, "Classification rationale", 2000),
      };
    }
  }
}

export interface AIProviderAdapter {
  id: string;
  supportedKinds: readonly AIResponseKind[];
  complete(request: AIRequest): Promise<unknown>;
}

export async function requestCanonicalAI(
  provider: AIProviderAdapter,
  request: AIRequest,
): Promise<CanonicalAIResponse> {
  if (!provider.supportedKinds.includes(request.kind))
    fail(
      "UNSUPPORTED_CAPABILITY",
      `${provider.id} does not support ${request.kind}`,
    );
  let raw: unknown;
  try {
    raw = await provider.complete(request);
  } catch (cause) {
    if (cause instanceof AIProtocolError) throw cause;
    fail("PROVIDER_UNAVAILABLE", "Provider request failed");
  }
  return normalizeAIResponse(raw, request, provider.id);
}

export function builtInAIProvider(): AIProviderAdapter {
  return {
    id: "built-in",
    supportedKinds: ["explanation", "hint", "concept-explanation"],
    async complete(request) {
      switch (request.kind) {
        case "explanation":
          return {
            schemaVersion: "0.1",
            kind: "explanation",
            eventId: request.context.eventId,
            text:
              request.context.eventExplanation ??
              "Follow the highlighted state change.",
          };
        case "hint":
          return {
            schemaVersion: "0.1",
            kind: "hint",
            level: 1,
            text: "Inspect the highlighted entity and current variables. Which rule decides the next operation?",
          };
        case "concept-explanation":
          return {
            schemaVersion: "0.1",
            kind: "concept-explanation",
            conceptId: request.context.conceptId,
            text: `Relate ${request.context.conceptId} to the current step and trace.`,
          };
        default:
          fail(
            "UNSUPPORTED_CAPABILITY",
            "Built-in teacher does not provide that response",
          );
      }
    },
  };
}

export function eventContext(event: AlgorithmEvent): AIRequest["context"] {
  return {
    eventId: event.eventId,
    eventType: event.type,
    eventExplanation: event.explanation,
  };
}
