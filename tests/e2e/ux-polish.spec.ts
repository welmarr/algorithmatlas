import { expect, test } from "@playwright/test";

test("Home demo follows real steps without an account", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("region", {
    name: "Watch a greedy choice take shape",
  });
  await expect(demo).toBeVisible();
  const before = await demo.getByRole("img").getAttribute("aria-label");
  await demo.getByRole("button", { name: "Next step" }).click();
  await expect(demo.getByText("Step 2 of 3")).toBeVisible();
  await demo.getByRole("button", { name: "Next step" }).click();
  await expect(demo.getByText(/Minimum increments:/)).toBeVisible();
  expect(await demo.getByRole("img").getAttribute("aria-label")).not.toBe(
    before,
  );
  await demo.getByRole("button", { name: "Reset" }).click();
  await expect(demo.getByRole("img")).toHaveAttribute("aria-label", before!);
});

test("library searches metadata and filters without downloading a simulator", async ({
  page,
}) => {
  await page.goto("/problems");
  await expect(
    page.getByRole("heading", { name: "Find your next simulation" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Search problems" }).fill("1094");
  await expect(page.locator(".library-row")).toHaveCount(1);
  await expect(page.locator(".library-row")).toContainText("Increasing Array");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("searchbox", { name: "Search problems" })
    .fill("Dijkstra shortest-path DAG counting");
  await expect(page.locator(".library-row")).toHaveCount(1);
  await expect(page.locator(".library-row")).toContainText("Investigation");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Concept or algorithm").selectOption({ label: "BFS" });
  await expect(page.locator(".library-row").first()).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "Graphs" });
  await expect(page.locator(".library-row").first()).toBeVisible();
});

test("authentication workflows have focused pages", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account\/login$/);
  await expect(page.locator("form[action='/api/auth/login']")).toBeVisible();
  await expect(page.locator("form[action='/api/auth/register']")).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: /Create one/ }).click();
  await expect(page).toHaveURL(/\/account\/register$/);
  await expect(page.locator("form[action='/api/auth/register']")).toBeVisible();
  await page.goto("/account/forgot-password");
  await expect(page.locator("form[action='/api/auth/forgot']")).toBeVisible();
  await page.goto("/account/reset-password");
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
  await page.goto("/account/verify-email");
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
});

test("mobile filters and reduced-motion demo stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/problems");
  await expect(page.getByText("Filters and sort")).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.goto("/");
  await page.getByRole("button", { name: "Next step" }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
