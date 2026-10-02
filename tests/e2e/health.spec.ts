import { expect, test } from "@playwright/test";

test("readiness reflects optional storage and security headers are present", async ({
  request,
}) => {
  const response = await request.get("/api/ready");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ready");
  expect(body.dependencies.database).toBe(
    process.env.E2E_DATABASE_URL ? "ready" : "disabled",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
});
