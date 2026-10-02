import { spawnSync } from "node:child_process";

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
  if (!process.env.DATABASE_URL)
    throw new Error(
      "verify:full requires DATABASE_URL for its PostgreSQL integration tests",
    );
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
  run("browser regression", ["test:e2e"], {
    E2E_DATABASE_URL: process.env.DATABASE_URL,
    E2E_PORT: process.env.E2E_PORT ?? "3012",
  });
  run(
    "web Docker build",
    ["build", "-t", "simulator-web:verified", "."],
    {},
    "docker",
  );
}
process.stdout.write(`\n${full ? "Full" : "Fast"} verification passed.\n`);
