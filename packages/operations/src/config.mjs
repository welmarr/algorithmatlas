export function secret(name, env = process.env) {
  const value = env[name];
  if (!value || !/^[a-f0-9]{64}$/.test(value) || new Set(value).size < 8)
    throw new Error("INVALID_SECRET_" + name);
  return value;
}
export function integer(env, name, fallback, min, max) {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error("INVALID_CONFIG_" + name);
  return value;
}
export function appOrigin(env = process.env) {
  const app = new URL(env.APP_URL ?? "http://localhost:3000");
  if (
    !["http:", "https:"].includes(app.protocol) ||
    app.username ||
    app.password ||
    app.pathname !== "/" ||
    app.search ||
    app.hash
  )
    throw new Error("INVALID_APP_URL");
  if (
    app.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(app.hostname)
  )
    throw new Error("APP_URL_REQUIRES_HTTPS");
  return app.origin;
}
export function executionMode(env = process.env) {
  if (env.PUBLIC_PYTHON_EXECUTION_ENABLED === "true") return "public";
  if (env.PYTHON_EXECUTION_ENABLED !== "local") return "disabled";
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(appOrigin(env)).hostname,
  )
    ? "local"
    : "disabled";
}
export function executionAllowed(verified, env = process.env) {
  const mode = executionMode(env);
  if (mode === "disabled") return false;
  const value =
    env[
      verified
        ? "PYTHON_VERIFIED_EXECUTION_ENABLED"
        : "PYTHON_GUEST_EXECUTION_ENABLED"
    ];
  return value === "true" || (mode === "local" && value !== "false");
}
export function queueConfig(env = process.env) {
  return {
    concurrency: integer(env, "PYTHON_CONCURRENCY", 2, 1, 2),
    queueSize: integer(env, "PYTHON_QUEUE_SIZE", 8, 1, 32),
    queueWaitMs: integer(env, "PYTHON_QUEUE_WAIT_MS", 15000, 1000, 30000),
    retentionMs: integer(env, "PYTHON_RESULT_TTL_MS", 300000, 1000, 900000),
    guestQueued: integer(env, "PYTHON_GUEST_QUEUED", 2, 1, 8),
    verifiedQueued: integer(env, "PYTHON_VERIFIED_QUEUED", 4, 1, 16),
    guestMinute: integer(env, "PYTHON_GUEST_PER_MINUTE", 6, 1, 120),
    guestHour: integer(env, "PYTHON_GUEST_PER_HOUR", 60, 1, 1000),
    guestDay: integer(env, "PYTHON_GUEST_PER_DAY", 200, 1, 10000),
    verifiedMinute: integer(env, "PYTHON_VERIFIED_PER_MINUTE", 12, 1, 120),
    verifiedHour: integer(env, "PYTHON_VERIFIED_PER_HOUR", 120, 1, 2000),
    verifiedDay: integer(env, "PYTHON_VERIFIED_PER_DAY", 600, 1, 10000),
    ipMinute: integer(env, "PYTHON_IP_PER_MINUTE", 30, 1, 240),
    ipHour: integer(env, "PYTHON_IP_PER_HOUR", 300, 1, 4000),
    ipDay: integer(env, "PYTHON_IP_PER_DAY", 1200, 1, 20000),
    globalMinute: integer(env, "PYTHON_GLOBAL_PER_MINUTE", 60, 1, 1000),
    globalDay: integer(env, "PYTHON_GLOBAL_PER_DAY", 5000, 1, 50000),
    pollMinute: integer(env, "PYTHON_POLL_PER_MINUTE", 240, 10, 1000),
    cancelMinute: integer(env, "PYTHON_CANCEL_PER_MINUTE", 30, 1, 120),
  };
}
export function validatePublicConfig(
  env = process.env,
  { testProfile = false } = {},
) {
  if (executionMode(env) !== "public")
    throw new Error("PUBLIC_EXECUTION_NOT_ENABLED");
  for (const name of [
    "PYTHON_ORCHESTRATOR_KEY",
    "EXECUTION_CAPABILITY_KEY",
    "ABUSE_HASH_KEY",
  ])
    secret(name, env);
  if (!env.DATABASE_URL) throw new Error("DATABASE_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/.test(env.PYTHON_RUNNER_IMAGE ?? ""))
    throw new Error("PINNED_RUNNER_IMAGE_REQUIRED");
  if (
    env.PYTHON_ORCHESTRATOR_BIND &&
    env.PYTHON_ORCHESTRATOR_BIND !== "127.0.0.1"
  )
    throw new Error("RUNNER_LOOPBACK_REQUIRED");
  if (!testProfile) {
    if (process.platform !== "linux")
      throw new Error("PRODUCTION_LINUX_REQUIRED");
    if (!appOrigin(env).startsWith("https:"))
      throw new Error("PUBLIC_HTTPS_REQUIRED");
    if (env.TRUST_PROXY !== "true") throw new Error("TRUSTED_PROXY_REQUIRED");
    secret("TRUST_PROXY_KEY", env);
  }
  queueConfig(env);
}
