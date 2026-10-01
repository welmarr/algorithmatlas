# ADR-009: Normalized teacher protocol

Status: Accepted for v0.1.

Context: Provider JSON cannot be trusted as platform state. Decision: Validate matching event ID, version, bounded explanation; discard all other fields. Alternatives: Display raw provider output or allow arbitrary state patches. Consequences: Provider adapters are replaceable and cannot mutate replay state.
