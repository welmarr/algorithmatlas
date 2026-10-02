import { getProblem } from "@sim/problems";
import { saveSubmission } from "@sim/persistence";
import { authorizedUser, readJsonObject } from "../../../../lib/progress-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJsonObject(request);
    if (
      typeof body.problemId !== "string" ||
      !getProblem(body.problemId) ||
      body.language !== "javascript" ||
      typeof body.source !== "string" ||
      !body.source.trim() ||
      body.source.length > 4096
    )
      throw new Error("Invalid submission");
    const id = await saveSubmission(
      auth.user.id,
      body.problemId,
      body.language,
      body.source,
    );
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Submission could not be saved" },
      { status: 400 },
    );
  }
}
