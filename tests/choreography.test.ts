import { describe, expect, it } from "vitest";
import { getProblem, problems } from "@sim/problems";
import {
  createChoreography,
  presentationState,
  strategyFor,
  validatePlan,
} from "@sim/visual-choreography";
import { validateEvent } from "@sim/semantic-events";

describe("presentation-only choreography", () => {
  it("serializes deterministically for every curated step without changing canonical playback", () => {
    for (const problem of problems) {
      const run = problem.run(problem.defaultInput);
      run.timeline.seek(Math.min(3, run.timeline.length));
      const original = run.timeline.state;
      let emissions = 0;
      run.timeline.subscribe(() => emissions++);
      for (const step of run.teachingSteps) {
        const plan = createChoreography(
          run.timeline,
          problem.metadata.renderer,
          problem.metadata.tags,
          step,
        );
        expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
        expect(plan).toEqual(
          createChoreography(
            run.timeline,
            problem.metadata.renderer,
            problem.metadata.tags,
            step,
          ),
        );
        const canonical = run.timeline.stateAt(step.eventRange.end);
        const display = presentationState(canonical, plan);
        expect(display.entities).toEqual(canonical.entities);
        expect(display.collections).toEqual(canonical.collections);
        expect(display.variables).toEqual(canonical.variables);
      }
      expect(emissions).toBe(0);
      expect(run.timeline.state).toEqual(original);
    }
  });
  it("explains each forced increment using the supplied values and totals", () => {
    const problem = getProblem("increasing-array")!,
      run = problem.run({ values: [8, 2, 5, 1, 7] });
    const expected = [
      "2 < 8 · 2 → 8 · +6 · total 6",
      "5 < 8 · 5 → 8 · +3 · total 9",
      "1 < 8 · 1 → 8 · +7 · total 16",
      "7 < 8 · 7 → 8 · +1 · total 17",
    ];
    for (let i = 1; i <= 4; i++) {
      const plan = createChoreography(
        run.timeline,
        "array",
        problem.metadata.tags,
        run.teachingSteps[i],
      );
      expect(plan.reducedMotion.actions).toContainEqual({
        type: "SHOW_EQUATION",
        text: expected[i - 1],
      });
      expect(plan.phases.map((phase) => phase.purpose)).toEqual([
        "focus",
        "compare",
        "decide",
        "transform",
        "confirm",
        "settle",
      ]);
    }
    const edited = problem.runCode!(
      { values: [8, 2] },
      "values[0] = 1; return 0;",
    );
    expect(edited.timeline.metadata.teachingStrategy).toBe("events");
    expect(
      createChoreography(
        edited.timeline,
        "array",
        [],
        edited.teachingSteps[1],
      ).reducedMotion.actions.some(
        (action) =>
          action.type === "SHOW_REASON" &&
          action.text.includes("Only increments"),
      ),
    ).toBe(false);
  });
  it("sorts identified pairs visibly and demonstrates both pointer decisions before success", () => {
    const p = getProblem("sum-of-two-values")!,
      run = p.run(p.defaultInput);
    expect(
      run.events.filter((event) => event.type === "SWAP").length,
    ).toBeGreaterThan(0);
    const comparisons = run.events.flatMap(
      (event) => event.pedagogy?.equation ?? [],
    );
    expect(comparisons.some((text) => text.includes("< 12"))).toBe(true);
    expect(comparisons.some((text) => text.includes("> 12"))).toBe(true);
    expect(comparisons.some((text) => text.includes("= 12"))).toBe(true);
    const end = run.timeline.stateAt(run.timeline.length);
    expect(Object.values(end.entities).map((entity) => entity.value)).toEqual([
      1, 3, 4, 6, 8, 10,
    ]);
    expect(
      Object.values(end.entities).map(
        (entity) => entity.metadata?.originalIndex,
      ),
    ).toEqual([1, 3, 5, 2, 0, 4]);
    expect(run.output).toBe("1 6");
    run.timeline.seek(0);
    expect(
      Object.values(run.timeline.state.entities).map((entity) => entity.value),
    ).toEqual([8, 1, 6, 3, 10, 4]);
  });
  it("retains stable identity for duplicates and exposes actual priority and DP dependencies", () => {
    const sorted = getProblem("distinct-numbers")!.run({
      values: [3, 1, 3, 1],
    });
    expect(
      Object.values(
        sorted.timeline.stateAt(sorted.timeline.length).entities,
      ).map((entity) => entity.metadata?.originalIndex),
    ).toEqual([1, 3, 0, 2]);
    const p = getProblem("shortest-routes-i")!,
      run = p.run(p.defaultInput);
    expect(
      run.events
        .filter((event) => event.type === "HEAP_EXTRACT")
        .map((event) => event.entities[0]),
    ).toEqual(["heap:item:A", "heap:item:B", "heap:item:C", "heap:item:D"]);
    expect(run.timeline.stateAt(run.timeline.length).collections.heap).toEqual(
      [],
    );
    const dice = getProblem("dice-combinations")!.run({ target: 3 });
    expect(
      dice.events
        .filter((event) => event.type === "DP_UPDATE")
        .every((event) => event.entities.length === 2),
    ).toBe(true);
  });
  it("rejects unsupported renderer actions and invalid producer facts", () => {
    const run = getProblem("increasing-array")!.run({ values: [2, 1] });
    const plan = createChoreography(
      run.timeline,
      "array",
      [],
      run.teachingSteps[1],
    );
    expect(() => validatePlan({ ...plan, renderer: "variables" })).toThrow(
      "does not support TRANSITION_VALUE",
    );
    expect(() =>
      validateEvent({
        ...run.events[0],
        pedagogy: {
          schemaVersion: "0.1",
          range: { low: Infinity, high: 4, label: "bad" },
        },
      }),
    ).toThrow("Invalid pedagogy");
    expect(strategyFor(["Fenwick tree"], "array")).toBe("fenwick");
    expect(strategyFor(["shoelace formula"], "array")).toBe("geometry");
  });
});
