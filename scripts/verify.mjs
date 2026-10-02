import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const full = process.argv[2] === "full";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(label, args, extraEnv = {}, command = pnpm) {
  process.stdout.write(`\n▶ ${label}\n`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (full) {
  if (
    !process.env.DATABASE_URL ||
    !process.env.MAILPIT_API ||
    !process.env.SMTP_HOST
  )
    throw new Error(
      "verify:full requires DATABASE_URL, SMTP_HOST/PORT and MAILPIT_API. Use pnpm verify:isolated for disposable services.",
    );
  process.env.E2E_PORT ??= "3012";
  process.env.APP_URL = `http://localhost:${process.env.E2E_PORT}`;
  process.env.EMAIL_TRANSPORT = "mailpit";
  process.env.PYTHON_EXECUTION_ENABLED = "local";
  process.env.PYTHON_ORCHESTRATOR_KEY = randomBytes(32).toString("hex");
  process.env.PYTHON_ORCHESTRATOR_PORT ??= "3041";
  process.env.PYTHON_ORCHESTRATOR_URL = `http://127.0.0.1:${process.env.PYTHON_ORCHESTRATOR_PORT}`;
  run("PostgreSQL migrations", ["db:migrate"]);
  run("Python runner image", ["runner:build"]);
}
for (const command of ["format:check", "lint", "typecheck", "test", "build"]) {
  run(
    command,
    [command],
    full
      ? {
          DB_TEST_URL: process.env.DATABASE_URL,
          RUNNER_DOCKER_TEST: "1",
        }
      : {},
  );
}
if (full) {
  run("production dependency audit", ["audit", "--prod", "--audit-level=low"]);
  run("all dependency audit", ["audit", "--audit-level=low"]);
  run("browser regression", ["test:e2e"], {
    E2E_DATABASE_URL: process.env.DATABASE_URL,
    E2E_PORT: process.env.E2E_PORT ?? "3012",
  });
  run(
    "web Docker build",
    [
      "build",
      ...(process.env.DOCKER_NO_CACHE === "1" ? ["--no-cache"] : []),
      "-t",
      "simulator-web:verified",
      ".",
    ],
    {},
    "docker",
  );
}
process.stdout.write(`\n${full ? "Full" : "Fast"} verification passed.\n`);
