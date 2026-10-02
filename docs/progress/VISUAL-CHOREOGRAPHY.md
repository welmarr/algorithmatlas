# VNext Lot A — visual choreography

Date: 2026-10-02. Branch: `feature/vnext-visual-auth-python`.
Preserved remote baseline: `5a5e6c7baffe369949f25a78b6c65f71ac2fe3cb`.
Status: implemented and locally verified; final milestone gate remains pending.

## Delivered

Framework-free, versioned choreography plans; snapshot reads without playback
mutation; optional validated producer reasoning facts; shared problem/lab/compare
runtime; phase inspection and cancellable motion; reduced-motion fallback;
semantic color/shape/text cues; stable sorting identity; family-specific
equations, intervals, queues, dependencies, string alignment and geometry.

The ten representative problems were inspected using actual browser screenshots:
Increasing Array, Sum of Two Values, Labyrinth, Shortest Routes I, Tree Diameter,
Dice Combinations, Edit Distance, Factory Machines, Chessboard and Queens,
Polygon Area. The remaining curated families use the same strategy layer;
Fenwick and KMP now expose their auxiliary tables.

## Evidence

- `pnpm verify`: passed; 123 unit/component/integration tests passed, 12 opt-in
  tests skipped; formatting, lint, type checking and production build passed.
- Browser regression across choreography/player/lab/comparison: 18 passed.
- After screenshot-driven fixes, choreography/browser suite rerun: 3 passed.
- Final targeted type checking and correctness/renderer/choreography run:
  33 passed. After making producer hints immutable: choreography 5 passed.
- Browser assertions cover all ten representative routes at 390×844, 768×1024,
  1280×800 and 1920×1080; no document-level horizontal overflow.
- Snapshots from 1280px panels were visually inspected for all ten problems.
  Increasing Array shows only the changed cell's `2 → 8` badge, with a dashed
  blue predecessor and solid orange changed cell. DP dependencies are dashed
  blue and the target is orange. Dijkstra's extracted node is labeled Minimum.
  The polygon has real coordinate geometry and a highlighted directed edge.
- The browser proves identified cards have active Web Animations during swaps,
  then zero animations after reduced motion is enabled. Pause/rewind prevents
  stale phase advancement. Snapshot projection tests preserve canonical state
  across every curated teaching step.

One initial browser regression failed because the broad Play locator also
matched Replay reasoning. The distinct Animate reasoning label fixed it.
Screenshot review found a duplicated predecessor change badge and DP dependency
color collision; both were fixed and recaptured. Earlier relaxed edges are no
longer shown as the current relaxation. A queen choice is labeled Accepted,
rather than incorrectly labeled as a final result.

Screenshots are reproducible with `VISUAL_CAPTURE=1` and the choreography E2E
suite. They are temporary files under ignored `test-results`, not source assets.
No new Docker images or volumes were needed for this lot. The baseline test
database remains available for the next authentication lot; unrelated project
containers and shared build cache remain untouched.

## Remaining milestone work

Optional verified accounts/email reset, browser Python execution, full combined
journeys, final security/performance audit, fresh clone reproduction, release
merge/tag and final scoped cleanup remain pending. No public sandbox readiness
claim is made by this visual checkpoint.

## Completed checkpoint reference

Branch: feature/vnext-visual-auth-python. Starting SHA: 5a5e6c7baffe369949f25a78b6c65f71ac2fe3cb. Ending implementation SHA: 6fb3573131642cdff4017c5e3e31e093489bb5b2. Changed subsystems: packages/visual-choreography, simulation-core, semantic-events, family producers, shared web player, tests and ADR-014.

The pending statements above describe this lot's original checkpoint. The combined full/fresh-clone gates now pass; final counts, failures/fixes, cleanup, security limits and release references are recorded in [VNEXT-FINAL](VNEXT-FINAL.md) and the new final audit. Historic audit directories are unchanged.
