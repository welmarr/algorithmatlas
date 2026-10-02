import { expect, test } from "@playwright/test";

test("the independent lab edits an array and replays teaching and technical steps", async ({
  page,
}) => {
  await page.goto("/lab");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", {
      name: "Build an input. Follow the algorithm.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Lab visualization" }),
  ).toBeVisible();
  await expect(page.locator(".lab-result")).toContainText("1 2 5 7 8");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".lab-annotation")).toContainText("STEP 1");
  await page
    .getByRole("group", { name: "Playback mode" })
    .getByRole("button", { name: "Technical events" })
    .click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".lab-annotation")).toContainText("EVENT");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".lab-position")).toContainText("0 /");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect
    .poll(async () => page.locator(".lab-position").innerText())
    .not.toMatch(/^0 \/ /);
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("spinbutton", { name: "Index 0" }).fill("0");
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-result")).toContainText("0 1 2 5 7");
  await page
    .getByRole("group", { name: "Algorithm" })
    .getByRole("button", { name: "Linear search" })
    .click();
  await expect(page.locator(".lab-result")).toContainText("2");
  await page.getByRole("button", { name: "Add value" }).click();
  await page.getByRole("spinbutton", { name: "Index 5" }).fill("5");
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-result")).toContainText("2");
  await page.getByText("Teaching step map", { exact: false }).click();
  await expect(page.locator(".lab-step-map li").first()).toContainText(
    "Initial state",
  );
  await page.locator(".lab-step-map li").last().getByRole("button").click();
  await expect(page.locator(".lab-position")).not.toContainText("0 /");
  await page.getByRole("button", { name: "Restore example input" }).click();
  await expect(page.getByRole("spinbutton", { name: "Index 0" })).toHaveValue(
    "8",
  );
});

test("grid, graph, and tree editors change independent algorithm runs", async ({
  page,
}) => {
  await page.goto("/lab");
  await page.waitForLoadState("networkidle");
  const structure = page.getByRole("group", { name: "Structure" });
  await structure.getByRole("button", { name: "Grid" }).click();
  await page.getByRole("button", { name: "Row 1 column 2: open" }).click();
  await page.getByRole("button", { name: "Row 2 column 1: open" }).click();
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-result")).toContainText("No route");
  await page
    .getByRole("group", { name: "Algorithm" })
    .getByRole("button", { name: "Grid DFS" })
    .click();
  await expect(page.locator(".lab-result")).toContainText("No route");

  await structure.getByRole("button", { name: "Graph" }).click();
  await expect(page.locator(".lab-result")).toContainText("A → C → E");
  await page.getByRole("button", { name: "Remove edge C to E" }).click();
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-result")).toContainText("A → B → D → E");
  await page.getByRole("button", { name: "Remove node C" }).click();
  await page.getByRole("button", { name: "Add node" }).click();
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-control-panel [role=alert]")).toHaveCount(0);

  await structure.getByRole("button", { name: "Tree" }).click();
  await expect(page.locator(".lab-result")).toContainText(
    "1 → 2 → 4 → 5 → 3 → 6",
  );
  await page.getByLabel("Parent of node 3").selectOption("2");
  await page.getByRole("button", { name: "Run algorithm" }).click();
  await expect(page.locator(".lab-result")).toContainText(
    "1 → 2 → 3 → 6 → 4 → 5",
  );
});

test("lab controls and visual state fit a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab");
  await expect(
    page.getByRole("slider", { name: "Learning position" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Lab visualization" }),
  ).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
