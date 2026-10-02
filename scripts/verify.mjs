import { spawnSync, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const mode = process.argv[2] ?? "fast";
const full = mode === "full";
const serviceGate = ["full", "public-runner", "prod-ops", "capture"].includes(
  mode,
);
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

if (serviceGate) {
  if (
    !process.env.DATABASE_URL ||
    !process.env.MAILPIT_API ||
    !process.env.SMTP_HOST
  )
    throw new Error(
      "verify:full requires DATABASE_URL, SMTP_HOST/PORT and MAILPIT_API. Use pnpm verify:isolated for disposable services.",
    );
  process.env.EMAIL_WORKER_HEALTH_PORT ??= "3042";
  process.env.E2E_PORT ??= "3012";
  process.env.APP_URL = `http://localhost:${process.env.E2E_PORT}`;
  process.env.EMAIL_TRANSPORT = "mailpit";
  process.env.PYTHON_EXECUTION_ENABLED = "local";
  process.env.PYTHON_ORCHESTRATOR_KEY = randomBytes(32).toString("hex");
  process.env.EXECUTION_CAPABILITY_KEY = randomBytes(32).toString("hex");
  process.env.ABUSE_HASH_KEY = randomBytes(32).toString("hex");
  process.env.EMAIL_OUTBOX_KEY = randomBytes(32).toString("hex");
  process.env.PUBLIC_PYTHON_EXECUTION_ENABLED = "true";
  process.env.PYTHON_GUEST_EXECUTION_ENABLED = "true";
  process.env.PYTHON_VERIFIED_EXECUTION_ENABLED = "true";
  process.env.RUNNER_PREFLIGHT_PROFILE = "test-production";
  process.env.DB_TEST_URL = process.env.DATABASE_URL;
  process.env.RUNNER_DOCKER_TEST = "1";
  process.env.PYTHON_ORCHESTRATOR_PORT ??= "3041";
  process.env.PYTHON_ORCHESTRATOR_URL = `http://127.0.0.1:${process.env.PYTHON_ORCHESTRATOR_PORT}`;
  run("PostgreSQL migrations", ["db:migrate"]);
  if (process.env.DOCKER_NO_CACHE === "1")
    run(
      "Python runner image (no cache)",
      [
        "build",
        "--no-cache",
        "-t",
        "simulator-python-runner:0.1",
        "runner/python",
      ],
      {},
      "docker",
    );
  else run("Python runner image", ["runner:build"]);
  process.env.PYTHON_RUNNER_IMAGE = execFileSync(
    "docker",
    ["image", "inspect", "simulator-python-runner:0.1", "--format", "{{.Id}}"],
    { encoding: "utf8", windowsHide: true },
  ).trim();
}
if (mode === "public-runner") {
  run("public runner preflight", ["runner:preflight"]);
  run("public runner release tests", [
    "exec",
    "vitest",
    "run",
    "tests/operations-policy.test.ts",
    "tests/execution-queue-db.test.ts",
    "tests/public-runner-integration.test.ts",
    "tests/isolated-runner.test.ts",
    "tests/isolated-runner-docker.test.ts",
    "tests/python-security-docker.test.ts",
    "tests/python-jobs.test.ts",
  ]);
  console.info(
    "Public runner verification passed (loopback test-production profile).",
  );
  process.exit(0);
}
if (mode === "prod-ops") {
  run("production operations release tests", [
    "exec",
    "vitest",
    "run",
    "tests/operations-policy.test.ts",
    "tests/email-operations.test.ts",
    "tests/backup-retention.test.ts",
    "tests/auth-db.test.ts",
    "tests/persistence-db.test.ts",
  ]);
  run("production web build", ["build"]);
  run(
    "account and readiness browser flows",
    [
      "exec",
      "playwright",
      "test",
      "tests/e2e/account.spec.ts",
      "tests/e2e/auth-security.spec.ts",
      "tests/e2e/account-settings.spec.ts",
      "tests/e2e/health.spec.ts",
    ],
    { E2E_DATABASE_URL: process.env.DATABASE_URL },
  );
  console.info("Production operations verification passed.");
  process.exit(0);
}
if (mode === "capture") {
  if (process.env.DISPOSABLE_VERIFICATION !== "1")
    throw new Error("Capture requires verify-isolated provisioned services");
  const output = resolve(
    "artifacts",
    "visual-audit",
    new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replace(/\.\d{3}Z$/, "Z"),
  );
  run("capture domain verification", [
    "exec",
    "vitest",
    "run",
    "tests/representative-problems.test.ts",
    "tests/choreography.test.ts",
  ]);
  run("tested production capture build", ["build"]);
  run(
    "real application visual capture",
    ["exec", "playwright", "test", "--config=playwright.capture.config.ts"],
    {
      E2E_DATABASE_URL: process.env.DATABASE_URL,
      VISUAL_CAPTURE_DISPOSABLE: "1",
      VISUAL_AUDIT_DIR: output,
    },
  );
  run(
    "contact sheets, gallery and ZIP",
    ["scripts/package-visual-audit.mjs", output],
    {},
    process.execPath,
  );
  process.exit(0);
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
