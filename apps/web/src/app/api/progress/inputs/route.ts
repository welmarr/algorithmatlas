import { getProblem } from "@sim/problems";
import { saveInput } from "@sim/persistence";
import {
  authorizedUser,
  boundedInput,
  readJsonObject,
} from "../../../../lib/progress-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request);
    if (
      typeof body.problemId !== "string" ||
      !boundedInput(body.input) ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 64
    )
      throw new Error("Invalid saved input");
    const problem = getProblem(body.problemId);
    if (!problem)
      return Response.json({ error: "Problem not found" }, { status: 404 });
    const validationRun = problem.run(body.input);
    validationRun.timeline.dispose();
  } catch {
    return Response.json(
      { error: "Input could not be validated" },
      { status: 400 },
    );
  }
  try {
    const id = await saveInput(
      auth.user.id,
      body.problemId as string,
      (body.name as string).trim(),
      body.input,
    );
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Saved input storage failed", error);
    return Response.json(
      { error: "Storage is temporarily unavailable" },
      { status: 503 },
    );
  }
}
