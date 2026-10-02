import { databaseConfigured, databaseReady } from "@sim/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = databaseConfigured()
    ? (await databaseReady())
      ? "ready"
      : "unavailable"
    : "disabled";
  const ready = database !== "unavailable";
  return Response.json(
    { status: ready ? "ready" : "not_ready", dependencies: { database } },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
