# ADR-010: Isolated user-code sandbox

Status: Planned; public execution prohibited until review.

Context: Full-language user submissions are hostile. Decision: Build layered Rust/WASI or equivalent isolation with no host network/filesystem and resource limits before exposing an arbitrary-code runner. Alternatives: Direct host subprocesses. Consequences: Significant system and security testing work. The current app has a browser-side, syntax-whitelisted interpreter for Increasing Array; it cannot invoke host APIs or execute general JavaScript.
