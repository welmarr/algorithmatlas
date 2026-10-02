# Algorithm Comparison

The independent workspace at `/lab/compare` runs two built-in algorithms on **one validated input** and displays their semantic event traces side by side. It currently offers graph BFS versus DFS, grid BFS versus DFS, and tree preorder DFS versus level-order BFS. Enter shared JSON and select **Run both algorithms** to regenerate both traces. The default input for each pair highlights a different traversal order or route.

Each pane has its own timeline, event seek slider, step controls, result, visualization, collection and variable inspectors, event-type counts, algorithm outline, and exact event log. Toggle **Synchronized event playback** to advance one semantic event per side on each tick; a shorter trace waits at its end. Turning it off enables separate Play/Pause controls. Seeking either side is independent in both modes.

Metrics are counts of semantic events, unique visited and discovered entities, and queue or stack operations. The result check independently validates graph and grid routes, verifies BFS shortest path length, and checks that tree traversals visit every node exactly once. A valid DFS route may be longer than BFS; different tree visit orders are both correct. The comparison does not use browser timing as evidence of runtime superiority.

Inputs inherit the Algorithm Lab's bounds: graph 2–10 nodes with up to 24 edges, grid 2–8 by 2–8, and tree 1–10 nodes. These are built-in algorithm traces and do not execute arbitrary pasted code. Dijkstra versus Bellman–Ford, merge sort versus quick sort, and naive versus optimized pairs are future additions to the same comparison model.
