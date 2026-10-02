import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
const prefix = "atlas-verify-" + randomBytes(5).toString("hex");
const names = [prefix + "-db", prefix + "-mail"];
const password = randomBytes(24).toString("hex");
async function port() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}
const [dbPort, smtpPort, mailPort, webPort, runnerPort] = await Promise.all(
  Array.from({ length: 5 }, port),
);
function docker(args, required = true) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  if (required && result.status !== 0)
    throw new Error("Disposable Docker service command failed");
  return result;
}
try {
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    names[0],
    "--label",
    "com.algorithmatlas.scope=isolated-verification",
    "-e",
    "POSTGRES_USER=simulator",
    "-e",
    "POSTGRES_PASSWORD=" + password,
    "-e",
    "POSTGRES_DB=simulator",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,uid=70,gid=70,size=256m",
    "-p",
    `127.0.0.1:${dbPort}:5432`,
    "postgres:16-alpine",
  ]);
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    names[1],
    "--label",
    "com.algorithmatlas.scope=isolated-verification",
    "-p",
    `127.0.0.1:${smtpPort}:1025`,
    "-p",
    `127.0.0.1:${mailPort}:8025`,
    "axllent/mailpit:v1.27.8",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (
      docker(
        ["exec", names[0], "pg_isready", "-U", "simulator", "-d", "simulator"],
        false,
      ).status === 0
    ) {
      try {
        const res = await fetch(`http://127.0.0.1:${mailPort}/api/v1/messages`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Mail service starting. */
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Disposable test services did not become ready");
  const env = {
    ...process.env,
    DATABASE_URL: `postgres://simulator:${password}@127.0.0.1:${dbPort}/simulator`,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtpPort),
    MAILPIT_API: `http://127.0.0.1:${mailPort}`,
    E2E_PORT: String(webPort),
    PYTHON_ORCHESTRATOR_PORT: String(runnerPort),
    E2E_PRODUCTION: "1",
    PERF_BROWSER: "1",
  };
  for (const name of [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "AI_ENDPOINT",
    "MODEL_ENDPOINT",
  ])
    delete env[name];
  console.info(
    "Fresh disposable PostgreSQL and Mailpit ready; no external email or AI.",
  );
  const mode = process.argv[2] ?? "full";
  if (!["full", "public-runner", "prod-ops", "capture"].includes(mode))
    throw new Error("Invalid verification mode");
  const result = spawnSync(process.execPath, ["scripts/verify.mjs", mode], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const name of names) docker(["rm", "-f", name], false);
  console.info(
    "Removed this verification's temporary database/mail containers.",
  );
}
