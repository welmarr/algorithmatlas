import { getProblem } from "@sim/problems";
import { recordCuratedRun } from "@sim/persistence";
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
  let run: ReturnType<NonNullable<ReturnType<typeof getProblem>>["run"]>;
  try {
    body = await readJsonObject(request);
    if (typeof body.problemId !== "string" || !boundedInput(body.input))
      throw new Error("Invalid run input");
    const problem = getProblem(body.problemId);
    if (!problem)
      return Response.json({ error: "Problem not found" }, { status: 404 });
    run = problem.run(body.input);
  } catch {
    return Response.json(
      { error: "Input could not be simulated" },
      { status: 400 },
    );
  }
  try {
    const id = await recordCuratedRun(
      auth.user.id,
      body.problemId as string,
      body.input,
      run.output,
      run.events.length,
    );
    return Response.json(
      { id, output: run.output, eventCount: run.events.length },
      { status: 201 },
    );
  } catch (error) {
    console.error("Run storage failed", error);
    return Response.json(
      { error: "Storage is temporarily unavailable" },
      { status: 503 },
    );
  } finally {
    run.timeline.dispose();
  }
}
