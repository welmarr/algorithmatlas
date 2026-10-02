import { describe, expect, it } from "vitest";
import { runPython } from "@sim/isolated-runner";
import { interpretPythonTrace } from "@sim/semantic-interpreter";

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
    "maps edited Increasing Array code and [8,2,5,1,7] into four actual writes",
    async () => {
      const source =
        "def solve(data):\n    values = data['values']\n    for i in range(1, len(values)):\n        if values[i] < values[i-1]:\n            values[i] = values[i-1]\n    return values";
      const input = { values: [8, 2, 5, 1, 7] };
      const result = await runPython({ source, input });
      expect(result.status).toBe("ok");
      expect(result.output).toEqual([8, 8, 8, 8, 8]);
      const interpretation = interpretPythonTrace({
        source,
        input,
        output: result.output,
        rawTrace: result.rawTrace,
      });
      expect(
        interpretation.events.filter((event) => event.type === "WRITE_INDEX"),
      ).toHaveLength(4);
      expect(interpretation.teachingSteps).toHaveLength(6);
      const last = interpretation.timeline.seek(interpretation.timeline.length);
      expect(
        [0, 1, 2, 3, 4].map((index) => last.entities[`array:${index}`].value),
      ).toEqual([8, 8, 8, 8, 8]);
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
    "bounds output and rejects malformed or host-accessing code",
    async () => {
      const output = await runPython({
        source: "def solve(data):\n    print('x' * 9000)\n    return 1",
        input: {},
      });
      expect(output.status).toBe("limit");
      const file = await runPython({
        source: "def solve(data):\n    return open('/etc/passwd').read()",
        input: {},
      });
      expect(file.status).toBe("error");
      expect(file.error).toContain("NameError");
      const process = await runPython({
        source: "import subprocess\ndef solve(data):\n    return 1",
        input: {},
      });
      expect(process.status).toBe("error");
      expect(process.error).toContain("ImportError");
      const malformed = await runPython({ source: "def solve(:", input: {} });
      expect(malformed.status).toBe("error");
      expect(malformed.error).toContain("SyntaxError");
    },
    15000,
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
    "contains memory pressure inside the container limit",
    async () => {
      let outcome = "rejected";
      try {
        const result = await runPython(
          {
            source:
              "def solve(data):\n    values = [0] * 30000000\n    return len(values)",
            input: {},
          },
          { timeoutMs: 3000 },
        );
        outcome = result.status;
      } catch {
        // An OOM-killed container or host timeout rejects at the runner boundary.
      }
      expect(outcome).not.toBe("ok");
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
