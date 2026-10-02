import type { SimulationState } from "@sim/domain";
import { defineRenderer } from "@sim/renderer-sdk";

export const descriptor = defineRenderer({
  schemaVersion: "0.1",
  id: "sample-pack-array-list",
  label: "Accessible array list",
  capabilities: {
    entityKinds: ["array"],
    eventTypes: ["READ_INDEX", "WRITE_INDEX"],
    focusKinds: ["inspect", "update", "result"],
  },
  stateContract: { requiredCollections: [], requiredVariables: [] },
  legend: [
    { label: "Current value", cue: "inspect", textCue: "READ" },
    { label: "Changed value", cue: "update", textCue: "CHANGE" },
    { label: "Final result", cue: "result", textCue: "RESULT" },
  ],
  accessibility: {
    role: "region",
    label: "Array list visualization",
    textAlternative: "Each row states its index, value, and status.",
    keyboard: "Use the parent simulation player's keyboard controls.",
  },
});

export function ArrayListRenderer({ state }: { state: SimulationState }) {
  return (
    <ul aria-label="Array entries">
      {Object.values(state.entities)
        .filter((entity) => entity.kind === "array")
        .sort((a, b) => Number(a.label) - Number(b.label))
        .map((entity) => (
          <li key={entity.id}>
            Index {entity.label}: {String(entity.value)}; {entity.status}
            {state.activeEntities.includes(entity.id) ? "; current" : ""}
          </li>
        ))}
    </ul>
  );
}
