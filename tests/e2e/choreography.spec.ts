import { expect, test } from "@playwright/test";

test("reasoning phases show the comparison before a forced increment and settle exactly", async ({
  page,
}) => {
  await page.goto("/problems/increasing-array");
  await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.locator(".reasoning-equation")).toContainText(
    "2 < 8 · 2 → 8 · +6 · total 6",
  );
  await page.getByRole("button", { name: "compare", exact: true }).click();
  await expect(page.locator(".array-visual strong")).toHaveText([
    "8",
    "2",
    "5",
    "1",
    "7",
  ]);
  await expect(page.locator(".array-visual .cell-cue")).toHaveText([
    "Previous",
    "Current",
  ]);
  await page.getByRole("button", { name: "settle", exact: true }).click();
  await expect(page.locator(".array-visual strong")).toHaveText([
    "8",
    "8",
    "5",
    "1",
    "7",
  ]);
  await page.getByRole("button", { name: "Animate reasoning" }).click();
  await page.getByRole("button", { name: "Pause reasoning" }).click();
  const phase = await page
    .locator(".choreography-stage")
    .getAttribute("data-phase");
  await page.waitForTimeout(600);
  await expect(page.locator(".choreography-stage")).toHaveAttribute(
    "data-phase",
    phase!,
  );
  await page.getByRole("button", { name: "Rewind to start" }).click();
  await expect(page.locator(".array-visual strong")).toHaveText([
    "8",
    "2",
    "5",
    "1",
    "7",
  ]);
  await page.waitForTimeout(650);
  await expect(page.locator(".choreography-stage")).toHaveAttribute(
    "data-position",
    "0",
  );
});

test("sorting moves identified cards and reduced motion keeps the reasoning", async ({
  page,
}) => {
  await page.goto("/problems/sum-of-two-values");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.locator(".original-index")).toHaveCount(6);
  await page.getByRole("button", { name: "Animate reasoning" }).click();
  await page.getByRole("button", { name: "transform", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".array-visual")
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".array-visual")
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await expect(page.locator(".reasoning-equation")).toContainText("↔");
  await page.getByRole("slider", { name: "Learning position" }).focus();
  await page.getByRole("slider", { name: "Learning position" }).press("End");
  await expect(page.locator(".result")).toContainText("1 6");
});

test("family-specific views fit all target viewports", async ({
  page,
}, testInfo) => {
  test.slow();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of [
      "polygon-area",
      "factory-machines",
      "edit-distance",
      "chessboard-and-queens",
      "shortest-routes-i",
      "increasing-array",
      "sum-of-two-values",
      "labyrinth",
      "tree-diameter",
      "dice-combinations",
    ]) {
      await page.goto(`/problems/${id}`);
      await expect(page.locator(".choreography-stage")).toBeVisible();
      if (viewport.width === 1280 && process.env.VISUAL_CAPTURE === "1") {
        if (id === "increasing-array") {
          await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
          await page.getByRole("button", { name: "Run simulation" }).click();
        }
        const steps: Record<string, number> = {
          "increasing-array": 1,
          "sum-of-two-values": 6,
          labyrinth: 6,
          "tree-diameter": 6,
          "dice-combinations": 4,
          "shortest-routes-i": 8,
          "polygon-area": 1,
          "factory-machines": 5,
          "chessboard-and-queens": 4,
          "edit-distance": 12,
        };
        for (let i = 0; i < steps[id]; i++)
          await page
            .getByRole("button", { name: "Next step", exact: true })
            .click();
        await page
          .locator(".visual-panel")
          .screenshot({ path: testInfo.outputPath(`${id}.png`) });
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      if (id === "polygon-area")
        await expect(
          page.getByRole("img", {
            name: "Polygon and directed edge contributions",
          }),
        ).toBeVisible();
    }
  }
});
