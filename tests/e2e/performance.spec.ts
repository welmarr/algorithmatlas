import { expect, test } from "@playwright/test";

test("measure bounded array player generation and browser seek", async ({
  page,
}) => {
  test.skip(process.env.PERF_BROWSER !== "1", "opt-in browser benchmark");
  await page.goto("/problems/increasing-array");
  await page.waitForLoadState("networkidle");
  const values = Array.from({ length: 64 }, (_, index) => 100 - index);
  await page.getByLabel("JSON input").fill(JSON.stringify({ values }));
  const generationStart = Date.now();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.locator(".array-visual .visual-entity")).toHaveCount(64);
  const generationAndRenderMs = Date.now() - generationStart;
  await page.getByRole("button", { name: "Technical events" }).click();
  const slider = page.getByRole("slider", { name: "Technical event position" });
  const eventCount = Number(await slider.getAttribute("max"));
  const seekStart = Date.now();
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(".result")).toContainText("2016");
  const seekAndRenderMs = Date.now() - seekStart;
  const rendered = await page.evaluate(() => ({
    entities: document.querySelectorAll(".array-visual .visual-entity").length,
    eventRows: document.querySelectorAll(".event-panel li").length,
    heapUsed:
      (performance as Performance & { memory?: { usedJSHeapSize: number } })
        .memory?.usedJSHeapSize ?? null,
  }));
  process.stdout.write(
    `BROWSER_PERF ${JSON.stringify({ eventCount, generationAndRenderMs, seekAndRenderMs, ...rendered })}\n`,
  );
});
