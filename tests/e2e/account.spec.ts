import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { databasePool } from "@sim/persistence";
import { emailLink } from "./mail";

test.skip(
  !process.env.E2E_DATABASE_URL || !process.env.MAILPIT_API,
  "PostgreSQL and Mailpit browser test is opt-in",
);

test("account saves a curated run and restores a private input", async ({
  page,
}) => {
  test.slow(); // Full registration, save, logout, and login flow under parallel CI load.
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
  const email = `learner-${randomUUID()}@example.test`;
  try {
    await page.goto("/account/register");
    await page.getByRole("heading", { name: "Create account" }).waitFor();
    const signup = page.locator("form[action='/api/auth/register']");
    await signup.getByLabel("Display name").fill("Learner");
    await signup.getByLabel("Email").fill(email);
    await signup
      .getByLabel("Password", { exact: true })
      .fill("a-long-local-test-password");
    await signup
      .getByLabel("Confirm password")
      .fill("a-long-local-test-password");
    await signup.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/notice=verification-sent/);
    await page.goto("/problems/increasing-array");
    await page.getByRole("button", { name: "Save input", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Verify your email");
    await page.goto(await emailLink(page.request, email, "verify"));
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Email verified");

    await page.goto("/problems/increasing-array");
    await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
    await page.getByRole("button", { name: /Run simulation/ }).click();
    await page.getByRole("button", { name: "Save reference run" }).click();
    await expect(page.getByRole("status")).toContainText("Run saved");
    await page.getByLabel("Save as").fill("Four increases");
    await page.getByRole("button", { name: "Save input" }).click();
    await expect(page.getByRole("status")).toContainText("Input saved");

    const rejected = await page.request.post("/api/progress/inputs", {
      headers: { origin: "https://unrelated.example" },
      data: {
        problemId: "increasing-array",
        input: { values: [1, 2] },
        name: "Rejected",
      },
    });
    expect(rejected.status()).toBe(403);

    const verified = await page.request.post("/api/progress/runs", {
      headers: { origin: `http://localhost:${process.env.E2E_PORT ?? "3000"}` },
      data: {
        problemId: "increasing-array",
        input: { values: [8, 2, 5, 1, 7] },
        output: "0",
        eventCount: 0,
      },
    });
    expect(verified.status()).toBe(201);
    expect((await verified.json()).output).toBe("17");

    await page.goto("/dashboard");
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Four increases" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Four increases" }).click();
    await expect(page.getByLabel("JSON input")).toContainText('"values"');
    await expect(page.getByRole("status")).toContainText("Saved input loaded");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/account\/login$/);
    const signin = page.locator("form[action='/api/auth/login']");
    await signin.getByLabel("Email").fill(email);
    await signin.getByLabel("Password").fill("a-long-local-test-password");
    await signin.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("link", { name: "Four increases" }),
    ).toBeVisible();
  } finally {
    await databasePool().query("DELETE FROM users WHERE email = $1", [email]);
  }
});
