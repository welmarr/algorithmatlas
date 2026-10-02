import { findPythonWorkspace, deletePythonWorkspace } from "@sim/persistence";
import { authorizedUser } from "../../../../../lib/progress-api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizedUser(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  const value = await findPythonWorkspace(auth.user.id, id);
  return value
    ? Response.json(value, { headers: { "cache-control": "no-store" } })
    : Response.json({ error: "Workspace not found" }, { status: 404 });
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (
    !/^[a-f0-9-]{36}$/.test(id) ||
    !(await deletePythonWorkspace(auth.user.id, id))
  )
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  return Response.json({ ok: true });
}
