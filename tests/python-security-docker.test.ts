import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { runPython } from "@sim/isolated-runner";
const dockerIt = process.env.RUNNER_DOCKER_TEST === "1" ? it : it.skip;
dockerIt(
  "returns structured errors for policy, runtime and bounded-resource failures",
  async () => {
    const cases = [
      ["def solve(:", "PYTHON_SYNTAX_ERROR"],
      ["def solve(data): return 1/0", "PYTHON_RUNTIME_ERROR"],
      [
        "def solve(data): return open('/etc/passwd').read()",
        "PYTHON_POLICY_REJECTED",
      ],
      [
        "def solve(data): return open('/tmp/probe','w').write('test')",
        "PYTHON_POLICY_REJECTED",
      ],
      [
        "import socket\ndef solve(data): return socket.socket()",
        "PYTHON_POLICY_REJECTED",
      ],
      [
        "import subprocess\ndef solve(data): return subprocess.run(['echo','test'])",
        "PYTHON_POLICY_REJECTED",
      ],
      [
        "import os\ndef solve(data): return os.getcwd()",
        "PYTHON_POLICY_REJECTED",
      ],
      ["def solve(data): return (1).__class__", "PYTHON_POLICY_REJECTED"],
      [
        "def solve(data):\n    print('x'*9000)\n    return 0",
        "PYTHON_OUTPUT_LIMIT",
      ],
      ["def solve(data):\n    while True:\n        pass", "PYTHON_TRACE_LIMIT"],
      ["def solve(data): return [0]*30000000", "PYTHON_MEMORY_LIMIT"],
    ];
    for (const [source, code] of cases) {
      const result = await runPython({ source, input: {} });
      expect(result.code, source).toBe(code);
    }
  },
  60000,
);
dockerIt(
  "cancellation and wall timeout remove their containers before resolving",
  async () => {
    const timeoutId = randomUUID(),
      cancelId = randomUUID();
    const source =
      "def solve(data):\n    try:\n        while True:\n            pass\n    except Exception:\n        while True:\n            pass";
    await expect(
      runPython({ source, input: {} }, { timeoutMs: 300, runId: timeoutId }),
    ).rejects.toMatchObject({ code: "PYTHON_TIMEOUT" });
    const controller = new AbortController();
    const pending = runPython(
      { source, input: {} },
      { signal: controller.signal, runId: cancelId },
    ).catch((error) => error);
    try {
      let configuration:
        | {
            Config: { User: string };
            HostConfig: {
              ReadonlyRootfs: boolean;
              Memory: number;
              MemorySwap: number;
              PidsLimit: number;
              CapDrop: string[];
              SecurityOpt: string[];
              NetworkMode: string;
              Binds: unknown;
              Tmpfs: Record<string, string>;
            };
          }
        | undefined;
      await expect
        .poll(
          () => {
            try {
              configuration = JSON.parse(
                execFileSync(
                  "docker",
                  ["inspect", `simulator-python-runner-${cancelId}`],
                  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
                ),
              )[0];
              return !!configuration;
            } catch {
              return false;
            }
          },
          { interval: 100, timeout: 3000 },
        )
        .toBe(true);
      expect(configuration!.Config.User).toBe("65534:65534");
      expect(configuration!.HostConfig).toMatchObject({
        ReadonlyRootfs: true,
        Memory: 134217728,
        MemorySwap: 134217728,
        PidsLimit: 32,
        NetworkMode: "none",
        Binds: null,
      });
      expect(configuration!.HostConfig.CapDrop).toContain("ALL");
      expect(configuration!.HostConfig.SecurityOpt).toContain(
        "no-new-privileges:true",
      );
      expect(configuration!.HostConfig.Tmpfs["/tmp"]).toContain("size=8m");
    } finally {
      controller.abort();
    }
    expect(await pending).toMatchObject({ code: "PYTHON_CANCELLED" });
    for (const id of [timeoutId, cancelId])
      expect(
        execFileSync(
          "docker",
          ["ps", "-aq", "--filter", `name=simulator-python-runner-${id}`],
          { encoding: "utf8" },
        ).trim(),
      ).toBe("");
  },
  20000,
);
