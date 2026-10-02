import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { databasePool } from "@sim/persistence";
import { emailLink } from "./mail";
test.skip(
  !process.env.E2E_DATABASE_URL || !process.env.MAILPIT_API,
  "Requires disposable PostgreSQL and Mailpit",
);
test("verified auth, reset, private ownership, abuse limits and anonymous draft continuity", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
  const origin = `http://localhost:${process.env.E2E_PORT ?? "3000"}`;
  const email = `auth-e2e-${randomUUID()}@example.test`;
  const otherEmail = `other-${randomUUID()}@example.test`;
  const password = "original test password";
  const post = (action: string, data: unknown, csrf = origin) =>
    page.request.post(`/api/auth/${action}`, {
      headers: { origin: csrf },
      data,
    });
  const second = await browser.newContext({ baseURL: origin });
  try {
    await page.goto("/problems/increasing-array");
    await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
    await page
      .getByLabel("JavaScript subset")
      .fill("let moves = 99; return moves;");
    await page
      .locator('a[href="/account?returnTo=/problems/increasing-array"]')
      .click();
    await page
      .getByRole("link", { name: "Continue learning", exact: true })
      .click();
    await expect(page.getByLabel("JSON input")).toHaveValue(
      '{"values":[8,2,5,1,7]}',
    );
    await expect(page.getByLabel("JavaScript subset")).toHaveValue(
      "let moves = 99; return moves;",
    );
    for (const invalid of [
      { email: "invalid", password, confirmPassword: password },
      { email, password: "short", confirmPassword: "short" },
      { email, password, confirmPassword: "mismatch" },
    ])
      expect((await post("register", invalid)).status()).toBe(400);
    expect(
      (
        await post(
          "register",
          { email, password, confirmPassword: password },
          "https://attacker.test",
        )
      ).status(),
    ).toBe(403);
    const created = await post("register", {
      email,
      password,
      confirmPassword: password,
      returnTo: "https://attacker.test",
    });
    expect(created.status()).toBe(201);
    expect(created.headers()["set-cookie"]).toMatch(/HttpOnly/i);
    expect(created.headers()["set-cookie"]).toMatch(/SameSite=Lax/i);
    expect(
      (
        await post("register", { email, password, confirmPassword: password })
      ).status(),
    ).toBe(409);
    expect((await post("login", { email, password: "wrong" })).status()).toBe(
      401,
    );
    const save = () =>
      page.request.post("/api/progress/inputs", {
        headers: { origin },
        data: {
          problemId: "increasing-array",
          name: "Private",
          input: { values: [8, 2, 5, 1, 7] },
        },
      });
    expect(await (await save()).json()).toMatchObject({
      code: "AUTH_EMAIL_UNVERIFIED",
    });
    const verifyUrl = await emailLink(page.request, email, "verify");
    const token = new URLSearchParams(new URL(verifyUrl).hash.slice(1)).get(
      "token",
    );
    await page.goto(verifyUrl);
    // Reading a link never consumes it: explicit form submission is required.
    expect(await (await save()).json()).toMatchObject({
      code: "AUTH_EMAIL_UNVERIFIED",
    });
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Email verified");
    expect((await post("verify", { token })).status()).toBe(400);
    const saved = await save();
    expect(saved.status()).toBe(201);
    const id = (await saved.json()).id;
    const workspace = await page.request.post("/api/progress/workspaces", {
      headers: { origin },
      data: {
        name: "Private Python",
        source: "def solve(data): return data",
        input: { value: 7 },
      },
    });
    expect(workspace.status()).toBe(201);
    const workspaceId = (await workspace.json()).id;
    expect(
      (await second.request.get(`/api/progress/inputs/${id}`)).status(),
    ).toBe(401);
    expect(
      (
        await second.request.post("/api/auth/register", {
          headers: { origin },
          data: { email: otherEmail, password, confirmPassword: password },
        })
      ).status(),
    ).toBe(201);
    const otherLink = await emailLink(page.request, otherEmail, "verify");
    const otherToken = new URLSearchParams(
      new URL(otherLink).hash.slice(1),
    ).get("token");
    expect(
      (
        await second.request.post("/api/auth/verify", {
          headers: { origin },
          data: { token: otherToken },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await second.request.get(`/api/progress/inputs/${id}`)).status(),
    ).toBe(404);
    expect(
      (
        await second.request.delete(`/api/progress/inputs/${id}`, {
          headers: { origin },
        })
      ).status(),
    ).toBe(404);
    // A second session must also be revoked by the reset.
    expect(
      (
        await second.request.get(`/api/progress/workspaces/${workspaceId}`)
      ).status(),
    ).toBe(404);
    expect(
      (
        await second.request.delete(`/api/progress/workspaces/${workspaceId}`, {
          headers: { origin },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await second.request.post("/api/auth/login", {
          headers: { origin },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    const known = await (await post("forgot", { email })).json();
    expect(
      await (
        await post("forgot", { email: `absent-${randomUUID()}@example.test` })
      ).json(),
    ).toEqual(known);
    const resetUrl = await emailLink(page.request, email, "reset");
    const resetToken = new URLSearchParams(new URL(resetUrl).hash.slice(1)).get(
      "token",
    );
    await page.goto(resetUrl);
    await page
      .getByLabel("New password", { exact: true })
      .fill("replacement test password");
    await page.getByLabel("Confirm password").fill("replacement test password");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("status")).toContainText("Password reset");
    expect(
      (await second.request.get(`/api/progress/inputs/${id}`)).status(),
    ).toBe(401);
    expect(
      (
        await post("reset", {
          token: resetToken,
          password,
          confirmPassword: password,
        })
      ).status(),
    ).toBe(400);
    expect((await post("login", { email, password })).status()).toBe(401);
    expect(
      (
        await post("login", { email, password: "replacement test password" })
      ).status(),
    ).toBe(200);
    expect(
      (await page.request.get(`/api/progress/inputs/${id}`)).status(),
    ).toBe(200);
    for (let i = 0; i < 3; i++)
      expect((await post("resend", { email })).status()).toBe(200);
    expect((await post("resend", { email })).status()).toBe(429);
    expect(
      (
        await page.request.post("/api/auth/logout", {
          headers: { origin },
          form: {},
        })
      ).status(),
    ).toBe(200);
    expect(
      (await page.request.get(`/api/progress/inputs/${id}`)).status(),
    ).toBe(401);
  } finally {
    await second.close();
    await databasePool().query(
      "DELETE FROM users WHERE email = ANY($1::text[])",
      [[email, otherEmail]],
    );
  }
});
