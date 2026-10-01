# ADR-011: Graph renderer boundary

Status: Accepted.

Context: Graph layouts may change without altering algorithms. Decision: The graph renderer consumes canonical entities and metadata; no problem pack imports a layout library. Alternatives: Pack-specific SVGs or direct Cytoscape data in events. Consequences: Layout can later move to Cytoscape or Canvas behind the component contract.
