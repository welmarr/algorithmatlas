import { describe, expect, it } from "vitest";
import { runPython } from "@sim/isolated-runner";

const dockerIt = process.env.RUNNER_DOCKER_TEST === "1" ? it : it.skip;

describe("local Docker Python runner", () => {
  dockerIt(
    "executes user code and emits input-dependent source traces",
    async () => {
      const result = await runPython({
        source:
          "def solve(data):\n    total = 0\n    for value in data['values']:\n        total += value\n    return total",
        input: { values: [8, 2, 5, 1, 7] },
      });
      expect(result.status).toBe("ok");
      expect(result.output).toBe(23);
      expect(result.rawTrace.some((event) => event.sourceRef.line === 4)).toBe(
        true,
      );
      expect(
        result.rawTrace.some((event) => event.data.changes.includes('"total"')),
      ).toBe(true);
    },
    10000,
  );

  dockerIt(
    "blocks imports outside the educational allowlist",
    async () => {
      const result = await runPython({
        source: "import socket\ndef solve(data):\n    return 1",
        input: {},
      });
      expect(result.status).toBe("error");
      expect(result.error).toContain("ImportError");
    },
    10000,
  );

  dockerIt(
    "bounds an infinite loop through the trace limit",
    async () => {
      const result = await runPython(
        {
          source: "def solve(data):\n    while True:\n        pass",
          input: {},
        },
        { timeoutMs: 3000 },
      );
      expect(result.status).toBe("limit");
      expect(result.error).toContain("Trace exceeded");
    },
    10000,
  );

  dockerIt(
    "forces container cleanup if user code catches the trace exception",
    async () => {
      await expect(
        runPython(
          {
            source:
              "def solve(data):\n    try:\n        while True:\n            pass\n    except Exception:\n        while True:\n            pass",
            input: {},
          },
          { timeoutMs: 3000 },
        ),
      ).rejects.toThrow();
    },
    10000,
  );
});
