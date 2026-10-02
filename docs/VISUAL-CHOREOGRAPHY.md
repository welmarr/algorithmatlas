# Visual choreography

`@sim/visual-choreography` is a framework-free projection from semantic events,
teaching steps and snapshot states to a versioned, JSON-serializable plan.
It never calls `seek`, writes a simulation entity, or computes an answer.
`SimulationTimeline.stateAt(position)` reads a snapshot without notifying the
player. The selected canonical event position is unchanged during animation.

## Contract

Plans carry their teaching-step ID, renderer, family strategy, before/after
positions, ordered phases and an explicit reduced-motion summary. Meaningful
phases are selected from orient, focus, compare, decide, transform, confirm and
settle. A traversal does not receive an invented numeric comparison.

Actions include focus, equation, reason, swap, value transition, dependencies,
range, string alignment and frontier. Unsupported renderer/action pairs raise
`CHOREOGRAPHY_UNSUPPORTED_ACTION`; invalid plans raise
`CHOREOGRAPHY_INVALID_PLAN`. Producer `pedagogy` facts are versioned and bounded
by semantic-event validation. They contain text and references, never CSS,
JavaScript or provider-specific data. React escapes all text.

Strategies are selected from algorithm tags and renderer capabilities. The
curated monotone-array teaching profile is explicitly selected by the problem
definition. Editing its reference code disables this profile, preventing a
generic edited program from receiving claims about the greedy algorithm.
Neither the choreography engine nor teaching grouping switches on problem IDs.

## Runtime

`ChoreographyStage` is shared by problems, the lab and comparison panes.
Manual navigation settles at the selected state immediately. Phase buttons
let learners inspect the before/after reasoning; **Animate reasoning** runs
the phases, with its own pause. Learning autoplay runs the phases as it
advances. The state inspector reports the selected canonical position while
the stage explicitly labels its transient phase.

A replaced step/run unmounts its phase timer and cancels Web Animations.
Reduced motion settles immediately, retaining equations, reasons, identities
and labels. The main problem player supports 0.5×, 1×, 1.5×, 2× and 4×.
Responsive layouts wrap controls and keep wide DP/string content within its
own scrolling region.

Sorting swaps retain slot IDs but move item metadata (`itemId`, original index)
with the value. The browser measures slot positions and moves those identified
cards with cancellable Web Animations. Increasing Array uses value transitions
without changing order. Motion APIs follow the
[MDN animate contract](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)
and [cancel lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel).

## Verification

`tests/choreography.test.ts` checks deterministic serialization, every curated
step, unchanged canonical values/collections/variables, no playback emissions,
input-dependent increments, stable duplicate identities, pointer decisions,
priority extraction, dependencies and invalid facts/actions. Browser tests
exercise phase selection, animation cancellation, reduced motion and target
viewport bounds. The progress report records observed results and visual QA.
