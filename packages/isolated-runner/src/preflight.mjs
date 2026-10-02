import { randomUUID } from "node:crypto";
import {
  operationsPool,
  validatePublicConfig,
  appOrigin,
} from "@sim/operations";
import {
  docker,
  dockerRunArguments,
  removeRunnerContainer,
  RUNNER_IMAGE,
} from "./index.mjs";
const command = (args, options = {}) =>
  docker(args, { timeoutMs: 15000, ...options });
export async function runnerPreflight({
  env = process.env,
  profile = "local",
  pool = operationsPool(),
} = {}) {
  const testProfile = profile === "test-production",
    publicProfile = profile !== "local";
  if (!["local", "test-production", "production"].includes(profile))
    throw new Error("INVALID_PREFLIGHT_PROFILE");
  if (publicProfile) validatePublicConfig(env, { testProfile });
  if (
    testProfile &&
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(appOrigin(env)).hostname,
    )
  )
    throw new Error("TEST_PROFILE_REQUIRES_LOOPBACK_APP");
  const info = JSON.parse(
    await command(
      [
        "info",
        "--format",
        '{"id":{{json .ID}},"os":{{json .OSType}},"security":{{json .SecurityOptions}},"cgroup":{{json .CgroupVersion}}}',
      ],
      { limit: 16384 },
    ),
  );
  if (
    info.os !== "linux" ||
    !info.id ||
    !info.security.some((item) => item.includes("seccomp"))
  )
    throw new Error("LINUX_SECCOMP_RUNTIME_REQUIRED");
  if (profile === "production") {
    if (process.getuid?.() === 0)
      throw new Error("DEDICATED_NONROOT_RUNNER_USER_REQUIRED");
    if (
      !info.security.some((item) => item.includes("rootless")) ||
      info.cgroup !== "2"
    )
      throw new Error("ROOTLESS_CGROUP_V2_REQUIRED");
  }
  const image = env.PYTHON_RUNNER_IMAGE ?? RUNNER_IMAGE;
  const actual = JSON.parse(
    await command(
      [
        "image",
        "inspect",
        image,
        "--format",
        '{"id":{{json .Id}},"user":{{json .Config.User}}}',
      ],
      { limit: 4096 },
    ),
  );
  if (publicProfile && actual.id !== image)
    throw new Error("RUNNER_IMAGE_DIGEST_MISMATCH");
  if (actual.user !== "65534:65534")
    throw new Error("RUNNER_IMAGE_USER_INVALID");
  const schema = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE name='005_execution_operations.sql'",
  );
  if (!schema.rowCount) throw new Error("QUEUE_SCHEMA_REQUIRED");
  await pool.query("SELECT id FROM execution_jobs LIMIT 0");
  const name = "simulator-python-runner-" + randomUUID();
  const probe = `import os,json,socket,resource
status=open('/proc/self/status').read()
assert os.getuid()==65534 and os.getgid()==65534
assert 'NoNewPrivs:\\t1' in status and 'Seccomp:\\t2' in status
assert 'CapEff:\\t0000000000000000' in status
assert not any(os.path.exists(p) for p in ['/var/run/docker.sock','/app/.env','/host'])
assert set(os.environ).issubset({'PATH','LANG','HOSTNAME','HOME','LC_CTYPE','GPG_KEY','PYTHON_VERSION','PYTHON_SHA256','PYTHONDONTWRITEBYTECODE','PYTHONHASHSEED'})
ro=False
try: open('/runner/readonly-probe','w').close()
except OSError: ro=True
assert ro
s=socket.socket();s.settimeout(0.2)
network=False
try: s.connect(('203.0.113.1',443));network=True
except OSError: pass
finally: s.close()
assert not network
assert resource.getrlimit(resource.RLIMIT_NOFILE)[0]==64
print(json.dumps({'nonRoot':True,'readOnly':True,'networkDisabled':True,'capabilitiesDropped':True,'noNewPrivileges':True,'seccomp':True,'secretsAbsent':True}))`;
  const args = dockerRunArguments(name, image);
  args.splice(args.length - 1, 0, "--entrypoint", "python");
  args.push("-I", "-S", "-c", probe);
  let configuration;
  try {
    await command(args, { limit: 1024 });
    configuration = JSON.parse(
      await command(["inspect", name, "--format", "{{json .HostConfig}}"], {
        limit: 16384,
      }),
    );
    if (
      configuration.Memory !== 134217728 ||
      configuration.MemorySwap !== 134217728 ||
      configuration.PidsLimit !== 32 ||
      configuration.NanoCpus !== 500000000 ||
      configuration.NetworkMode !== "none" ||
      !configuration.ReadonlyRootfs ||
      configuration.Privileged ||
      configuration.Binds?.length ||
      !configuration.CapDrop?.includes("ALL") ||
      !configuration.Tmpfs?.["/tmp"]?.includes("nodev")
    )
      throw new Error("RESOURCE_ISOLATION_REQUIRED");
    const probeResult = JSON.parse(
      await command(["start", "--attach", name], { limit: 4096 }),
    );
    if (Object.values(probeResult).some((value) => value !== true))
      throw new Error("ISOLATION_PROBE_FAILED");
  } finally {
    await removeRunnerContainer(name);
  }
  return {
    ok: true,
    profile,
    runtimeId: info.id,
    image: actual.id,
    rootless: info.security.some((s) => s.includes("rootless")),
    cgroup: info.cgroup,
    security: info.security,
    resourceLimits: {
      memoryBytes: configuration.Memory,
      pids: configuration.PidsLimit,
      nanoCpus: configuration.NanoCpus,
    },
    cleanup: true,
  };
}
