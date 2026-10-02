# Community packs and local trust policy

Problem packs are versioned declarations plus optional local TypeScript modules. A `pack.json` lists namespaced problem and renderer IDs and safe relative module paths. It is data, not executable configuration. The platform does **not** fetch or install packs from URLs and does not import listed code during manifest validation.

## Contributor workflow

```bash
pnpm contributor create-pack packages/my-pack my-pack
pnpm contributor create-problem packages/my-pack my-pack-example
pnpm contributor create-renderer packages/my-pack my-pack-list
pnpm contributor validate-pack packages/my-pack
pnpm test
pnpm typecheck
```

The scaffolds are starting points. Replace the copied sample algorithm, examples, learning text, renderer, and tests. `create-pack` leaves an empty manifest until the first problem is created. `validate-pack` checks IDs, versions, required fields, duplicates, relative paths, and that listed modules exist inside the pack directory. It does **not** evaluate the modules or certify their security or correctness. The [sample pack](examples/community-pack/pack.json) is executable in the test suite and demonstrates a custom renderer.

## Installation policy

1. Review source and dependencies locally. Confirm bounded inputs, deterministic events, protocol validity, correct results, clear teaching content, and accessible visual cues.
2. Import reviewed modules explicitly in the application build. Call `validateContributorProblem(definition)` and `registerTrustedPack(manifest, entries, { approvedLocalCode: true, existingProblemIds })`. Register any reviewed custom component with `registerVisualRenderer`. The explicit imports are the allowlist; manifest paths alone never load code.
3. Add approved entries to the local catalog through the application composition layer and run unit, browser, type, lint, and build checks before shipping. Keep each pack version pinned and review updates as new code.

`approvedLocalCode: true` is an explicit maintainer decision for code already present in the build; it is not a permission prompt for arbitrary user input. Untrusted third-party source must not be imported or executed automatically. A remote pack marketplace or on-demand install flow would require a separate signature, review, versioning, and isolation design.
