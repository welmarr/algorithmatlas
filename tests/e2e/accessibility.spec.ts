import { expect, test } from "@playwright/test";

test("problem tabs and playback work from the keyboard", async ({ page }) => {
  await page.goto("/problems/increasing-array");
  const simulate = page.getByRole("tab", { name: /Simulation/ });
  await simulate.focus();
  await simulate.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Learn the idea" })).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Learn the idea" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(simulate).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: /Simulation/ }),
  ).toBeVisible();
  const next = page.getByRole("button", { name: "Next step" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".step-action")).toContainText("VALUE CHANGED");
  await expect(page.locator(".step-action")).toContainText("change 2 to 3");
});

test("mobile player fits and reduced motion disables focus animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/problems/increasing-array");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".array-visual .is-active")).toBeVisible();
  const audit = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    animation: getComputedStyle(
      document.querySelector(".array-visual .is-active")!,
    ).animationName,
    focusKind: document.querySelector(".step-action")?.textContent,
  }));
  expect(audit.scrollWidth).toBeLessThanOrEqual(audit.viewportWidth);
  expect(audit.animation).toBe("none");
  expect(audit.focusKind).toContain("VALUE CHANGED");
});
