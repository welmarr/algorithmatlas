import { findSavedInput, deleteSavedInput } from "@sim/persistence";
import { authorizedUser } from "../../../../../lib/progress-api";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (
    !/^[0-9a-f-]{36}$/.test(id) ||
    !(await deleteSavedInput(auth.user.id, id))
  )
    return Response.json({ error: "Input not found" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizedUser(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return Response.json({ error: "Input not found" }, { status: 404 });
  const saved = await findSavedInput(auth.user.id, id);
  if (!saved)
    return Response.json({ error: "Input not found" }, { status: 404 });
  return Response.json(saved);
}
