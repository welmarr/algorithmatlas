# Optional teacher connectors

The AI SDK exposes `TeacherConnector.explain(event)` and the normalized `StepExplanation` schema (`schemaVersion`, matching `eventId`, bounded `explanation`, `provider`). A built-in teacher uses curated event text; a local hosted model and an external OpenAI-compatible model use the same narrow response validator. Extra response fields are discarded. The SDK does not import the reducer, and the UI displays explanations separately from simulation state.

The web UI accepts provider endpoint, model, and optional key for the current tab only. It sends requests directly from the browser, so the endpoint must support CORS. External endpoints require HTTPS; local models may use loopback HTTP. No fallback to an unvalidated model response is permitted. The built-in deterministic explanation remains available if models are absent.

## Canonical protocol v0.1

`packages/ai-sdk/src/protocol.ts` adds seven response families: `ExplanationResponse`, `HintResponse`, `AlternativeAlgorithmResponse`, `ConceptExplanationResponse`, `CodeReviewResponse`, `DebugExplanationResponse`, and `SemanticClassificationResponse`. Every response has `schemaVersion`, `kind`, and the platform-assigned provider ID. Text length, event IDs, hint levels, review line numbers, classification confidence, and family-specific fields are validated. Unknown provider fields, including proposed state changes or visual commands, are discarded. Semantic event aliases are normalized only to known protocol types and rejected outside the negotiated set.

The flow is: provider adapter → raw JSON → version/kind parser → vocabulary normalizer → capability validator → canonical response → UI. `createCapabilities` exposes supported concepts, visuals, semantic events, algorithms, problem context, and the current teaching step. `requestCanonicalAI` accepts only an adapter and a canonical request. The deterministic reducer and problem runners never see provider transport objects.

`openAICompatibleProvider` implements the Chat Completions transport behind that adapter interface; `localCompatibleProvider` allows loopback HTTP, while `externalCompatibleProvider` requires HTTPS. Other native transports can implement `AIProviderAdapter` without changing canonical response types. The built-in provider offers keyless explanation, first-level hint, and concept text. The problem page's **Hint for current step** button consumes the normalized hint response; existing step explanations remain available for compatibility. Other response families are SDK APIs, ready for future UI workflows.

Set `AI_LIVE_ENDPOINT` and `AI_LIVE_MODEL` (and optionally `AI_LIVE_API_KEY`) to opt into `tests/ai-live.test.ts` against a configured compatible endpoint. Core CI skips that test and needs no paid key. Live output must still pass the canonical schema validator. The frontend keeps credentials in memory for the current page only; no key is saved.

Local hosted model example: set endpoint to `http://localhost:11434/v1/chat/completions` and enter the locally installed model's ID. External example: a compatible HTTPS chat completions endpoint and personal key. The app does not retain keys after refresh.
