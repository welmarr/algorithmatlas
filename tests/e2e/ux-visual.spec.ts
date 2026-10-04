import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test.skip(
  !process.env.VISUAL_UX_CAPTURE,
  "Run only for a requested visual audit",
);

test("capture the real anonymous UX wave", async ({ page }) => {
  test.setTimeout(360000);
  const root = resolve("artifacts/visual-audit/cses100-ux-polish");
  mkdirSync(root, { recursive: true });
  const shots: Array<{ route: string; file: string; viewport: string }> = [];
  const desktop = [
    ["/", "home"],
    ["/problems", "library"],
    ["/account/login", "login"],
    ["/account/register", "register"],
    ["/account/forgot-password", "forgot-password"],
    ["/account/verify-email", "verify-email"],
    ["/problems/increasing-array", "array"],
    ["/problems/message-route", "graph"],
    ["/problems/course-schedule", "topological-sort"],
    ["/problems/road-reparation", "mst"],
    ["/problems/shortest-routes-ii", "all-pairs-shortest-path"],
    ["/problems/company-queries-i", "binary-lifting"],
    ["/problems/forest-queries", "forest-prefix"],
    ["/problems/string-functions", "string-functions"],
    ["/problems/word-combinations", "word-combinations"],
    ["/problems/elevator-rides", "bitmask-dp"],
    ["/problems/counting-towers", "tower-dp"],
    ["/problems/edit-distance", "dp"],
    ["/problems/dynamic-range-sum", "range"],
    ["/problems/tree-diameter", "tree"],
    ["/problems/string-matching", "strings"],
    ["/problems/polygon-area", "geometry"],
    ["/problems/maximum-subarray-sum", "kadane"],
    ["/problems/subarray-sums-ii", "prefix-sums"],
    ["/problems/minimizing-coins", "coin-dp"],
    ["/problems/grid-paths-i", "grid-dp"],
    ["/problems/array-description", "table-dp"],
    ["/lab", "lab"],
    ["/lab/compare", "compare"],
    ["/own-code", "own-code"],
  ] as const;
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [route, name] of desktop) {
    await page.goto(route);
    if (route.startsWith("/problems/")) {
      await expect(page.locator(".choreography-stage")).toBeVisible();
      await page.getByRole("button", { name: "Next step" }).click();
      if (
        [
          "mst",
          "all-pairs-shortest-path",
          "forest-prefix",
          "word-combinations",
        ].includes(name)
      )
        await page.getByRole("button", { name: "Next step" }).click();
    }
    const file = "desktop-" + name + ".png";
    await page.screenshot({ path: resolve(root, file), fullPage: true });
    shots.push({ route, file, viewport: "1440x900" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [route, name] of [
    ["/", "home"],
    ["/problems", "library"],
    ["/account/login", "login"],
    ["/problems/increasing-array", "array"],
    ["/problems/grid-paths-i", "grid-dp"],
    ["/problems/road-reparation", "mst"],
    ["/problems/course-schedule", "topological-sort"],
    ["/problems/forest-queries", "forest-prefix"],
    ["/problems/word-combinations", "word-combinations"],
  ] as const) {
    await page.goto(route);
    if (route.startsWith("/problems/")) {
      await expect(page.locator(".choreography-stage")).toBeVisible();
      await page.getByRole("button", { name: "Next step" }).click();
      if (["mst", "forest-prefix", "word-combinations"].includes(name))
        await page.getByRole("button", { name: "Next step" }).click();
    }
    const file = "mobile-" + name + ".png";
    await page.screenshot({ path: resolve(root, file), fullPage: true });
    shots.push({ route, file, viewport: "390x844 reduced motion" });
  }
  writeFileSync(
    resolve(root, "manifest.json"),
    JSON.stringify(shots, null, 2) + "\n",
  );
  expect(shots).toHaveLength(39);
});
