export type EntityKind =
  | "array"
  | "grid"
  | "graph-node"
  | "graph-edge"
  | "tree-node"
  | "dp"
  | "queue-item"
  | "stack-item"
  | "heap-item";
export type EntityStatus =
  "idle" | "active" | "discovered" | "visited" | "path" | "blocked";
export type Primitive = string | number | boolean | null;

export interface VisualEntity {
  id: string;
  kind: EntityKind;
  label: string;
  value?: Primitive;
  status: EntityStatus;
  metadata?: Record<string, Primitive>;
}

export type StepFocusKind = "inspect" | "update" | "explore" | "result";
export interface StepFocus {
  eventId: string;
  kind: StepFocusKind;
  before?: Primitive;
  after?: Primitive;
  variable?: string;
}

export interface SimulationState {
  entities: Record<string, VisualEntity>;
  variables: Record<string, Primitive>;
  collections: Record<string, string[]>;
  activeEntities: string[];
  annotation: string;
  focus: StepFocus | null;
}

export interface SourceRef {
  file: string;
  line: number;
  column?: number;
  statementId?: string;
  astNodeId?: string;
}

export interface ProblemSource {
  name: string;
  url?: string;
}
export interface ProblemConstraint {
  label: string;
  value: string;
}
export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}
export interface AlgorithmComplexity {
  time: string;
  space: string;
}
export interface LearningContent {
  intuition: string;
  approach: string[];
  naive?: string;
  explanation: string;
}
export type RendererKind = "array" | "grid" | "graph" | "tree" | "dp";

export interface ProblemMetadata {
  schemaVersion: "0.1";
  id: string;
  title: string;
  category: string;
  summary: string;
  source: ProblemSource;
  constraints: ProblemConstraint[];
  examples: ProblemExample[];
  complexity: AlgorithmComplexity;
  learning: LearningContent;
  renderer: RendererKind;
  tags: string[];
}

export interface RawTraceEvent {
  operation: string;
  data: Record<string, Primitive>;
  sourceRef?: SourceRef;
}
/** A pedagogical frame over an inclusive, one-based semantic event range. */
export interface TeachingStep {
  schemaVersion: "0.1";
  id: string;
  index: number;
  title: string;
  summary: string;
  eventRange: { start: number; end: number };
  primaryEventIds: string[];
  visualRefs: string[];
  codeRefs?: SourceRef[];
  conceptIds?: string[];
  cue?: {
    kind: StepFocusKind;
    entityId?: string;
    before?: Primitive;
    after?: Primitive;
  };
}
export interface Explanation {
  text: string;
  eventIds?: string[];
}
export interface Hint {
  level: number;
  text: string;
}
export interface AlternativeAlgorithm {
  name: string;
  complexity: AlgorithmComplexity;
  summary: string;
}
export interface AlgorithmVariant {
  id: string;
  name: string;
  complexity: AlgorithmComplexity;
}
export interface AlgorithmImplementation {
  language: string;
  source: string;
  version: string;
}
export interface Algorithm {
  id: string;
  variants: AlgorithmVariant[];
  implementations: AlgorithmImplementation[];
}
export interface ProblemInput<T = unknown> {
  schemaVersion: "0.1";
  value: T;
}
export interface Simulation {
  id: string;
  problemId: string;
  algorithmVersion: string;
}
export interface SimulationSnapshot {
  position: number;
  state: SimulationState;
}
export interface SimulationRun {
  simulation: Simulation;
  input: ProblemInput;
  output: unknown;
  snapshots: SimulationSnapshot[];
}
export interface UserSubmission {
  id: string;
  language: string;
  source: string;
  createdAt: string;
}
export interface ExecutionResult {
  status: "ok" | "error" | "timeout";
  stdout: string;
  stderr: string;
  durationMs: number;
}
export interface AIProvider {
  id: string;
  name: string;
}
export interface AIResponse {
  schemaVersion: "0.1";
  explanation: string;
  eventId?: string;
}
export interface AIConnector {
  provider: AIProvider;
  explain(eventId: string): Promise<AIResponse>;
}
export interface ProblemPack {
  schemaVersion: "0.1";
  id: string;
  problemIds: string[];
}

export function emptyState(): SimulationState {
  return {
    entities: {},
    variables: {},
    collections: {},
    activeEntities: [],
    annotation: "",
    focus: null,
  };
}
