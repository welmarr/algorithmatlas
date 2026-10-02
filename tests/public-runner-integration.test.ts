import { randomUUID, randomBytes, createHash } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { ExecutionStore, setControl, queueConfig } from "@sim/operations";
import {
  dockerRunArguments,
  removeRunnerContainer,
  runPython,
} from "@sim/isolated-runner";
import { runnerPreflight } from "../packages/isolated-runner/src/preflight.mjs";
import { DurableWorker } from "../packages/isolated-runner/src/durable-worker.mjs";
import { testDatabase } from "./operations-helpers";
const suite =
  process.env.DB_TEST_URL && process.env.RUNNER_DOCKER_TEST === "1"
    ? describe
    : describe.skip;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
suite(
  "actual public runner profile, recovery and service authentication",
  () => {
    let db: Awaited<ReturnType<typeof testDatabase>>,
      child: ChildProcess | undefined,
      port: number;
    const key = randomBytes(32).toString("hex"),
      capabilityKey = randomBytes(32).toString("hex");
    const actor = {
      clientHash: sha("public-guest"),
      ipHash: sha("ip"),
      ownerId: null,
      verified: false,
      idempotencyKey: randomUUID(),
    };
    let image: string;
    beforeAll(async () => {
      db = await testDatabase("public");
      image = execFileSync(
        "docker",
        [
          "image",
          "inspect",
          "simulator-python-runner:0.1",
          "--format",
          "{{.Id}}",
        ],
        { encoding: "utf8", windowsHide: true },
      ).trim();
      const socket = createServer();
      await new Promise<void>((resolve) =>
        socket.listen(0, "127.0.0.1", resolve),
      );
      port = (socket.address() as { port: number }).port;
      await new Promise<void>((resolve) => socket.close(() => resolve()));
    }, 30000);
    afterAll(async () => {
      if (child && child.exitCode === null) {
        child.kill();
        await once(child, "exit");
      }
      await db?.close();
    });
    const env = () => ({
      ...process.env,
      DATABASE_URL: db.url,
      APP_URL: "http://localhost:3012",
      PUBLIC_PYTHON_EXECUTION_ENABLED: "true",
      PYTHON_GUEST_EXECUTION_ENABLED: "true",
      PYTHON_VERIFIED_EXECUTION_ENABLED: "true",
      RUNNER_PREFLIGHT_PROFILE: "test-production",
      PYTHON_ORCHESTRATOR_KEY: key,
      EXECUTION_CAPABILITY_KEY: capabilityKey,
      ABUSE_HASH_KEY: randomBytes(32).toString("hex"),
      PYTHON_RUNNER_IMAGE: image,
      PYTHON_ORCHESTRATOR_PORT: String(port),
    });
    it("proves configured kernel/runtime controls and refuses invalid public profiles", async () => {
      const result = await runnerPreflight({
        env: env(),
        profile: "test-production",
        pool: db.pool,
      });
      expect(result).toMatchObject({
        ok: true,
        cleanup: true,
        image,
        resourceLimits: {
          memoryBytes: 134217728,
          pids: 32,
          nanoCpus: 500000000,
        },
      });
      await expect(
        runnerPreflight({
          env: { ...env(), PYTHON_RUNNER_IMAGE: "python:latest" },
          profile: "test-production",
          pool: db.pool,
        }),
      ).rejects.toThrow("PINNED");
      if (process.platform !== "linux")
        await expect(
          runnerPreflight({ env: env(), profile: "production", pool: db.pool }),
        ).rejects.toThrow("LINUX");
    }, 30000);
    it("cleans a persisted orphan before releasing capacity and never reruns a started job", async () => {
      const store = new ExecutionStore({
        pool: db.pool,
        env: env(),
        config: queueConfig({}),
      });
      const job = await store.submit(
        {
          schemaVersion: "0.1",
          source: "def solve(data): return 1",
          input: {},
        },
        actor,
      );
      await db.pool.query(
        "UPDATE execution_jobs SET status='running',attempt_count=1 WHERE id=$1",
        [job.id],
      );
      const name = "simulator-python-runner-" + job.id;
      execFileSync("docker", dockerRunArguments(name, image), {
        stdio: "pipe",
        windowsHide: true,
      });
      const worker = new DurableWorker({
        store,
        runtimeId: "recovery-test",
        image,
      });
      try {
        await worker.start();
        expect(await store.access(job.id, job.capability, actor)).toMatchObject(
          { status: "failed", code: "PYTHON_INTERRUPTED" },
        );
        expect(
          execFileSync(
            "docker",
            ["ps", "-aq", "--filter", "name=^" + name + "$"],
            { encoding: "utf8" },
          ).trim(),
        ).toBe("");
        expect(
          (
            await db.pool.query(
              "SELECT attempt_count FROM execution_jobs WHERE id=$1",
              [job.id],
            )
          ).rows[0].attempt_count,
        ).toBe(1);
      } finally {
        await worker.close();
        await removeRunnerContainer(name);
      }
      await db.pool.query("TRUNCATE execution_jobs,runner_runtime,rate_limits");
    }, 20000);
    it("authenticates every internal route, persists execution and checks capabilities/ownership", async () => {
      child = spawn(process.execPath, ["apps/execution/server.mjs"], {
        env: env(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let startup = "";
      child.stdout!.on("data", (data) => {
        startup += String(data).slice(0, 2048);
      });
      child.stderr!.on("data", () => {});
      await expect
        .poll(() => startup.includes("python-orchestrator-ready"), {
          timeout: 30000,
          interval: 200,
        })
        .toBe(true);
      const base = "http://127.0.0.1:" + port;
      for (const route of ["/health", "/ready", "/metrics", "/jobs"])
        expect((await fetch(base + route)).status).toBe(401);
      const headers = {
        authorization: "Bearer " + key,
        "content-type": "application/json",
      };
      expect((await fetch(base + "/ready", { headers })).status).toBe(200);
      const body = JSON.stringify({
        request: {
          schemaVersion: "0.1",
          source: "def solve(data): return sum(data)",
          input: [1, 2, 3],
        },
        actor,
      });
      const first = await fetch(base + "/jobs", {
        method: "POST",
        headers,
        body,
      });
      expect(first.status).toBe(202);
      const job = (await first.json()) as { id: string; capability: string };
      const duplicate = await (
        await fetch(base + "/jobs", { method: "POST", headers, body })
      ).json();
      expect(duplicate.id).toBe(job.id);
      const pollHeaders = {
        ...headers,
        "x-job-capability": job.capability,
        "x-client-hash": actor.clientHash,
        "x-ip-hash": actor.ipHash,
      };
      expect((await fetch(base + "/jobs/" + job.id, { headers })).status).toBe(
        404,
      );
      expect(
        (
          await fetch(base + "/jobs/" + job.id, {
            headers: { ...pollHeaders, "x-job-capability": "x".repeat(43) },
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await fetch(base + "/jobs/" + job.id, {
            headers: { ...pollHeaders, "x-client-hash": sha("other-account") },
          })
        ).status,
      ).toBe(404);
      await expect
        .poll(
          async () =>
            await (
              await fetch(base + "/jobs/" + job.id, { headers: pollHeaders })
            ).json(),
          { timeout: 15000, interval: 200 },
        )
        .toMatchObject({ status: "completed", result: { output: 6 } });
      await setControl("python_disabled", true, db.pool);
      expect(
        await (await fetch(base + "/ready", { headers })).json(),
      ).toMatchObject({ status: "disabled" });
      expect(
        (await fetch(base + "/jobs", { method: "POST", headers, body })).status,
      ).toBe(503);
      const metrics = await (
        await fetch(base + "/metrics", { headers })
      ).json();
      expect(metrics.counters.completed).toBeGreaterThan(0);
      expect(metrics.states.completed).toBe(1);
    }, 60000);
    it("enforces CPU/wall budgets for a heavy builtin and removes its container", async () => {
      const id = randomUUID();
      await expect(
        runPython(
          {
            source: "def solve(data): return sum(range(1000000000))",
            input: {},
          },
          { runId: id, image },
        ),
      ).rejects.toMatchObject({ code: "PYTHON_TIMEOUT" });
      expect(
        execFileSync(
          "docker",
          [
            "ps",
            "-aq",
            "--filter",
            "name=^simulator-python-runner-" + id + "$",
          ],
          { encoding: "utf8" },
        ).trim(),
      ).toBe("");
    }, 15000);
  },
);
