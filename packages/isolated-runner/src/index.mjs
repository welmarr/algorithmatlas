import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export const RUNNER_IMAGE = "simulator-python-runner:0.1";
export const MAX_REQUEST_BYTES = 24 * 1024;
export const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_ERROR_BYTES = 16 * 1024;
const WALL_TIMEOUT_MS = 5000;

export function validateRunnerRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("Runner request must be an object");
  }
  if (
    typeof request.source !== "string" ||
    !request.source.trim() ||
    request.source.length > 4096
  ) {
    throw new RangeError("Python source must contain 1–4096 characters");
  }
  const input = JSON.stringify(request.input);
  if (input === undefined || Buffer.byteLength(input, "utf8") > 16384) {
    throw new RangeError("Runner input must be JSON and at most 16 KiB");
  }
  const payload = JSON.stringify({
    source: request.source,
    input: request.input,
  });
  if (Buffer.byteLength(payload, "utf8") > MAX_REQUEST_BYTES) {
    throw new RangeError("Runner request exceeds 24 KiB");
  }
  return payload;
}

export function dockerRunArguments(containerName) {
  if (!/^simulator-python-runner-[0-9a-f-]{36}$/.test(containerName)) {
    throw new TypeError("Invalid runner container name");
  }
  return [
    "run",
    "--rm",
    "-i",
    "--name",
    containerName,
    "--pull",
    "never",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--user",
    "65534:65534",
    "--memory",
    "128m",
    "--memory-swap",
    "128m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "32",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=8m",
    "--ulimit",
    "nofile=64:64",
    "--ulimit",
    "core=0:0",
    "--ulimit",
    "cpu=2:2",
    "--label",
    "com.algorithm-atlas.runner=python",
    RUNNER_IMAGE,
  ];
}

function removeContainer(containerName) {
  // The generated name is validated before this point. Never invoke a shell.
  return new Promise((resolve) => {
    const child = spawn("docker", ["rm", "-f", containerName], {
      shell: false,
      stdio: "ignore",
      windowsHide: true,
    });
    const timeout = setTimeout(() => child.kill(), 3000);
    child.on("error", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.on("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

let activeRuns = 0;
export function runPython(request, { timeoutMs = WALL_TIMEOUT_MS } = {}) {
  const payload = validateRunnerRequest(request);
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 100 ||
    timeoutMs > WALL_TIMEOUT_MS
  ) {
    throw new RangeError("Timeout must be between 100 and 5000 ms");
  }
  if (activeRuns >= 2)
    throw new Error("Local runner is busy (maximum two concurrent runs)");
  const containerName = `simulator-python-runner-${randomUUID()}`;
  const args = dockerRunArguments(containerName);
  activeRuns += 1;
  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let stoppedForLimit = false;
    let cleanup;
    const child = spawn("docker", args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      stoppedForLimit = true;
      child.kill();
      cleanup = removeContainer(containerName);
    }, timeoutMs);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      activeRuns -= 1;
      if (error) reject(error);
      else resolve(value);
    };
    child.on("error", (error) => {
      cleanup = removeContainer(containerName);
      finish(error);
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!stoppedForLimit && Buffer.byteLength(stdout) > MAX_RESPONSE_BYTES) {
        stoppedForLimit = true;
        child.kill();
        cleanup = removeContainer(containerName);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(0, MAX_ERROR_BYTES);
    });
    child.on("close", async (code) => {
      if (stoppedForLimit) {
        await cleanup;
        finish(new Error("Runner exceeded wall time or output limit"));
        return;
      }
      if (code !== 0) {
        finish(new Error(`Docker runner exited ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (
          !result ||
          !["ok", "error", "limit"].includes(result.status) ||
          !Array.isArray(result.rawTrace)
        ) {
          throw new Error("Malformed runner response");
        }
        finish(undefined, result);
      } catch (error) {
        finish(error);
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(payload);
  });
}
