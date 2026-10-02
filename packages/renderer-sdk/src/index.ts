import type {
  EntityKind,
  EntityStatus,
  SimulationState,
  StepFocusKind,
} from "@sim/domain";
import type { EventType } from "@sim/semantic-events";

export interface RendererDescriptor {
  schemaVersion: "0.1";
  id: string;
  label: string;
  capabilities: {
    entityKinds: EntityKind[];
    eventTypes: EventType[];
    focusKinds: StepFocusKind[];
  };
  stateContract: {
    requiredCollections: string[];
    requiredVariables: string[];
  };
  legend: {
    label: string;
    cue: StepFocusKind | EntityStatus;
    textCue: string;
  }[];
  accessibility: {
    role: "region" | "list" | "table" | "img";
    label: string;
    textAlternative: string;
    keyboard: string;
  };
}

export class RendererDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RendererDefinitionError";
  }
}

export function defineRenderer<T extends RendererDescriptor>(descriptor: T): T {
  if (
    descriptor.schemaVersion !== "0.1" ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(descriptor.id) ||
    !descriptor.label.trim()
  )
    throw new RendererDefinitionError(
      "Renderer needs a versioned id and label",
    );
  const { capabilities, stateContract, legend, accessibility } = descriptor;
  if (
    !capabilities?.entityKinds.length ||
    !capabilities.focusKinds.length ||
    !Array.isArray(capabilities.eventTypes) ||
    !Array.isArray(stateContract?.requiredCollections) ||
    !Array.isArray(stateContract.requiredVariables)
  )
    throw new RendererDefinitionError(
      "Renderer capabilities and state contract are incomplete",
    );
  if (
    !Array.isArray(legend) ||
    !legend.length ||
    legend.some(
      (item) => !item.label?.trim() || !item.textCue?.trim() || !item.cue,
    )
  )
    throw new RendererDefinitionError("Renderer needs non-color legend cues");
  for (const kind of capabilities.focusKinds)
    if (!legend.some((item) => item.cue === kind))
      throw new RendererDefinitionError(`Missing legend cue for ${kind}`);
  if (
    !accessibility?.role ||
    !accessibility.label?.trim() ||
    !accessibility.textAlternative?.trim() ||
    !accessibility.keyboard?.trim()
  )
    throw new RendererDefinitionError(
      "Renderer needs an accessibility contract",
    );
  return descriptor;
}

export function rendererStateIssues(
  descriptor: RendererDescriptor,
  state: SimulationState,
): string[] {
  const issues: string[] = [];
  for (const name of descriptor.stateContract.requiredCollections)
    if (!Object.hasOwn(state.collections, name))
      issues.push(`Missing collection ${name}`);
  for (const name of descriptor.stateContract.requiredVariables)
    if (!Object.hasOwn(state.variables, name))
      issues.push(`Missing variable ${name}`);
  if (
    state.focus &&
    !descriptor.capabilities.focusKinds.includes(state.focus.kind)
  )
    issues.push(`Unsupported focus ${state.focus.kind}`);
  return issues;
}

/** The registry contains descriptors and local render functions; it never imports pack code. */
export class RendererRegistry<T> {
  private entries = new Map<
    string,
    { descriptor: RendererDescriptor; render: T }
  >();

  register(descriptor: RendererDescriptor, render: T): void {
    defineRenderer(descriptor);
    if (this.entries.has(descriptor.id))
      throw new RendererDefinitionError(
        `Renderer ${descriptor.id} is already registered`,
      );
    this.entries.set(descriptor.id, { descriptor, render });
  }

  get(id: string): { descriptor: RendererDescriptor; render: T } | undefined {
    return this.entries.get(id);
  }

  list(): RendererDescriptor[] {
    return [...this.entries.values()].map((entry) => entry.descriptor);
  }
}
