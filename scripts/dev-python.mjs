import { existsSync } from "node:fs";
import { ensureLocalSecrets } from "./local-secrets.mjs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
process.env.PYTHON_EXECUTION_ENABLED = "local";
ensureLocalSecrets();
process.env.PYTHON_ORCHESTRATOR_PORT ??= "3040";
process.env.PYTHON_ORCHESTRATOR_URL = `http://127.0.0.1:${process.env.PYTHON_ORCHESTRATOR_PORT}`;
const mail =
  process.env.DATABASE_URL && process.env.SMTP_HOST
    ? spawn(process.execPath, ["apps/email/worker.mjs"], {
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
      })
    : null;
const { stop } = await import("../apps/execution/server.mjs");
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "-p",
    process.env.PORT ?? "3000",
  ],
  {
    cwd: new URL("../apps/web", import.meta.url),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  },
);
child.on("error", async () => {
  mail?.kill();
  await stop();
  process.exitCode = 1;
});
child.on("exit", async (code) => {
  mail?.kill();
  await stop();
  process.exitCode = code ?? 0;
});
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
