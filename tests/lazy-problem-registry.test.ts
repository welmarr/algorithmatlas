import { describe, expect, it } from "vitest";
import { problems } from "@sim/problems";
import { lazyProblemIds, loadProblem } from "@sim/problems/lazy";

describe("selected-runner registry", () => {
  it("maps every unique catalog entry to exactly one lazy family module", async () => {
    const eagerIds = problems.map((problem) => problem.metadata.id);
    expect(lazyProblemIds).toHaveLength(eagerIds.length);
    expect(new Set(lazyProblemIds).size).toBe(eagerIds.length);
    expect([...lazyProblemIds].sort()).toEqual([...eagerIds].sort());
    for (const id of eagerIds) {
      const selected = await loadProblem(id);
      expect(selected?.metadata.id, id).toBe(id);
      expect(selected?.metadata.source.url, id).toBe(
        problems.find((problem) => problem.metadata.id === id)?.metadata.source
          .url,
      );
    }
    expect(await loadProblem("unknown-cses-id")).toBeUndefined();
  });
});
