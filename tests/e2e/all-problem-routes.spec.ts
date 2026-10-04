import { expect, test } from "@playwright/test";
import { problems } from "@sim/problems";

test("every registered CSES route opens a working simulator", async ({
  page,
}) => {
  test.setTimeout(240000);
  for (const problem of problems) {
    const response = await page.goto("/problems/" + problem.metadata.id);
    expect(response?.status(), problem.metadata.id).toBe(200);
    await expect(
      page.getByRole("heading", { name: problem.metadata.title }),
    ).toBeVisible();
    await expect(page.locator(".choreography-stage")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next step" })).toBeVisible();
    await expect(page.getByLabel("JSON input")).toHaveValue(
      JSON.stringify(problem.defaultInput, null, 2),
    );
    await page
      .getByLabel("JSON input")
      .fill(problem.metadata.examples[0].input);
    await page.getByRole("button", { name: "Run simulation" }).click();
    await expect(page.locator(".input-panel .error")).toHaveCount(0);
    await expect(page.locator(".choreography-stage")).toBeVisible();
  }
});
