# LOT 07 — Contributor SDKs and community packs

Status: **COMPLETE**

- Baseline commit: `0107c9138cdfb28d5b97345866fae38e780c462e`
- Resulting implementation commit: `7f7419c`

## Implemented

- Expanded the problem SDK with versioned input schemas, contributor validation, teaching mapping validation, renderer configuration, and a catalog adapter. Existing curated definitions remain compatible.
- Added declarative versioned pack manifests, namespaced IDs, safe relative module paths, duplicate checks, and explicit `registerTrustedPack` for already reviewed local code. Manifest validation never imports or executes listed modules.
- Added a framework-independent renderer SDK for capability, state, focus, legend, visible text cue, and accessibility contracts. The web renderer selector accepts explicitly registered local custom components and shows a visible fallback when a renderer is absent or its state contract is unmet. Built-in IDs cannot be replaced.
- Added a sample pack containing a dynamic Reverse Array problem and custom accessible array-list renderer. Tests run its definition and visual component without installing it into the default twenty-problem catalog.
- Added `pnpm contributor` commands to create packs, problems, and renderers, and validate pack metadata and local module paths. Documented source review, build-time allowlisting, version pinning, and the absence of remote on-demand installation.

## Tests

- Unit and integration: **102 passed, 0 failed, 0 skipped**. New tests cover edited sample input and replay, teaching coverage, manifest path and duplicate rejection, explicit trust and catalog collision guards, renderer capability and fallback behavior, and server-rendered accessibility text.
- E2E: **15 passed, 0 failed, 0 skipped**. The full browser suite confirms existing curated pages, lab, comparison, responsive views, and playback still work after the renderer boundary changes.
- Typecheck, lint, format, and production build: passed. The production build generated all twenty curated routes and the lab routes.
- Docker image build: passed. Updated local container on port 3000 returned HTTP 200 for `/problems/increasing-array` and a healthy `/api/health` response.
- CLI smoke test: created a temporary pack, problem, and renderer; `validate-pack` accepted its metadata and paths without executing code. The scaffolded problem and manifest renderer IDs matched.

## Known limitations

- The sample pack is intentionally not auto-installed into the default catalog. A maintainer must review and explicitly import local code into an application build.
- Pack validation checks metadata and local paths; it is not a sandbox, signature system, source audit, or runtime safety proof. The input schema delegates validation to contributor code, with one shared parser required by the strict contributor check.
- Custom renderers can use existing entity and event types without core changes. New entity kinds or semantic operations still need protocol and reducer changes. Remote pack discovery and installation are not implemented.

## Cleanup

- Removed the exact temporary CLI smoke-test directory and generated Playwright results after verification. No Docker volume is labeled for the Simulator Compose project; other project volumes were left intact.
- Historic audit files remain unchanged; no remote push was made.

## Next lot

Lot 08 — AI-agnostic connector protocol.
