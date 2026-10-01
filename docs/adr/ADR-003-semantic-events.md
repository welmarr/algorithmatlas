# ADR-003: Semantic events

Status: Accepted.

Context: Color and animation commands embed UI decisions in algorithms. Decision: Algorithms emit versioned actions such as `VISIT_NODE` and `DP_UPDATE`; renderers choose appearance. Alternatives: Direct SVG changes. Consequences: Events support different renderers and accessible descriptions, while vocabulary governance is necessary.
