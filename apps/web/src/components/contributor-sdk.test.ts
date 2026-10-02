import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyState } from "@sim/domain";
import {
  ProblemDefinitionError,
  registerTrustedPack,
  toProblemEntry,
  validateContributorProblem,
  validatePackManifest,
} from "@sim/problem-sdk";
import {
  defineRenderer,
  RendererDefinitionError,
  RendererRegistry,
  rendererStateIssues,
} from "@sim/renderer-sdk";
import pack from "../../../../examples/community-pack/pack.json";
import { reverseArray } from "../../../../examples/community-pack/problems/sample-pack-reverse-array";
import {
  ArrayListRenderer,
  descriptor,
} from "../../../../examples/community-pack/renderers/sample-pack-array-list";
import { getRendererLegend, registerVisualRenderer, Visuals } from "./Visuals";

describe("contributor SDK and trusted sample pack", () => {
  it("validates a complete problem and replays input-dependent contributed events", () => {
    const checked = validateContributorProblem(reverseArray);
    expect(checked.output).toBe("7 1 4");
    checked.timeline.dispose();
    const entry = toProblemEntry(reverseArray);
    const run = entry.run({ values: [8, 2, 5, 1, 7] });
    expect(run.output).toBe("7 1 5 2 8");
    expect(
      Object.values(run.timeline.seek(run.timeline.length).entities)
        .filter((item) => item.kind === "array")
        .map((item) => item.value),
    ).toEqual([7, 1, 5, 2, 8]);
    expect(run.teachingSteps.at(-1)?.eventRange.end).toBe(run.events.length);
    run.timeline.dispose();
  });

  it("treats manifests as data and requires explicit approval to register executable entries", () => {
    const checked = validatePackManifest(pack);
    expect(checked.problems[0].id).toBe("sample-pack-reverse-array");
    expect(checked.renderers[0].id).toBe("sample-pack-array-list");
    const entry = toProblemEntry(reverseArray);
    expect(() =>
      registerTrustedPack(pack, [entry], {
        approvedLocalCode: false as true,
      }),
    ).toThrow(ProblemDefinitionError);
    expect(() =>
      registerTrustedPack(pack, [entry], {
        approvedLocalCode: true,
        existingProblemIds: [entry.metadata.id],
      }),
    ).toThrow(ProblemDefinitionError);
    const registered = registerTrustedPack(pack, [entry], {
      approvedLocalCode: true,
    });
    expect(registered.entries).toHaveLength(1);
  });

  it("rejects traversing and duplicate manifest declarations", () => {
    expect(() =>
      validatePackManifest({
        ...pack,
        problems: [{ ...pack.problems[0], module: "../outside.ts" }],
      }),
    ).toThrow(/safe relative/);
    expect(() =>
      validatePackManifest({
        ...pack,
        problems: [pack.problems[0], pack.problems[0]],
      }),
    ).toThrow(/Duplicate/);
  });

  it("registers a capability-described renderer and exposes its text cues", () => {
    const registry = new RendererRegistry<typeof ArrayListRenderer>();
    registry.register(descriptor, ArrayListRenderer);
    expect(registry.get(descriptor.id)?.descriptor.accessibility.role).toBe(
      "region",
    );
    expect(() => registry.register(descriptor, ArrayListRenderer)).toThrow(
      RendererDefinitionError,
    );
    expect(() =>
      defineRenderer({
        ...descriptor,
        legend: [{ label: "Changed", cue: "update" as const, textCue: "" }],
      }),
    ).toThrow(RendererDefinitionError);
    registerVisualRenderer(descriptor, ArrayListRenderer);
    expect(getRendererLegend(descriptor.id)[0].label).toContain("READ");
    const state = emptyState();
    state.entities["array:0"] = {
      id: "array:0",
      kind: "array",
      label: "0",
      value: 9,
      status: "visited",
    };
    state.activeEntities = ["array:0"];
    const html = renderToStaticMarkup(
      createElement(Visuals, { kind: descriptor.id, state }),
    );
    expect(html).toContain('aria-label="Array list visualization"');
    expect(html).toContain("Index 0: 9; visited; current");
    state.focus = { eventId: "event:test", kind: "explore" };
    expect(rendererStateIssues(descriptor, state)).toContain(
      "Unsupported focus explore",
    );
    expect(
      renderToStaticMarkup(
        createElement(Visuals, { kind: descriptor.id, state }),
      ),
    ).toContain("cannot display this state");
  });
});
