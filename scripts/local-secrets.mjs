import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
export function ensureLocalSecrets() {
  const app = new URL(process.env.APP_URL ?? "http://localhost:3000");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(app.hostname) ||
    process.env.PUBLIC_PYTHON_EXECUTION_ENABLED === "true"
  )
    throw new Error("Development launcher requires a local application");
  const additions = [];
  for (const name of [
    "PYTHON_ORCHESTRATOR_KEY",
    "EXECUTION_CAPABILITY_KEY",
    "ABUSE_HASH_KEY",
    "EMAIL_OUTBOX_KEY",
  ]) {
    if (!process.env[name]) {
      const value = randomBytes(32).toString("hex");
      process.env[name] = value;
      additions.push(name + "=" + value);
    }
  }
  if (additions.length) {
    const prefix =
      existsSync(".env") && !readFileSync(".env", "utf8").endsWith("\n")
        ? "\n"
        : "";
    appendFileSync(".env", prefix + additions.join("\n") + "\n", {
      mode: 0o600,
    });
  }
}
