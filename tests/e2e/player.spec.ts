import { expect, test } from "@playwright/test";

test("browse, learn, and replay an array problem", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Choose a starting point" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Increasing Array/ }).click();
  await expect(
    page.getByRole("heading", { name: "Increasing Array" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Learn the idea" }).click();
  await expect(
    page.getByRole("heading", { name: /Each value must reach/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Simulation/ }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByText("LEARNING STEP 1 /", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".code-line.active")).toContainText(
    "values[i] = required",
  );
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(
    page.getByText("LEARNING STEP 0 /", { exact: false }),
  ).toBeVisible();
  const seek = page.getByRole("slider", { name: "Learning position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("5");
});

test("new representative problems regenerate their own traces from custom input", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".problem-card")).toHaveCount(20);
  await page.goto("/problems/edit-distance");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("JSON input").fill('{"first":"CAT","second":"CUT"}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  const seek = page.getByRole("slider", { name: "Learning position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("1");
  await expect(page.locator(".dp-visual")).toBeVisible();

  await page.goto("/problems/road-construction");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".graph-edge")).toHaveCount(0);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".graph-edge")).toHaveCount(1);
  await page
    .getByLabel("JSON input")
    .fill('{"cities":3,"roads":[[1,2],[2,3]]}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  const roadSeek = page.getByRole("slider", { name: "Learning position" });
  await roadSeek.focus();
  await roadSeek.press("End");
  await expect(page.locator(".result")).toContainText("2 2 | 1 3");
});

