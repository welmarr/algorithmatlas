import { setLearningProgress, type LearningStatus } from "@sim/persistence";
import { authorizedUser, readJsonObject } from "../../../../lib/progress-api";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const auth = await authorizedUser(request, true);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJsonObject(request);
    if (
      typeof body.conceptId !== "string" ||
      !/^[a-z0-9-]{1,48}$/.test(body.conceptId) ||
      !["exploring", "practicing", "confident"].includes(String(body.status))
    )
      throw new Error("Invalid concept progress");
    await setLearningProgress(
      auth.user.id,
      body.conceptId,
      body.status as LearningStatus,
    );
    return Response.json({ status: "ok" });
  } catch {
    return Response.json(
      { error: "Concept progress could not be updated" },
      { status: 400 },
    );
  }
}
