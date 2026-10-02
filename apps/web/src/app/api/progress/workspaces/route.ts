import { listPythonWorkspaces, savePythonWorkspace } from "@sim/persistence";
import { authorizedUser, boundedInput } from "../../../../lib/progress-api";
import { readBoundedBody } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await authorizedUser(request);
  if ("response" in auth) return auth.response;
  return Response.json(await listPythonWorkspaces(auth.user.id), {
    headers: { "cache-control": "no-store" },
  });
}
export async function POST(request: Request) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new Error("invalid");
    const body = JSON.parse(await readBoundedBody(request, 24 * 1024));
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 64 ||
      typeof body.source !== "string" ||
      !body.source.trim() ||
      body.source.length > 4096 ||
      !boundedInput(body.input)
    )
      throw new Error("invalid");
    const id = await savePythonWorkspace(
      auth.user.id,
      body.name.trim(),
      body.source,
      body.input,
    );
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "WORKSPACE_LIMIT")
      return Response.json(
        {
          error:
            "You have 100 saved workspaces. Delete one before saving another.",
        },
        { status: 409 },
      );
    return Response.json(
      {
        error:
          "Workspace could not be saved. Check the name, source and JSON input.",
      },
      { status: 400 },
    );
  }
}
