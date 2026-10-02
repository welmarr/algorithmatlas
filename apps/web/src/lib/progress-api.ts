import { currentUser, readBoundedBody, assertSameOrigin } from "./auth";
import { databaseReady } from "@sim/persistence";

export async function authorizedUser(request: Request, mutate = false) {
  if (!(await databaseReady()))
    return {
      response: Response.json(
        { error: "Storage unavailable" },
        { status: 503 },
      ),
    };
  if (mutate) {
    try {
      assertSameOrigin(request);
    } catch {
      return {
        response: Response.json({ error: "Origin rejected" }, { status: 403 }),
      };
    }
  }
  const user = await currentUser();
  if (!user)
    return {
      response: Response.json(
        { error: "Sign in to save progress" },
        { status: 401 },
      ),
    };
  return { user };
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Expected JSON");
  const value = JSON.parse(await readBoundedBody(request, 20 * 1024));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object");
  return value;
}

export function boundedInput(input: unknown): boolean {
  try {
    return (
      JSON.stringify(input) !== undefined &&
      Buffer.byteLength(JSON.stringify(input), "utf8") <= 16 * 1024
    );
  } catch {
    return false;
  }
}
