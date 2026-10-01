# ADR-002: React isolated from simulation core

Status: Accepted.

Context: Replay must be testable and usable without the UI. Decision: Core packages import no React or Next.js; only `apps/web` owns components. Alternatives: Hook-based simulation state. Consequences: Explicit subscription bridge and framework-independent tests.
