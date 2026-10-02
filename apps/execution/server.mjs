import { createServer } from "node:http";
import {
  secret,
  executionMode,
  executionAllowed,
  operationsPool,
  ExecutionStore,
  OperationsError,
  constantEqual,
  controls,
} from "@sim/operations";
import { PythonJobs } from "../../packages/isolated-runner/src/jobs.mjs";
import { DurableWorker } from "../../packages/isolated-runner/src/durable-worker.mjs";
import { runnerPreflight } from "../../packages/isolated-runner/src/preflight.mjs";
import { RunnerError } from "../../packages/isolated-runner/src/index.mjs";
const key = secret("PYTHON_ORCHESTRATOR_KEY");
const mode = executionMode();
const port = Number(process.env.PYTHON_ORCHESTRATOR_PORT ?? 3040);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("INVALID_RUNNER_PORT");
if (
  process.env.PYTHON_ORCHESTRATOR_BIND &&
  process.env.PYTHON_ORCHESTRATOR_BIND !== "127.0.0.1"
)
  throw new Error("RUNNER_LOOPBACK_REQUIRED");
if (mode === "public" && !process.env.DATABASE_URL)
  throw new Error("DURABLE_QUEUE_REQUIRED");
const store = process.env.DATABASE_URL ? new ExecutionStore() : null;
let preflight, worker;
if (store) {
  preflight = await runnerPreflight({
    profile:
      mode === "public"
        ? (process.env.RUNNER_PREFLIGHT_PROFILE ?? "production")
        : "local",
  });
  if (process.env.RUNNER_EXECUTION_ENABLED !== "false") {
    worker = new DurableWorker({
      store,
      image: preflight.image,
      runtimeId: preflight.runtimeId,
      allowGuest: executionAllowed(false),
      allowVerified: executionAllowed(true),
      onEvent: (event) => console.info(JSON.stringify(event)),
    });
    await worker.start();
  }
}
const local = store ? null : new PythonJobs();
const server = createServer(async (req, res) => {
  const reply = (status, data, retryAfter = 0) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...(retryAfter ? { "retry-after": String(retryAfter) } : {}),
    });
    res.end(JSON.stringify(data));
  };
  if (!constantEqual(req.headers.authorization, "Bearer " + key)) {
    reply(401, { code: "PYTHON_POLICY_REJECTED" });
    return;
  }
  try {
    if (req.method === "GET" && req.url === "/health") {
      reply(200, { ok: true });
      return;
    }
    if (req.method === "GET" && req.url === "/ready") {
      const flags = store ? await controls(store.pool) : {};
      const disabled =
        (!executionAllowed(false) && !executionAllowed(true)) ||
        process.env.RUNNER_EXECUTION_ENABLED === "false" ||
        flags.runner_paused ||
        flags.python_disabled;
      const ready = disabled || !store || !!worker?.ready();
      reply(ready ? 200 : 503, {
        status: disabled ? "disabled" : ready ? "ready" : "unavailable",
        queue: store ? "postgresql" : "local-memory",
        preflight: preflight?.ok ?? false,
      });
      return;
    }
    if (req.method === "GET" && req.url === "/metrics") {
      reply(200, store ? await store.metrics() : { mode: "local-memory" });
      return;
    }
    if (req.method === "POST" && req.url === "/jobs") {
      if (
        process.env.RUNNER_EXECUTION_ENABLED === "false" ||
        (store && !worker?.ready())
      ) {
        reply(503, { code: "PYTHON_DISABLED" });
        return;
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 32768) {
          reply(413, { code: "PYTHON_POLICY_REJECTED" });
          return;
        }
        chunks.push(chunk);
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!executionAllowed(payload.actor?.verified === true)) {
        reply(503, { code: "PYTHON_DISABLED" });
        return;
      }
      const result = store
        ? await store.submit(payload.request, payload.actor)
        : local.submit(payload.request);
      reply(202, result);
      return;
    }
    const id = /^\/jobs\/([a-f0-9-]{36})$/.exec(req.url ?? "")?.[1],
      capability = req.headers["x-job-capability"];
    if (
      id &&
      typeof capability === "string" &&
      ["GET", "DELETE"].includes(req.method)
    ) {
      const actor = {
        clientHash: req.headers["x-client-hash"],
        ipHash: req.headers["x-ip-hash"],
        ownerId: req.headers["x-owner-id"] || null,
        verified: req.headers["x-verified"] === "true",
      };
      const result = store
        ? await store.access(
            id,
            capability,
            actor,
            req.method === "DELETE" ? "cancel" : "poll",
          )
        : req.method === "DELETE"
          ? local.cancel(id, capability)
          : local.get(id, capability);
      reply(result ? 200 : 404, result ?? { code: "PYTHON_JOB_NOT_FOUND" });
      return;
    }
    reply(404, { code: "PYTHON_JOB_NOT_FOUND" });
  } catch (error) {
    const known =
      error instanceof OperationsError || error instanceof RunnerError;
    const code = known ? error.code : "PYTHON_INTERNAL_ERROR";
    reply(
      error instanceof OperationsError ? error.status : known ? 400 : 503,
      { code },
      error.retryAfter ?? 0,
    );
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.maxConnections = 64;
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});
console.info(
  JSON.stringify({
    event: "python-orchestrator-ready",
    port,
    mode,
    queue: store ? "postgresql" : "local-memory",
  }),
);
let stopping = false;
export async function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  await worker?.close();
  await local?.close();
  server.closeAllConnections();
  if (store) await operationsPool().end();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
