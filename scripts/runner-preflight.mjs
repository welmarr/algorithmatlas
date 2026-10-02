import { runnerPreflight } from "../packages/isolated-runner/src/preflight.mjs";
import { operationsPool } from "@sim/operations";
try {
  const profile = process.env.RUNNER_PREFLIGHT_PROFILE ?? "production";
  console.info(JSON.stringify(await runnerPreflight({ profile })));
} catch (error) {
  console.error(JSON.stringify({ preflight: "failed", code: error.message }));
  process.exitCode = 1;
} finally {
  await operationsPool().end();
}
