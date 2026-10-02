import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
export const RUNNER_IMAGE = "simulator-python-runner:0.1";
export const MAX_REQUEST_BYTES = 24 * 1024;
export const MAX_RESPONSE_BYTES = 256 * 1024;
export class RunnerError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code;
  }
}
export function validateRunnerRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request))
    throw new TypeError("Runner request must be an object");
  if (
    typeof request.source !== "string" ||
    !request.source.trim() ||
    request.source.length > 4096
  )
    throw new RangeError("Python source must contain 1–4096 characters");
  const input = JSON.stringify(request.input);
  if (input === undefined || Buffer.byteLength(input, "utf8") > 16384)
    throw new RangeError("Runner input must be JSON and at most 16 KiB");
  const payload = JSON.stringify({
    source: request.source,
    input: request.input,
  });
  if (Buffer.byteLength(payload, "utf8") > MAX_REQUEST_BYTES)
    throw new RangeError("Runner request exceeds 24 KiB");
  return payload;
}
export function dockerRunArguments(name, image = RUNNER_IMAGE) {
  if (!/^simulator-python-runner-[0-9a-f-]{36}$/.test(name))
    throw new TypeError("Invalid runner container name");
  if (image !== RUNNER_IMAGE && !/^sha256:[a-f0-9]{64}$/.test(image))
    throw new TypeError(
      "Runner image must be the local development tag or a pinned image ID",
    );
  return [
    "create",
    "-i",
    "--name",
    name,
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
    "/tmp:rw,noexec,nosuid,nodev,size=8m",
    "--ulimit",
    "nofile=64:64",
    "--ulimit",
    "core=0:0",
    "--ulimit",
    "cpu=2:2",
    "--label",
    "com.algorithm-atlas.runner=python",
    image,
  ];
}
export function docker(
  args,
  { input, timeoutMs = 5000, signal, limit = MAX_RESPONSE_BYTES } = {},
) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RunnerError("PYTHON_CANCELLED"));
      return;
    }
    let output = "",
      errorBytes = 0,
      failure;
    const child = spawn("docker", args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const stop = (code) => {
      failure ??= new RunnerError(code);
      child.kill();
    };
    const abort = () => stop("PYTHON_CANCELLED");
    const timer = setTimeout(() => stop("PYTHON_TIMEOUT"), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => {
      if (failure) return;
      output += chunk;
      if (Buffer.byteLength(output) > limit) stop("PYTHON_OUTPUT_LIMIT");
    });
    child.stderr.on("data", (chunk) => {
      errorBytes += chunk.length;
      if (errorBytes > 16384) stop("PYTHON_OUTPUT_LIMIT");
    });
    child.on("error", () => {
      failure ??= new RunnerError("PYTHON_INTERNAL_ERROR");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new RunnerError("PYTHON_INTERNAL_ERROR"));
      else resolve(output);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
let activeRuns = 0;
export async function removeRunnerContainer(name) {
  if (!/^simulator-python-runner-[0-9a-f-]{36}$/.test(name))
    throw new TypeError("Invalid runner name");
  try {
    const present = await docker(["ps", "-aq", "--filter", `name=^${name}$`], {
      limit: 1024,
    });
    if (present.trim()) await docker(["rm", "-f", name], { limit: 1024 });
    if (
      (
        await docker(["ps", "-aq", "--filter", `name=^${name}$`], {
          limit: 1024,
        })
      ).trim()
    )
      throw new Error("still present");
  } catch {
    throw new RunnerError("PYTHON_CLEANUP_FAILED");
  }
}
export async function runPython(
  request,
  {
    timeoutMs = 5000,
    signal,
    runId = randomUUID(),
    image = RUNNER_IMAGE,
    onCleanup = () => {},
  } = {},
) {
  const payload = validateRunnerRequest(request);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 5000)
    throw new RangeError("Timeout must be between 100 and 5000 ms");
  if (signal?.aborted) throw new RunnerError("PYTHON_CANCELLED");
  if (activeRuns >= 2) throw new RunnerError("PYTHON_QUEUE_FULL");
  activeRuns++;
  const name = `simulator-python-runner-${runId}`;
  let created = false;
  try {
    // Finish creation before honoring cancellation: never race rm against a pending create.
    await docker(dockerRunArguments(name, image), { limit: 1024 });
    created = true;
    const stdout = await docker(["start", "--attach", "--interactive", name], {
      input: payload,
      timeoutMs,
      signal,
    });
    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      throw new RunnerError("PYTHON_INTERNAL_ERROR");
    }
    if (
      !result ||
      !["ok", "error", "limit"].includes(result.status) ||
      !Array.isArray(result.rawTrace) ||
      result.rawTrace.length > 800
    )
      throw new RunnerError("PYTHON_INTERNAL_ERROR");
    return result;
  } catch (error) {
    if (
      created &&
      error instanceof RunnerError &&
      error.code === "PYTHON_INTERNAL_ERROR"
    ) {
      const state = await docker(
        ["inspect", "--format", "{{json .State}}", name],
        { limit: 16384 },
      )
        .then(JSON.parse)
        .catch(() => null);
      if (state?.OOMKilled) throw new RunnerError("PYTHON_MEMORY_LIMIT");
      if ([137, 152].includes(state?.ExitCode))
        throw new RunnerError("PYTHON_TIMEOUT");
    }
    throw error;
  } finally {
    try {
      // Explicit cleanup happens before the scheduler can reuse this slot.
      const cleanupStart = Date.now();
      await removeRunnerContainer(name);
      onCleanup(Date.now() - cleanupStart);
      // A timed-out create can finish in the daemon after its CLI exits. Stop admission.
      if (!created) throw new RunnerError("PYTHON_CLEANUP_FAILED");
    } finally {
      activeRuns--;
    }
  }
}
