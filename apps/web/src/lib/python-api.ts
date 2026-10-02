import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  executionMode,
  executionAllowed,
  requestContext,
  guestIdentity,
  opaqueHash,
  secret,
} from "@sim/operations";
import { readBoundedBody, currentUser } from "./auth";
export const pythonMessages: Record<string, string> = {
  PYTHON_DISABLED:
    "Python execution is temporarily unavailable. You can keep editing and use your saved work.",
  PYTHON_QUEUE_FULL: "The execution queue is busy. Try again shortly.",
  PYTHON_RATE_LIMITED:
    "Your execution limit was reached. Please wait before trying again.",
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
    "The Python service is unavailable. Please try again shortly.",
  PYTHON_CLEANUP_FAILED:
    "Execution stopped. The service is temporarily unavailable.",
  PYTHON_INTERRUPTED:
    "This execution was interrupted by a service restart. Run it again.",
  PYTHON_IDEMPOTENCY_CONFLICT:
    "This retry does not match the original execution. Start a new run.",
  PYTHON_JOB_NOT_FOUND:
    "This execution expired or is not available to this browser.",
};
export function pythonConfigured() {
  return (
    executionMode() !== "disabled" &&
    !!process.env.PYTHON_ORCHESTRATOR_KEY &&
    !!process.env.PYTHON_ORCHESTRATOR_URL
  );
}
export async function proxyPython(request: Request, id?: string) {
  const fail = (code: string, status: number, retryAfter?: string) =>
    NextResponse.json(
      {
        code,
        error: pythonMessages[code] ?? pythonMessages.PYTHON_INTERNAL_ERROR,
      },
      {
        status,
        headers: {
          "cache-control": "no-store",
          ...(retryAfter ? { "retry-after": retryAfter } : {}),
        },
      },
    );
  if (!pythonConfigured()) return fail("PYTHON_DISABLED", 503);
  try {
    const context = requestContext(request, process.env, {
      mutate: request.method !== "GET",
    });
    const user = await currentUser();
    if (!id && !executionAllowed(user?.emailVerified === true))
      return fail("PYTHON_DISABLED", 503);
    const privacyKey = secret("ABUSE_HASH_KEY");
    const jar = await cookies();
    const guest = guestIdentity(jar.get("atlas_guest")?.value, privacyKey);
    const actor = {
      clientHash: opaqueHash(
        user ? "user:" + user.id : "guest:" + guest.id,
        privacyKey,
      ),
      ipHash: opaqueHash("ip:" + context.ip, privacyKey),
      ownerId: user?.id ?? null,
      verified: user?.emailVerified === true,
      idempotencyKey: request.headers.get("idempotency-key") ?? randomUUID(),
    };
    const base = new URL(process.env.PYTHON_ORCHESTRATOR_URL!);
    if (
      base.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(base.hostname) ||
      base.username ||
      base.password ||
      base.pathname !== "/" ||
      base.search ||
      base.hash
    )
      return fail("PYTHON_INTERNAL_ERROR", 503);
    let body: string | undefined;
    const headers: Record<string, string> = {
      authorization: "Bearer " + secret("PYTHON_ORCHESTRATOR_KEY"),
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
      headers["x-client-hash"] = actor.clientHash;
      headers["x-ip-hash"] = actor.ipHash;
      headers["x-owner-id"] = actor.ownerId ?? "";
      headers["x-verified"] = String(actor.verified);
    } else {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return fail("PYTHON_POLICY_REJECTED", 400);
      let value;
      try {
        value = JSON.parse(await readBoundedBody(request, 24576));
      } catch {
        return fail("PYTHON_POLICY_REJECTED", 400);
      }
      body = JSON.stringify({
        request: {
          schemaVersion: "0.1",
          source: value?.source,
          input: value?.input,
        },
        actor,
      });
      headers["content-type"] = "application/json";
    }
    const upstream = await fetch(new URL(id ? "/jobs/" + id : "/jobs", base), {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await upstream.text();
    if (text.length > 300000) return fail("PYTHON_OUTPUT_LIMIT", 502);
    const data = JSON.parse(text);
    const response =
      !upstream.ok || (data.code && data.status !== "completed")
        ? NextResponse.json(
            {
              ...data,
              error:
                pythonMessages[data.code] ??
                pythonMessages.PYTHON_INTERNAL_ERROR,
            },
            {
              status: upstream.status,
              headers: {
                "cache-control": "no-store",
                ...(upstream.headers.get("retry-after")
                  ? { "retry-after": upstream.headers.get("retry-after")! }
                  : {}),
              },
            },
          )
        : NextResponse.json(data, {
            status: upstream.status,
            headers: { "cache-control": "no-store" },
          });
    if (!user)
      response.cookies.set("atlas_guest", guest.cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });
    return response;
  } catch (error) {
    const code =
      error instanceof Error && /REQUEST_|PROXY_/.test(error.message)
        ? "PYTHON_POLICY_REJECTED"
        : "PYTHON_INTERNAL_ERROR";
    return fail(code, code === "PYTHON_POLICY_REJECTED" ? 403 : 503);
  }
}
