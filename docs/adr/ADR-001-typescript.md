# ADR-001: TypeScript primary ecosystem

Status: Accepted for current milestone.

Context: Domain contracts, event producers, playback, and browser UI need shared types. Decision: Use strict TypeScript packages in a pnpm monorepo. Alternatives: JavaScript, Rust throughout. Consequences: One typed contract spans the browser stack; system execution may still use Rust when introduced.