test("custom input regenerates a deterministic trace and built-in teacher explains a step", async ({
  page,
}) => {
  await page.goto("/problems/increasing-array");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("JSON input").fill('{"values":[1,2,3]}');
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await page.getByRole("button", { name: "Technical events" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Explain current event" }).click();
  await expect(page.locator(".teacher-panel p")).toContainText("Read index 0");
  await page.getByRole("button", { name: "Hint for current step" }).click();
  await expect(page.locator(".teacher-panel p").last()).toContainText(
    "Hint: Inspect the highlighted entity",
  );
  const seek = page.getByRole("slider", { name: "Technical event position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("0");
  await page.getByRole("button", { name: "Rewind to start" }).click();
  await expect(
    page.getByText("TECHNICAL EVENT 0 /", { exact: false }),
  ).toBeVisible();
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("0");
});

test("all five renderer routes load and invalid input is explained", async ({
  page,
}) => {
  for (const id of [
    "increasing-array",
    "labyrinth",
    "message-route",
    "tree-diameter",
    "dice-combinations",
  ]) {
    await page.goto(`/problems/${id}`);
    await expect(
      page.getByRole("region", { name: "Simulation visualization" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  }
  await page.goto("/problems/labyrinth");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("JSON input").fill('{"rows":["A.","##"]}');
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".input-panel [role=alert]")).toContainText(
    "exactly one A and one B",
  );
});

test("color and text distinguish reads from writes during replay", async ({
  page,
}) => {
  await page.goto("/problems/increasing-array");
  await expect(page.locator(".step-action")).toContainText("READY");
  await page.getByRole("button", { name: "Technical events" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-action.action-inspect")).toContainText(
    "READING",
  );
  await expect(
    page.locator(".array-visual .is-active.cue-inspect"),
  ).toHaveAttribute("aria-label", /current inspect/);
  await page
    .locator(".event-panel li")
    .filter({ hasText: "WRITE INDEX" })
    .first()
    .getByRole("button")
    .click();
  await expect(page.locator(".step-action.action-update")).toContainText(
    "Index 1: 2 → 3",
  );
  await expect(
    page.locator(".array-visual .is-active.cue-update .value-change"),
  ).toHaveText("2 → 3");
  await page.getByRole("button", { name: "Rewind to start" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-action.action-inspect")).toBeVisible();
});

test("edited code and input change the executed trace", async ({ page }) => {
  await page.goto("/problems/increasing-array");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.getByRole("button", { name: "Technical events" }).click();
  const expectedWrites = [
    { values: [8, 8, 5, 1, 7], moves: "6", detail: "Index 1: 2 → 8" },
    { values: [8, 8, 8, 1, 7], moves: "9", detail: "Index 2: 5 → 8" },
    { values: [8, 8, 8, 8, 7], moves: "16", detail: "Index 3: 1 → 8" },
    { values: [8, 8, 8, 8, 8], moves: "17", detail: "Index 4: 7 → 8" },
  ];
  const writes = page
    .locator(".event-panel li")
    .filter({ hasText: "WRITE INDEX" });
  await expect(writes).toHaveCount(4);
  for (const [index, expected] of expectedWrites.entries()) {
    await writes.nth(index).getByRole("button").click();
    await expect(
      page.locator(".array-visual .visual-entity strong"),
    ).toHaveText(expected.values.map(String));
    await expect(page.locator(".step-action.action-update")).toContainText(
      expected.detail,
    );
    await expect(
      page
        .locator(".structures-panel .variable-row")
        .filter({ hasText: "moves" }),
    ).toContainText(expected.moves);
  }
  let seek = page.getByRole("slider", { name: "Technical event position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("17");
  await expect(page.locator(".array-visual .visual-entity strong")).toHaveText([
    "8",
    "8",
    "8",
    "8",
    "8",
  ]);

  await page
    .getByLabel("JavaScript subset")
    .fill(
      "let total = 0;\nfor (let i = 0; i < values.length; i++) {\n  values[i] = values[i] + 1;\n  total = total + values[i];\n}\nreturn total;",
    );
  await page.getByRole("button", { name: "Run code & input" }).click();
  seek = page.getByRole("slider", { name: "Learning position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("28");
  await expect(page.locator(".array-visual .visual-entity strong")).toHaveText([
    "9",
    "3",
    "6",
    "2",
    "8",
  ]);
  await expect(page.locator(".code-line.active")).toContainText("return total");

  await page.getByLabel("JSON input").fill('{"values":[1,1]}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  seek = page.getByRole("slider", { name: "Learning position" });
  await seek.focus();
  await seek.press("End");
  await expect(page.locator(".result")).toContainText("4");
  await expect(page.locator(".array-visual .visual-entity strong")).toHaveText([
    "2",
    "2",
  ]);
  await page
    .getByLabel("JavaScript subset")
    .fill("fetch('https://example.com'); return 0;");
  await page.getByRole("button", { name: "Run code & input" }).click();
  await expect(page.locator(".code-editor-wrap [role=alert]")).toContainText(
    "Unsupported expression",
  );
  await expect(page.locator(".result")).toContainText("4");
});

test("reduced motion keeps action cues without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/problems/increasing-array");
  await page.getByRole("button", { name: "Technical events" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-action.action-inspect")).toBeVisible();
  const animation = await page
    .locator(".array-visual .is-active")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
  const transition = await page
    .locator(".array-visual .is-active")
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition).toBe("0s");
});

test("Increasing Array presents six input-dependent learning steps and retains raw events", async ({
  page,
}) => {
  await page.goto("/problems/increasing-array");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.locator(".teaching-panel li")).toHaveCount(6);
  await expect(page.locator(".teaching-panel")).toContainText(
    "Increase 2 → 8 (+6)",
  );
  await expect(page.locator(".teaching-panel")).toContainText(
    "Increase 7 → 8 (+1)",
  );
  await expect(page.locator(".visual-legend")).not.toContainText("Final path");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-action.action-update")).toContainText(
    "change 2 to 8",
  );
  await expect(page.locator(".array-visual .visual-entity strong")).toHaveText([
    "8",
    "8",
    "5",
    "1",
    "7",
  ]);
  await page.getByRole("slider", { name: "Learning position" }).focus();
  await page.getByRole("slider", { name: "Learning position" }).press("End");
  await expect(page.locator(".result")).toContainText("17");
  await page.getByRole("button", { name: "Technical events" }).click();
  await expect(page.getByText("TECHNICAL EVENT 29 / 29")).toBeVisible();
  await expect(page.locator(".event-panel li")).toHaveCount(29);
  await page.getByRole("slider", { name: "Technical event position" }).focus();
  await page
    .getByRole("slider", { name: "Technical event position" })
    .press("Home");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("TECHNICAL EVENT 1 / 29")).toBeVisible();
  await page.getByRole("button", { name: "Learning steps" }).click();
  await page.getByRole("button", { name: "Rewind to start" }).click();
  await page
    .getByRole("combobox", { name: "Playback speed" })
    .selectOption("4");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".result")).toContainText("17");
});

test("tree and DP visualizations stay within a 390px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ["tree-diameter", "dice-combinations"]) {
    await page.goto(`/problems/${id}`);
    await expect(
      page.getByRole("region", { name: "Simulation visualization" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      panel: document.querySelector(".visual-panel")!.getBoundingClientRect()
        .right,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.panel).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("all ten renderer families have labeled responsive views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/lab/renderers");
  await expect(
    page.getByRole("heading", { name: "Structure gallery" }),
  ).toBeVisible();
  const kinds = [
    "array",
    "grid",
    "graph",
    "tree",
    "dp",
    "queue",
    "stack",
    "heap",
    "variables",
    "code",
  ];
  for (const kind of kinds)
    await expect(page.locator(`[data-renderer-kind="${kind}"]`)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Queue", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Stack", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Priority queue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Dynamic programming values" }),
  ).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
    cards: Array.from(document.querySelectorAll(".renderer-gallery-card")).map(
      (card) => card.getBoundingClientRect().right,
    ),
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  for (const right of widths.cards)
    expect(right).toBeLessThanOrEqual(widths.viewport);
});
