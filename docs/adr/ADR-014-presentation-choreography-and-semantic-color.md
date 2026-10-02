# ADR-014: Presentation choreography and semantic color

Status: accepted for VNext.

## Decision

Use a separate TypeScript package for deterministic presentation plans and a
React runtime for transient phases. Snapshot reads cannot move canonical
playback. Algorithms can attach validated reasoning facts to semantic events;
renderers cannot invent answers. Reusable strategies use family tags, not
problem IDs. Editable reference code loses any curated-only teaching profile.

Use a restrained semantic palette with textual and shape/border redundancy.
Support reduced motion as a complete explanation path. Identity-preserving
swaps are necessary to teach sorting; copying sorted numbers into stationary
cards was rejected because it conceals the permutation and original indices.

## Consequences

Source producers now record some explicit equations, boundaries and alignment
facts. This makes correctness inspectable without AI but does not infer all
possible algorithms. New action types require both capability validation and
an actual renderer implementation. The rendering runtime owns cancellation;
the core owns only deterministic events and states.
