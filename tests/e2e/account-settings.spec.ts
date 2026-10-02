import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { databasePool } from "@sim/persistence";
test.skip(
  !process.env.E2E_DATABASE_URL || !process.env.MAILPIT_API,
  "Requires disposable account services",
);
test("account inspection and password-confirmed deletion revoke sessions and saved data", async ({
  page,
}) => {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
  const email = "delete-" + randomUUID() + "@example.test",
    password = "account deletion test password",
    origin = "http://localhost:" + (process.env.E2E_PORT ?? "3000");
  try {
    const created = await page.request.post("/api/auth/register", {
      headers: { origin },
      data: {
        email,
        password,
        confirmPassword: password,
        name: "Account audit",
      },
    });
    expect(created.status()).toBe(201);
    await page.goto("/account/settings");
    await expect(
      page.getByRole("heading", { name: "Account & data" }),
    ).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    const form = page.locator("form[action='/api/account/delete']");
    await form.getByLabel("Current password").fill("wrong password");
    await form.getByLabel("Type DELETE").fill("DELETE");
    await form.getByRole("button").click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "not accepted",
    );
    await form.getByLabel("Current password").fill(password);
    await form.getByLabel("Type DELETE").fill("DELETE");
    await form.getByRole("button").click();
    await expect(page.getByRole("status")).toContainText("deleted");
    await page.goto("/account/settings");
    await expect(page).toHaveURL(/\/account$/);
    expect(
      (
        await databasePool().query(
          "SELECT count(*)::int AS n FROM users WHERE email=$1",
          [email],
        )
      ).rows[0].n,
    ).toBe(0);
  } finally {
    await databasePool().query("DELETE FROM users WHERE email=$1", [email]);
  }
});
