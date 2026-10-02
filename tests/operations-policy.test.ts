import { randomBytes } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  appOrigin,
  requestContext,
  guestIdentity,
  queueConfig,
  secret,
  validatePublicConfig,
  executionAllowed,
  executionMode,
  opaqueHash,
} from "@sim/operations";
const key = () => randomBytes(32).toString("hex");
describe("production request and configuration policy", () => {
  it("pins host and origin, ignores spoofed forwarding in direct local mode", () => {
    const env = { APP_URL: "http://localhost:3000" };
    const good = new Request("http://localhost:3000/api/action", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "x-forwarded-proto": "https",
        "x-real-ip": "203.0.113.5",
      },
    });
    expect(requestContext(good, env, { mutate: true })).toEqual({
      origin: env.APP_URL,
      ip: "127.0.0.1",
    });
    expect(() =>
      requestContext(
        new Request("http://localhost:3000", {
          headers: { host: "evil.test" },
        }),
        env,
      ),
    ).toThrow("HOST");
    expect(() =>
      requestContext(
        new Request("http://localhost:3000", {
          headers: { origin: "https://evil.test" },
        }),
        env,
        { mutate: true },
      ),
    ).toThrow("ORIGIN");
  });
  it("requires authenticated explicit proxy configuration and a single valid IP", () => {
    const env = {
      APP_URL: "https://atlas.example.test",
      TRUST_PROXY: "true",
      TRUST_PROXY_KEY: key(),
    };
    const headers = {
      host: "atlas.example.test",
      origin: env.APP_URL,
      "x-atlas-proxy-key": env.TRUST_PROXY_KEY,
      "x-forwarded-proto": "https",
      "x-forwarded-host": "atlas.example.test",
      "x-real-ip": "203.0.113.7",
    };
    const request = (h: Record<string, string>) =>
      new Request("http://atlas.example.test/api/action", { headers: h });
    expect(requestContext(request(headers), env, { mutate: true }).ip).toBe(
      "203.0.113.7",
    );
    for (const change of [
      { "x-atlas-proxy-key": "forged" },
      { "x-forwarded-proto": "http" },
      { "x-forwarded-host": "evil.test" },
      { "x-real-ip": "203.0.113.7, 10.0.0.1" },
    ])
      expect(() =>
        requestContext(request({ ...headers, ...change }), env, {
          mutate: true,
        }),
      ).toThrow();
    expect(() =>
      requestContext(request(headers), { APP_URL: env.APP_URL }),
    ).toThrow("TRUSTED_PROXY");
  });
  it("signs short-lived anonymous identities without trusting forged or expired cookies", () => {
    const k = key(),
      now = 1700000000000;
    const first = guestIdentity(undefined, k, now);
    expect(guestIdentity(first.cookie, k, now + 100).id).toBe(first.id);
    expect(guestIdentity(first.cookie + "x", k, now).id).not.toBe(first.id);
    expect(guestIdentity(first.cookie, k, now + 86400001).id).not.toBe(
      first.id,
    );
    expect(opaqueHash("ip:203.0.113.1", k)).not.toContain("203.0.113");
  });
  it("keeps public execution disabled by default and guest/account kill switches independent", () => {
    expect(executionMode({})).toBe("disabled");
    expect(
      executionMode({
        PYTHON_EXECUTION_ENABLED: "local",
        APP_URL: "https://atlas.example.test",
      }),
    ).toBe("disabled");
    expect(executionAllowed(false, {})).toBe(false);
    const env = {
      PUBLIC_PYTHON_EXECUTION_ENABLED: "true",
      PYTHON_GUEST_EXECUTION_ENABLED: "false",
      PYTHON_VERIFIED_EXECUTION_ENABLED: "true",
    };
    expect(executionAllowed(false, env)).toBe(false);
    expect(executionAllowed(true, env)).toBe(true);
    expect(executionAllowed(false, { PYTHON_EXECUTION_ENABLED: "local" })).toBe(
      true,
    );
  });
  it("fails closed for missing secrets, mutable images and invalid quotas", () => {
    expect(() => secret("KEY", { KEY: "a".repeat(64) })).toThrow();
    expect(() => appOrigin({ APP_URL: "http://public.example.test" })).toThrow(
      "HTTPS",
    );
    expect(() => queueConfig({ PYTHON_CONCURRENCY: "3" })).toThrow();
    const env = {
      PUBLIC_PYTHON_EXECUTION_ENABLED: "true",
      PYTHON_ORCHESTRATOR_KEY: key(),
      EXECUTION_CAPABILITY_KEY: key(),
      ABUSE_HASH_KEY: key(),
      DATABASE_URL: "postgres://test",
      PYTHON_RUNNER_IMAGE: "sha256:" + "a".repeat(64),
    };
    expect(() =>
      validatePublicConfig(env, { testProfile: true }),
    ).not.toThrow();
    expect(() =>
      validatePublicConfig(
        { ...env, PYTHON_RUNNER_IMAGE: "python:latest" },
        { testProfile: true },
      ),
    ).toThrow("PINNED");
    expect(() =>
      validatePublicConfig(
        { ...env, PYTHON_ORCHESTRATOR_BIND: "0.0.0.0" },
        { testProfile: true },
      ),
    ).toThrow("LOOPBACK");
  });
});
