# Contributing

Start with [ARCHITECTURE.md](ARCHITECTURE.md) and the [pack workflow](PACKS.md). Keep algorithm logic in problem packs, semantic state changes in the simulation reducer, and appearance in renderers. New event types require protocol documentation, validation, reducer behavior, and replay tests. New problems require bounded input parsing, metadata, intuition, reference source, trace events, teaching mapping, and correctness tests. Use the sample pack and run `pnpm contributor validate-pack examples/community-pack`, typecheck, lint, tests, and build before submitting changes.
