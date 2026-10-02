import { createServer } from "node:http";
import { EmailWorker, operationsPool, integer } from "@sim/operations";
const worker = await new EmailWorker().start();
let server;
if (process.env.EMAIL_WORKER_HEALTH_PORT) {
  const port = integer(
    process.env,
    "EMAIL_WORKER_HEALTH_PORT",
    3042,
    1024,
    65535,
  );
  server = createServer(async (req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }
    try {
      const health = await worker.store.health();
      res
        .writeHead(health.ready ? 200 : 503, {
          "content-type": "application/json",
          "cache-control": "no-store",
        })
        .end(JSON.stringify(health));
    } catch {
      res.writeHead(503).end('{"status":"unavailable"}');
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}
console.info(JSON.stringify({ event: "email-worker-ready" }));
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  server?.close();
  await worker.close();
  await operationsPool().end();
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
