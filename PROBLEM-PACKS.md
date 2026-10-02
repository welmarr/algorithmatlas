# Problem packs

`packages/problem-sdk` validates versioned pack metadata, problem IDs, paths, examples, renderer requirements, and duplicate registrations. A manifest is inert data: validation does not import code from it. `pnpm contributor` can scaffold and validate a local pack. A reviewer must inspect executable problem and renderer modules before registering them with `approvedLocalCode: true`; this flag is an explicit trust decision, not isolation.

The sample pack exercises source, input, trace, teaching, replay, and custom renderer contracts in `apps/web/src/components/contributor-sdk.test.ts`. Community distribution and automatic remote installation are not implemented. Never load an unreviewed third-party module into the web process. See [PACKS.md](PACKS.md) for CLI examples and [SECURITY.md](SECURITY.md) for the trust boundary.
