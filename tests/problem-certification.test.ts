import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_IN_RENDERER_KINDS } from "@sim/domain";
import { problems } from "@sim/problems";
import { createChoreography, strategyFor } from "@sim/visual-choreography";
import { validateTeachingMapping } from "@sim/problem-sdk";
import { certificationEvidence } from "../packages/problems/src/certification";

interface Status {
  problemId: string;
  sourceId: string;
  title: string;
  category: string;
  algorithm: string;
  renderer: string;
  choreography: string;
  status: "CERTIFIED" | "PARTIAL" | "FAILED";
  reasons: string[];
}

function audit(): Status[] {
  const seenIds = new Set<string>();
  const seenSourceIds = new Set<string>();
  return problems.map((problem) => {
    const metadata = problem.metadata;
    const evidence = certificationEvidence[metadata.id];
    const sourceId =
      metadata.source.url?.match(
        /^https:\/\/cses\.fi\/problemset\/task\/(\d+)$/,
      )?.[1] ?? "";
    const reasons: string[] = [];
    if (!metadata.id || seenIds.has(metadata.id))
      reasons.push("duplicate or missing problem ID");
    if (!sourceId || seenSourceIds.has(sourceId))
      reasons.push("duplicate or invalid official CSES ID");
    seenIds.add(metadata.id);
    seenSourceIds.add(sourceId);
    if (
      !metadata.title ||
      !metadata.summary ||
      !metadata.category ||
      !metadata.tags.length
    )
      reasons.push("missing metadata");
    if (
      !metadata.learning.intuition ||
      !metadata.learning.explanation ||
      !metadata.learning.approach.length
    )
      reasons.push("missing learning explanation");
    if (!metadata.complexity.time || !metadata.complexity.space)
      reasons.push("missing complexity explanation");
    if (!metadata.examples.length) reasons.push("missing example fixture");
    if (!problem.source.trim()) reasons.push("missing reference algorithm");
    if (
      !BUILT_IN_RENDERER_KINDS.includes(
        metadata.renderer as (typeof BUILT_IN_RENDERER_KINDS)[number],
      )
    )
      reasons.push("unsupported renderer capability");
    if (evidence && evidence.sourceId !== sourceId)
      reasons.push("certificate source ID mismatch");
    if (
      evidence &&
      evidence.strategy !== strategyFor(metadata.tags, metadata.renderer)
    )
      reasons.push("certificate choreography mismatch");
    for (const ref of [
      evidence?.oracle,
      evidence?.edgeCases,
      evidence?.browser,
    ])
      if (ref && !existsSync(ref.split(":")[0]))
        reasons.push("missing test evidence: " + ref);
    let run: ReturnType<typeof problem.run> | undefined;
    try {
      run = problem.run(problem.defaultInput);
      const again = problem.run(problem.defaultInput);
      if (!run.events.length || !run.teachingSteps.length)
        reasons.push("missing trace or Teaching Steps");
      if (JSON.stringify(run.events) !== JSON.stringify(again.events))
        reasons.push("nondeterministic trace");
      if (
        JSON.stringify(run.teachingSteps) !==
        JSON.stringify(again.teachingSteps)
      )
        reasons.push("nondeterministic Teaching Steps");
      if (run.output !== again.output) reasons.push("nondeterministic result");
      validateTeachingMapping(run.teachingSteps, run.timeline);
      const end = run.timeline.stateAt(run.timeline.length);
      const replay = run.timeline.rewind();
      for (let i = 0; i < run.timeline.length; i++) run.timeline.next();
      if (JSON.stringify(run.timeline.state) !== JSON.stringify(end))
        reasons.push("replay final state mismatch");
      if (!replay || !end) reasons.push("invalid replay state");
      for (const step of run.teachingSteps) {
        const plan = createChoreography(
          run.timeline,
          metadata.renderer,
          metadata.tags,
          step,
        );
        if (plan.strategy !== evidence?.strategy)
          reasons.push("invalid visualization strategy");
      }
      const example = JSON.parse(metadata.examples[0].input);
      if (!problem.run(example).output)
        reasons.push("example produced no output");
      try {
        problem.run({});
        reasons.push("unbounded or missing custom-input parser");
      } catch {
        // Invalid empty input is rejected as required.
      }
      again.timeline.dispose();
    } catch (error) {
      reasons.push(
        "runtime validation failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      run?.timeline.dispose();
    }
    return {
      problemId: metadata.id,
      sourceId,
      title: metadata.title,
      category: metadata.category,
      algorithm: evidence?.algorithm ?? "",
      renderer: metadata.renderer,
      choreography: evidence?.strategy ?? "",
      status: reasons.length ? "FAILED" : evidence ? "CERTIFIED" : "PARTIAL",
      reasons,
    };
  });
}

function counts(
  statuses: Status[],
  key: "category" | "algorithm" | "renderer" | "choreography",
) {
  return Object.fromEntries(
    [...new Set(statuses.map((item) => item[key]))]
      .filter(Boolean)
      .sort()
      .map((value) => [
        value,
        statuses.filter(
          (item) => item[key] === value && item.status === "CERTIFIED",
        ).length,
      ]),
  );
}

describe("CSES problem certification", () => {
  it("checks every registered entry and emits machine-readable evidence", () => {
    const statuses = audit();
    const certified = statuses.filter((item) => item.status === "CERTIFIED");
    const report = {
      uniqueRegistered: new Set(statuses.map((item) => item.sourceId)).size,
      certified: certified.length,
      partial: statuses.filter((item) => item.status === "PARTIAL").length,
      target: 100,
      byCategory: counts(statuses, "category"),
      byAlgorithm: counts(statuses, "algorithm"),
      byRenderer: counts(statuses, "renderer"),
      byChoreography: counts(statuses, "choreography"),
      certifiedIds: certified
        .map((item) => item.sourceId)
        .sort((a, b) => Number(a) - Number(b)),
      failed: statuses.filter((item) => item.status === "FAILED"),
      entries: statuses,
    };
    const artifactDir = join("artifacts", "problem-certificates");
    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(
      join(artifactDir, "status.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    for (const item of certified)
      writeFileSync(
        join(artifactDir, item.problemId + ".json"),
        JSON.stringify(
          {
            source: "CSES",
            problemId: item.problemId,
            sourceId: item.sourceId,
            status: item.status,
            algorithm: item.algorithm,
            renderer: item.renderer,
            choreography: item.choreography,
            oracle: certificationEvidence[item.problemId].oracle,
            edgeCases: certificationEvidence[item.problemId].edgeCases,
            browser: certificationEvidence[item.problemId].browser,
            deterministicReplay: true,
            customInput: true,
          },
          null,
          2,
        ) + "\n",
      );
    console.info("CSES status:", JSON.stringify(report));
    expect(statuses).toHaveLength(problems.length);
    expect(report.failed).toEqual([]);
    if (process.env.PROBLEMS_MODE === "release")
      expect(certified.length, "CSES 100 release gate").toBeGreaterThanOrEqual(
        100,
      );
  });

  it("matches a seeded independent oracle for Increasing Array", () => {
    const problem = problems.find(
      (item) => item.metadata.id === "increasing-array",
    )!;
    let seed = 1094;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let trial = 0; trial < 200; trial++) {
      const values = Array.from(
        { length: 1 + Math.floor(random() * 14) },
        () => Math.floor(random() * 31) - 15,
      );
      let required = values[0],
        moves = 0;
      for (const value of values.slice(1)) {
        if (value < required) moves += required - value;
        else required = value;
      }
      expect(problem.run({ values }).output).toBe(String(moves));
    }
  });
});
