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

test("measure production Home and 100-entry Library interactions", async ({
  page,
}) => {
  test.skip(process.env.PERF_BROWSER !== "1", "opt-in browser benchmark");
  const homeStart = Date.now();
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Watch a greedy choice take shape" }),
  ).toBeVisible();
  const homeReadyMs = Date.now() - homeStart;

  const libraryStart = Date.now();
  await page.goto("/problems");
  await expect(page.getByRole("status")).toContainText("100 of 100");
  const libraryReadyMs = Date.now() - libraryStart;
  const search = page.getByRole("searchbox", { name: "Search problems" });
  const searches: Record<string, number> = {};
  for (const [query, expected] of [
    ["Dijkstra shortest-path DAG counting", "1 of 100"],
    ["1094", "1 of 100"],
    ["orientation", "2 of 100"],
  ]) {
    const start = Date.now();
    await search.fill(query);
    await expect(page.getByRole("status")).toContainText(expected);
    searches[query] = Date.now() - start;
  }
  const clearStart = Date.now();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toContainText("100 of 100");
  const clearMs = Date.now() - clearStart;
  process.stdout.write(
    `LIBRARY_PERF ${JSON.stringify({ homeReadyMs, libraryReadyMs, searches, clearMs })}\n`,
  );
});
