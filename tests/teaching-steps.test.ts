import { describe, expect, it } from "vitest";
import { getProblem, problems } from "@sim/problems";
import { seekTeachingStep, teachingStepAtPosition } from "@sim/simulation-core";

describe("teaching step projection", () => {
  it("groups the 29 Increasing Array events into initial, four changes, and result", () => {
    const run = getProblem("increasing-array")!.run({
      values: [8, 2, 5, 1, 7],
    });
    expect(run.events).toHaveLength(29);
    expect(run.rawTrace).toHaveLength(29);
    expect(run.teachingSteps.map((step) => step.title)).toEqual([
      "Initial state",
      "Increase 2 → 8 (+6)",
      "Increase 5 → 8 (+3)",
      "Increase 1 → 8 (+7)",
      "Increase 7 → 8 (+1)",
      "Final result",
    ]);
    expect(
      run.teachingSteps[1].eventRange.end -
        run.teachingSteps[1].eventRange.start,
    ).toBeGreaterThan(0);
    seekTeachingStep(run.timeline, run.teachingSteps, 1);
    expect(run.timeline.state.entities["array:1"].value).toBe(8);
    expect(run.timeline.state.entities["array:2"].value).toBe(5);
    seekTeachingStep(run.timeline, run.teachingSteps, 4);
    expect(
      Array.from(
        { length: 5 },
        (_, index) => run.timeline.state.entities[`array:${index}`].value,
      ),
    ).toEqual([8, 8, 8, 8, 8]);
    seekTeachingStep(run.timeline, run.teachingSteps, 5);
    expect(run.timeline.position).toBe(run.timeline.length);
    expect(run.timeline.state.variables.moves).toBe(17);
    run.timeline.seek(1);
    expect(
      teachingStepAtPosition(run.teachingSteps, run.timeline.position),
    ).toBe(1);
    expect(run.timeline.currentEvent?.type).toBe("READ_INDEX");
  });

  it("covers every event in order for each curated problem", () => {
    for (const problem of problems) {
      const run = problem.run(problem.defaultInput);
      expect(run.teachingSteps[0].eventRange).toEqual({ start: 0, end: 0 });
      expect(run.teachingSteps.at(-1)?.eventRange.end).toBe(
        run.timeline.length,
      );
      for (let index = 1; index < run.teachingSteps.length; index++) {
        const previous = run.teachingSteps[index - 1];
        const step = run.teachingSteps[index];
        expect(step.schemaVersion).toBe("0.1");
        expect(step.index).toBe(index);
        expect(step.eventRange.start).toBe(previous.eventRange.end + 1);
        expect(step.eventRange.end).toBeGreaterThanOrEqual(
          step.eventRange.start,
        );
      }
    }
  });
});
