# Renderer SDK v0.1

`Visuals` selects array, grid, graph, tree, or DP components using `ProblemMetadata.renderer`. Each renderer receives only `SimulationState`. Visual entities provide stable IDs, kind, label, optional value/metadata, and semantic status. Active entity IDs describe the current event. Renderers map these fields to SVG or accessible DOM; they never compute algorithm results.

To add a renderer, define the entity contract in `packages/domain`, add a renderer kind, implement a component under `apps/web/src/components`, wire the selector, add non-color status indicators and keyboard/screen-reader alternatives, then test seek/rewind behavior. UI is responsive; graph and tree positions are currently simple bounded layouts. Complex graph layout can later be hidden behind this renderer boundary.

The player uses four semantic action cues across renderer families: blue for reading or inspecting, orange for changed values, teal for exploration, and gold for final paths or results. Each cue also has a text label, and value changes show before and after values. The reducer stores this presentation-neutral focus metadata in simulation state so every renderer can apply the same visual language during replay. Motion is brief and disabled when the user requests reduced motion.
