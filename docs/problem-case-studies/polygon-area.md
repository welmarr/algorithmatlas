# Polygon Area — shoelace edge contributions

**Problem/representation.** Parse 3–12 distinct integer points in supplied polygon order. Each edge from `(xᵢ,yᵢ)` to the next point contributes `xᵢyᵢ₊₁−yᵢxᵢ₊₁`; the closing edge uses the first point. Summed signed contributions equal twice the oriented area, so the absolute sum is the requested result. The parser checks bounds and distinctness but does not prove the polygon is simple; the user must supply one.

**Implementation and trace.** `packages/problems/src/extended-mixed.ts` initializes an array of edge contributions and directly emits `WRITE_INDEX` plus a running signed-area annotation for each edge. The output is input-dependent. There is no lower-level raw trace for this curated arithmetic loop.

**Teaching/replay/visual.** Each step explains one directed edge and its contribution. The reducer writes the corresponding array cell and running variable; the array renderer shows changed values and text. Seek reveals how positive and negative cross products accumulate before taking the absolute value.

**Verification/generalization.** Rectangle, orientation reversal, and independent shoelace cases are covered in the representative/correctness suites. The example rectangle `[(0,0),(4,0),(4,3),(0,3)]` yields doubled area 24. This contribution pattern generalizes to other prefix accumulations.
