# Algorithm Lab

The lab at `/lab` is an independent workspace. It runs algorithms from `apps/web/src/lib/algorithm-lab.ts` and does not load a CSES problem definition or require a problem page. All inputs and runs stay in the browser.

The linked [comparison workspace](ALGORITHM-COMPARISON.md) runs two of these algorithms on the same edited input with separate timelines.

| Structure | Algorithms                                      | Editor                                                          |
| --------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Array     | Insertion sort, linear search                   | Add, remove, and change values; set a search target             |
| Grid      | Breadth-first search, depth-first search        | Resize a 2–8 by 2–8 grid; paint walls; move start A and goal B  |
| Graph     | Breadth-first search, depth-first search        | Add or remove nodes and undirected edges; choose start and goal |
| Tree      | Preorder depth-first, level-order breadth-first | Add or remove nodes; choose each node's parent                  |

Press **Run algorithm** after editing. Changing the structure or algorithm starts a run with the current editor input. **Restore example input** resets the selected editor. The player provides teaching steps, exact semantic events, Play/Pause, previous/next, seek, and replay reset. Its inspectors show the current data structure, variables, algorithm outline, step map, and full event log. Teaching steps group events; switching to technical events keeps the exact trace and state.

The runner validates every input before constructing a timeline. It emits the same versioned semantic event protocol used by problem simulations, so seek and playback use the shared reducer. Breadth-first search reports a shortest unweighted route. Depth-first search reports the first route found by its stack order; that route can be longer.

Interactive bounds keep replay readable: arrays have 1–20 values, grids are 2–8 by 2–8, graphs have 2–10 nodes and up to 24 edges, and trees have 1–10 nodes. The lab does not execute arbitrary user code. The displayed outlines describe the built-in algorithms.
