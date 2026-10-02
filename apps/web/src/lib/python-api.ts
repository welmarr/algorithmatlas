import { assertSameOrigin, readBoundedBody } from "./auth";
export const pythonMessages: Record<string, string> = {
  PYTHON_DISABLED: "Python execution is not enabled on this installation.",
  PYTHON_QUEUE_FULL: "The execution queue is full. Try again shortly.",
  PYTHON_RATE_LIMITED:
    "The local execution limit was reached. Try again in a minute.",
  PYTHON_TIMEOUT:
    "Execution or queue wait exceeded its time limit. Try a smaller input.",
  PYTHON_MEMORY_LIMIT: "The program exceeded its memory allowance.",
  PYTHON_OUTPUT_LIMIT: "Program output exceeded its size limit.",
  PYTHON_TRACE_LIMIT:
    "Execution exceeded 800 trace events. Try a smaller input.",
  PYTHON_CANCELLED: "Execution cancelled.",
  PYTHON_POLICY_REJECTED:
    "This code or request is outside the supported Python policy.",
  PYTHON_SYNTAX_ERROR: "Python could not parse this code. Check its syntax.",
  PYTHON_RUNTIME_ERROR:
    "The program raised an exception. Check the code and input.",
  PYTHON_INTERNAL_ERROR:
    "The local Python service is unavailable or could not finish safely.",
  PYTHON_JOB_NOT_FOUND:
    "This execution expired or is not available to this browser.",
};
export function pythonConfigured() {
  return (
    process.env.PYTHON_EXECUTION_ENABLED === "local" &&
    !!process.env.PYTHON_ORCHESTRATOR_KEY &&
    !!process.env.PYTHON_ORCHESTRATOR_URL
  );
}
export async function proxyPython(request: Request, id?: string) {
  const fail = (code: string, status: number) =>
    Response.json(
      {
        code,
        error: pythonMessages[code] ?? pythonMessages.PYTHON_INTERNAL_ERROR,
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  if (!pythonConfigured()) return fail("PYTHON_DISABLED", 503);
  let host: string;
  try {
    host = new URL(`http://${request.headers.get("host") ?? ""}`).hostname;
  } catch {
    return fail("PYTHON_POLICY_REJECTED", 403);
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
    return fail("PYTHON_POLICY_REJECTED", 403);
  if (request.method !== "GET") {
    try {
      assertSameOrigin(request);
    } catch {
      return fail("PYTHON_POLICY_REJECTED", 403);
    }
  }
  try {
    const base = new URL(process.env.PYTHON_ORCHESTRATOR_URL!);
    if (
      base.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "host.docker.internal"].includes(
        base.hostname,
      ) ||
      base.username ||
      base.password
    )
      return fail("PYTHON_INTERNAL_ERROR", 503);
    let body: string | undefined;
    const headers: Record<string, string> = {
      authorization: `Bearer ${process.env.PYTHON_ORCHESTRATOR_KEY}`,
    };
    if (id) {
      const capability = request.headers.get("x-job-capability");
      if (
        !/^[a-f0-9-]{36}$/.test(id) ||
        !capability ||
        !/^[A-Za-z0-9_-]{43}$/.test(capability)
      )
        return fail("PYTHON_JOB_NOT_FOUND", 404);
      headers["x-job-capability"] = capability;
    } else {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return fail("PYTHON_POLICY_REJECTED", 400);
      try {
        body = await readBoundedBody(request, 24 * 1024);
      } catch {
        return fail("PYTHON_POLICY_REJECTED", 413);
      }
      headers["content-type"] = "application/json";
    }
    const response = await fetch(new URL(id ? `/jobs/${id}` : "/jobs", base), {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    if (text.length > 300000) return fail("PYTHON_OUTPUT_LIMIT", 502);
    const result = JSON.parse(text);
    if (!response.ok || result.code) {
      const code = Object.hasOwn(pythonMessages, result.code)
        ? result.code
        : "PYTHON_INTERNAL_ERROR";
      return Response.json(
        { ...result, code, error: pythonMessages[code] },
        { status: response.status, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(result, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return fail("PYTHON_INTERNAL_ERROR", 503);
  }
}
