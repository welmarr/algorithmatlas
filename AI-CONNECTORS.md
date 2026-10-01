# Optional teacher connectors

The AI SDK exposes `TeacherConnector.explain(event)` and the normalized `StepExplanation` schema (`schemaVersion`, matching `eventId`, bounded `explanation`, `provider`). A built-in teacher uses curated event text; a local hosted model and an external OpenAI-compatible model use the same narrow response validator. Extra response fields are discarded. The SDK does not import the reducer, and the UI displays explanations separately from simulation state.

The web UI accepts provider endpoint, model, and optional key for the current tab only. It sends requests directly from the browser, so the endpoint must support CORS. External endpoints require HTTPS; local models may use loopback HTTP. No fallback to an unvalidated model response is permitted. The built-in deterministic explanation remains available if models are absent.

Local hosted model example: set endpoint to `http://localhost:11434/v1/chat/completions` and enter the locally installed model's ID. External example: a compatible HTTPS chat completions endpoint and personal key. The app does not retain keys after refresh.
