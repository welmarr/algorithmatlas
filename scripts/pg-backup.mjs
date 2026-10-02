import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createOperationsPool } from "@sim/operations";
function clientCommand(tool, url, env) {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error("DATABASE_URL_INVALID");
  const vars = {
    ...env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGCONNECT_TIMEOUT: "10",
    PGSSLMODE: parsed.searchParams.get("sslmode") ?? "prefer",
    PGOPTIONS: "-c statement_timeout=60000",
  };
  if (env.PG_TOOLS_CONTAINER) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(env.PG_TOOLS_CONTAINER))
      throw new Error("PG_TOOLS_CONTAINER_INVALID");
    vars.PGHOST = env.PG_TOOLS_HOST ?? "127.0.0.1";
    vars.PGPORT = env.PG_TOOLS_PORT ?? "5432";
    return {
      command: "docker",
      args: [
        "exec",
        "-i",
        ...[
          "PGHOST",
          "PGPORT",
          "PGDATABASE",
          "PGUSER",
          "PGPASSWORD",
          "PGCONNECT_TIMEOUT",
          "PGSSLMODE",
          "PGOPTIONS",
        ].flatMap((k) => ["-e", k]),
        env.PG_TOOLS_CONTAINER,
        tool,
      ],
      env: vars,
    };
  }
  return {
    command: env[tool === "pg_dump" ? "PG_DUMP_BIN" : "PG_RESTORE_BIN"] ?? tool,
    args: [],
    env: vars,
  };
}
async function transfer(tool, url, path, args, env) {
  const spec = clientCommand(tool, url, env);
  const child = spawn(spec.command, [...spec.args, ...args], {
    env: spec.env,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });
  child.stderr.resume(); // Client stderr can contain connection metadata; emit a bounded code instead.
  const completed = new Promise((resolve, reject) => {
    child.once("error", () => reject(new Error("POSTGRES_CLIENT_UNAVAILABLE")));
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("POSTGRES_" + tool.toUpperCase() + "_FAILED")),
    );
  });
  const timer = setTimeout(() => child.kill(), 120000);
  try {
    if (tool === "pg_dump") {
      child.stdin.end();
      await Promise.all([
        pipeline(
          child.stdout,
          createWriteStream(path, { flags: "wx", mode: 0o600 }),
        ),
        completed,
      ]);
    } else {
      child.stdout.resume();
      await Promise.all([
        pipeline(createReadStream(path), child.stdin),
        completed,
      ]);
    }
  } finally {
    clearTimeout(timer);
    child.kill();
  }
}
export async function backupDatabase({
  url = process.env.DATABASE_URL,
  path,
  env = process.env,
} = {}) {
  if (!url || !path) throw new Error("BACKUP_URL_AND_PATH_REQUIRED");
  const absolute = resolve(path),
    started = Date.now();
  await transfer(
    "pg_dump",
    url,
    absolute,
    ["--format=custom", "--no-owner", "--no-privileges"],
    env,
  );
  return {
    format: "postgres-custom",
    bytes: statSync(absolute).size,
    durationMs: Date.now() - started,
  };
}
export async function restoreDatabase({
  url = process.env.DATABASE_URL,
  path,
  env = process.env,
} = {}) {
  if (!url || !path) throw new Error("RESTORE_URL_AND_PATH_REQUIRED");
  const pool = createOperationsPool(url);
  try {
    const tables = await pool.query(
      "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 1",
    );
    if (tables.rowCount) throw new Error("RESTORE_REQUIRES_EMPTY_DATABASE");
  } finally {
    await pool.end();
  }
  const started = Date.now();
  await transfer(
    "pg_restore",
    url,
    resolve(path),
    [
      "--dbname",
      new URL(url).pathname.slice(1),
      "--single-transaction",
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
    ],
    env,
  );
  return { status: "restored", durationMs: Date.now() - started };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  try {
    const [action, path] = process.argv.slice(2);
    if (!["backup", "restore"].includes(action))
      throw new Error("Use backup|restore PATH with DATABASE_URL");
    console.info(
      JSON.stringify(
        await (action === "backup" ? backupDatabase : restoreDatabase)({
          path,
        }),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
