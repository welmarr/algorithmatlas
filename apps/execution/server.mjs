import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { PythonJobs } from "../../packages/isolated-runner/src/jobs.mjs";
import {
  RunnerError,
  MAX_REQUEST_BYTES,
} from "../../packages/isolated-runner/src/index.mjs";
const secret = process.env.PYTHON_ORCHESTRATOR_KEY;
if (!secret || !/^[a-f0-9]{64}$/.test(secret))
  throw new Error("Configure a random 32-byte hex PYTHON_ORCHESTRATOR_KEY");
const port = Number(process.env.PYTHON_ORCHESTRATOR_PORT ?? 3040);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid orchestrator port");
const jobs = new PythonJobs({
  concurrency: Number(process.env.PYTHON_CONCURRENCY ?? 2),
  queueSize: Number(process.env.PYTHON_QUEUE_SIZE ?? 8),
  onFinished: (event) =>
    console.info(JSON.stringify({ category: "python-execution", ...event })),
});
const server = createServer(async (req, res) => {
  const reply = (status, data) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  const bearer = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  if (
    !/^[a-f0-9]{64}$/.test(bearer) ||
    !timingSafeEqual(Buffer.from(bearer, "hex"), Buffer.from(secret, "hex"))
  ) {
    reply(401, { code: "PYTHON_POLICY_REJECTED" });
    return;
  }
  try {
    if (req.method === "GET" && req.url === "/health") {
      reply(200, { ok: true, mode: "local" });
      return;
    }
    if (req.method === "POST" && req.url === "/jobs") {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_REQUEST_BYTES) {
          reply(413, { code: "PYTHON_POLICY_REJECTED" });
          return;
        }
        chunks.push(chunk);
      }
      const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      reply(202, jobs.submit(request));
      return;
    }
    const id = /^\/jobs\/([a-f0-9-]{36})$/.exec(req.url ?? "")?.[1];
    const capability = req.headers["x-job-capability"];
    if (
      id &&
      typeof capability === "string" &&
      ["GET", "DELETE"].includes(req.method)
    ) {
      const view =
        req.method === "GET"
          ? jobs.get(id, capability)
          : jobs.cancel(id, capability);
      reply(view ? 200 : 404, view ?? { code: "PYTHON_JOB_NOT_FOUND" });
      return;
    }
    reply(404, { code: "PYTHON_JOB_NOT_FOUND" });
  } catch (error) {
    const code =
      error instanceof RunnerError ? error.code : "PYTHON_POLICY_REJECTED";
    reply(
      ["PYTHON_QUEUE_FULL", "PYTHON_RATE_LIMITED"].includes(code) ? 429 : 400,
      { code },
    );
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.maxConnections = 32;
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});
console.info(
  JSON.stringify({ event: "python-orchestrator-ready", port, mode: "local" }),
);
let stopping = false;
export async function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  await jobs.close();
  server.closeAllConnections();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
