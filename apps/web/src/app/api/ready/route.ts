import { databaseConfigured, databaseReady } from "@sim/persistence";
import { executionMode, controls, secret } from "@sim/operations";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const database = databaseConfigured()
    ? (await databaseReady())
      ? "ready"
      : "unavailable"
    : "disabled";
  let execution = "disabled";
  if (executionMode() !== "disabled") {
    execution = "unavailable";
    try {
      const flags = database === "ready" ? await controls() : {};
      if (flags.python_disabled) execution = "disabled";
      else {
        const url = new URL(process.env.PYTHON_ORCHESTRATOR_URL!);
        if (
          url.protocol !== "http:" ||
          !["localhost", "127.0.0.1"].includes(url.hostname)
        )
          throw new Error("INVALID_INTERNAL_URL");
        const response = await fetch(new URL("/ready", url), {
          headers: {
            authorization: "Bearer " + secret("PYTHON_ORCHESTRATOR_KEY"),
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2000),
        });
        const result = await response.json();
        if (response.ok && ["ready", "disabled"].includes(result.status))
          execution = result.status;
      }
    } catch {
      /* Readiness exposes bounded dependency status, never configuration. */
    }
  }
  const ready = database !== "unavailable" && execution !== "unavailable";
  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      dependencies: { database, execution },
    },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
