import { expect, test } from "@playwright/test";

test("comparison shares edited input and provides two independent seeks", async ({
  page,
}) => {
  await page.goto("/lab/compare");
  await expect(
    page.getByRole("heading", { name: "One input. Two ways through it." }),
  ).toBeVisible();
  const left = page.getByRole("region", { name: "Left simulation" });
  const right = page.getByRole("region", { name: "Right simulation" });
  await expect(left).toContainText("A → C → F");
  await expect(right).toContainText("A → B → D → E → F");
  await page.getByRole("button", { name: "Left next event" }).click();
  await expect(left.locator(".comparison-position")).toContainText("1 /");
  await expect(right.locator(".comparison-position")).toContainText("0 /");
  await page.getByRole("button", { name: "Play both" }).click();
  await expect
    .poll(async () => right.locator(".comparison-position").innerText())
    .not.toMatch(/^0 \/ /);
  await page.getByRole("button", { name: "Pause both" }).click();
  await page
    .getByRole("checkbox", { name: "Synchronized event playback" })
    .uncheck();
  await page.getByRole("button", { name: "Right next event" }).click();
  await expect(left.locator(".comparison-position")).not.toHaveText(
    await right.locator(".comparison-position").innerText(),
  );
  await page.getByRole("slider", { name: "Left event position" }).fill("0");
  await expect(left.locator(".comparison-position")).toContainText("0 /");

  await page.getByRole("textbox", { name: "Shared input JSON" }).fill(
    JSON.stringify({
      nodes: ["A", "B", "C"],
      edges: [["A", "B"]],
      start: "A",
      goal: "C",
    }),
  );
  await page.getByRole("button", { name: "Run both algorithms" }).click();
  await expect(left).toContainText("No route");
  await expect(right).toContainText("No route");
  await expect(
    page.getByRole("region", { name: "Comparison result" }),
  ).toContainText("unreachable");
  await page.getByRole("textbox", { name: "Shared input JSON" }).fill("{");
  await page.getByRole("button", { name: "Run both algorithms" }).click();
  await expect(page.locator(".comparison-error")).toBeVisible();
});

test("comparison switches inputs and fits a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab/compare");
  await page.getByRole("button", { name: "Grid: BFS vs DFS" }).click();
  await expect(
    page.getByRole("region", { name: "Left simulation" }),
  ).toContainText("Grid BFS");
  await page
    .getByRole("button", { name: "Tree: preorder vs level order" })
    .click();
  await expect(
    page.getByRole("region", { name: "Comparison result" }),
  ).toContainText("visit order differs");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
