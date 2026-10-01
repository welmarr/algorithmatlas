# ADR-012: WebAssembly strategy

Status: Planned.

Context: Browser-side isolated execution may eventually improve latency and privacy. Decision: Evaluate WASI/Wasmtime and browser WASM for supported code workflows after threat modeling; do not presume WASM alone is a complete sandbox. Alternatives: Server containers or native host execution. Consequences: Runtime-specific limits and portability tests will be required.
