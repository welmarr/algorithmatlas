import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createOperationsPool } from "@sim/operations";
export async function testDatabase(label: string, { migrate = true } = {}) {
  const source = process.env.DB_TEST_URL;
  if (!source) throw new Error("DB_TEST_URL required");
  const name = "atlas_" + label + "_" + randomUUID().replaceAll("-", "");
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error("Invalid test database name");
  const admin = createOperationsPool(source);
  await admin.query('CREATE DATABASE "' + name + '"');
  const url = new URL(source);
  url.pathname = "/" + name;
  const pool = createOperationsPool(url.toString());
  try {
    if (migrate) {
      const result = spawnSync(
        process.execPath,
        ["packages/persistence/scripts/migrate.mjs"],
        {
          env: { ...process.env, DATABASE_URL: url.toString() },
          encoding: "utf8",
          windowsHide: true,
        },
      );
      if (result.status !== 0)
        throw new Error("Test migrations failed: " + result.stderr);
    }
  } catch (error) {
    await pool.end();
    await admin.query('DROP DATABASE "' + name + '"');
    await admin.end();
    throw error;
  }
  return {
    name,
    url: url.toString(),
    pool,
    async close() {
      await pool.end();
      await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)');
      await admin.end();
    },
  };
}
