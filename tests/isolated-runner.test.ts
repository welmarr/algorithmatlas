import { describe, expect, it } from "vitest";
import {
  dockerRunArguments,
  validateRunnerRequest,
} from "@sim/isolated-runner";

describe("local Python runner boundary", () => {
  it("constructs a networkless, bounded, unprivileged container without mounts or ports", () => {
    const args = dockerRunArguments(
      "simulator-python-runner-12345678-1234-1234-1234-123456789abc",
    );
    expect(args[0]).toBe("create"); // Explicit cleanup completes before the run resolves.
    expect(args).toContain("--read-only");
    expect(args).toContain("none");
    expect(args).toContain("--memory");
    expect(args).toContain("--cpus");
    expect(args).toContain("--pids-limit");
    expect(args).toContain("no-new-privileges:true");
    expect(args).not.toContain("-v");
    expect(args).not.toContain("--volume");
    expect(args).not.toContain("-p");
    expect(args).not.toContain("--publish");
    expect(args.at(-1)).toBe("simulator-python-runner:0.1");
  });

  it("rejects oversized or invalid submissions before Docker starts", () => {
    expect(() => validateRunnerRequest({ source: "", input: [] })).toThrow();
    expect(() =>
      validateRunnerRequest({ source: "x".repeat(4097), input: [] }),
    ).toThrow();
    expect(() =>
      validateRunnerRequest({
        source: "def solve(data): return data",
        input: "x".repeat(17000),
      }),
    ).toThrow();
    expect(() => dockerRunArguments("other-container")).toThrow();
  });
});
