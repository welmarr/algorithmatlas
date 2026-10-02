# ADR-006: Rust execution layer

Status: Superseded by ADR-013 for the local Python foundation. Rust remains an option for later runtimes.

Context: Future user-code execution needs a small, auditable system boundary. Decision: Introduce Rust for runtime orchestration and sandbox/trace processing when code execution is built. Alternatives: Node child processes or Python backend. Consequences: Additional build pipeline, security review, and FFI/WASM boundary. No current feature invokes a Rust executor.
