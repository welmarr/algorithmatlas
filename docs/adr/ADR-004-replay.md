# ADR-004: Event sourcing and replay

Status: Accepted.

Context: Users need forward, backward, and random timeline navigation. Decision: Store ordered semantic events and reduce them into canonical state. Alternatives: Capture a full state per step. Consequences: Small event streams and deterministic replay; reducers must remain version-aware and pure.
