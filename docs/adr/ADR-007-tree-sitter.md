# ADR-007: Tree-sitter parsing

Status: Planned; not yet implemented.

Context: Source lines and AST nodes will need stable syntax references for user code. Decision: Use Tree-sitter for syntax and source mapping, not for inferring algorithm semantics. Alternatives: Regex or compiler-specific parsers. Consequences: Language grammars and versioned AST mappings are required when user code arrives.
