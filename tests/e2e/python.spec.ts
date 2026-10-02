import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { databasePool } from "@sim/persistence";
import { emailLink } from "./mail";
test.skip(
  process.env.PYTHON_EXECUTION_ENABLED !== "local" &&
    process.env.PUBLIC_PYTHON_EXECUTION_ENABLED !== "true",
  "Requires the local Python orchestrator",
);
test("anonymous A–Z journey reaches edited Python and source-linked visual changes without AI", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("link", { name: /Increasing Array/ }).click();
  await page.getByRole("tab", { name: "Learn the idea" }).click();
  await expect(
    page.getByRole("heading", { name: /Each value must reach/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Simulation/ }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Technical events", exact: true })
    .click();
  await page.getByLabel("Playback speed").selectOption("2");
  await page.getByLabel("JSON input").fill('{"values":[8,2,5,1,7]}');
  await page
    .getByRole("button", { name: "Run simulation", exact: false })
    .click();
  const curated = page.getByRole("slider", { name: "Learning position" });
  await curated.focus();
  await curated.press("End");
  await expect(page.locator(".result")).toContainText("17");
  await page.getByRole("link", { name: "Algorithm Lab", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Index 0", exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Run algorithm", exact: true })
    .click();
  await expect(page.locator(".lab-result")).toContainText("0 1 2 5 7");
  await page.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page.locator("main")).toContainText("Compare");
  await page.getByRole("link", { name: "Own Code", exact: true }).click();
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.getByTestId("python-output")).toHaveText("17", {
    timeout: 20000,
  });
  await expect(page.locator(".array-visual .visual-entity")).toHaveCount(5);
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.locator(".code-line.active")).not.toHaveCount(0);
  const slider = page.getByRole("slider", { name: "Python playback position" });
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(".array-visual .visual-entity strong")).toHaveText([
    "8",
    "8",
    "8",
    "8",
    "8",
  ]);
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Technical events", exact: true })
    .click();
  await expect(page.locator(".python-position")).toContainText("EVENT");
  await page.getByLabel("Speed", { exact: true }).selectOption("1.5");
  await page.getByText("Raw trace ·", { exact: false }).click();
  await expect(page.locator(".python-trace")).toContainText('"moves"');
  const source = await page
    .getByLabel("Python source", { exact: true })
    .inputValue();
  await page
    .getByLabel("Python source", { exact: true })
    .fill(source.replace("return moves", "return moves + 10"));
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.getByTestId("python-output")).toHaveText("27", {
    timeout: 20000,
  });
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(page.locator(".python-save")).toContainText("Sign in");
  await page.getByLabel("Example", { exact: true }).selectOption("graph");
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.getByTestId("python-output")).toHaveText("[0,4,6]", {
    timeout: 20000,
  });
  await expect(page.locator(".graph-wrap")).toBeVisible();
  await slider.focus();
  await slider.press("End");
  await page.getByLabel("Example", { exact: true }).selectOption("raw");
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.getByTestId("python-output")).toHaveText("30", {
    timeout: 20000,
  });
  await page.getByText("How this view was inferred", { exact: true }).click();
  await expect(page.locator(".python-stage")).toContainText(
    "No supported structure",
  );
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1280, 800],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  expect(
    await page
      .locator(".python-stage")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  if (process.env.VISUAL_CAPTURE === "1")
    await page.screenshot({
      path: info.outputPath("python-player.png"),
      fullPage: true,
    });
});
test("browser Python errors, cancellation and capability ownership are enforced", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/own-code");
  await page.getByLabel("Python source", { exact: true }).fill("def solve(:");
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.locator(".python-error")).toContainText(
    "PYTHON_SYNTAX_ERROR",
    {
      timeout: 15000,
    },
  );
  await page
    .getByLabel("Python source", { exact: true })
    .fill(
      "def solve(data):\n    try:\n        while True:\n            pass\n    except Exception:\n        while True:\n            pass",
    );
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel execution", exact: true })
    .click();
  await expect(page.locator(".python-error")).toContainText(
    "PYTHON_CANCELLED",
    {
      timeout: 15000,
    },
  );
  const origin = new URL(page.url()).origin;
  const rejected = await page.request.post("/api/python/jobs", {
    headers: { origin: "https://attacker.test" },
    data: { source: "def solve(data): return 1", input: {} },
  });
  expect(rejected.status()).toBe(403);
  const job = await (
    await page.request.post("/api/python/jobs", {
      headers: { origin },
      data: { source: "def solve(data): return 1", input: {} },
    })
  ).json();
  expect(job.id).toBeTruthy();
  expect((await page.request.get(`/api/python/jobs/${job.id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await page.request.delete(`/api/python/jobs/${job.id}`, {
        headers: { origin, "x-job-capability": "a".repeat(43) },
      })
    ).status(),
  ).toBe(404);
  const cancel = await page.request.delete(`/api/python/jobs/${job.id}`, {
    headers: { origin, "x-job-capability": job.capability },
  });
  expect(cancel.status()).toBe(200);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/python/jobs/${job.id}`, {
              headers: { "x-job-capability": job.capability },
            })
          ).json()
        ).status,
    )
    .toMatch(/cancelled|completed/);
});
test("verified Python workspace survives logout/login, rejects another owner, and reruns", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.E2E_DATABASE_URL || !process.env.MAILPIT_API,
    "Requires PostgreSQL and local mail",
  );
  test.setTimeout(90000);
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
  const email = `python-${randomUUID()}@example.test`,
    password = "python workspace password";
  const origin = `http://localhost:${process.env.E2E_PORT ?? "3000"}`;
  try {
    const created = await page.request.post("/api/auth/register", {
      headers: { origin },
      data: { email, password, confirmPassword: password },
    });
    expect(created.status()).toBe(201);
    await page.goto(await emailLink(page.request, email, "verify"));
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await page.goto("/own-code");
    await page.getByRole("button", { name: "Run Python", exact: true }).click();
    await expect(page.getByTestId("python-output")).toHaveText("17", {
      timeout: 15000,
    });
    await page
      .getByLabel("Workspace name", { exact: true })
      .fill("Python four increases");
    await page
      .getByRole("button", { name: "Save workspace", exact: true })
      .click();
    await expect(page.locator(".python-save")).toContainText("Workspace saved");
    const href = await page
      .getByRole("link", { name: "Python four increases", exact: true })
      .getAttribute("href");
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Python four increases", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.goto("/account");
    const form = page.locator("form[action='/api/auth/login']");
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Password", { exact: true }).fill(password);
    await form.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("link", { name: "Python four increases", exact: true })
      .click();
    await expect(page.locator(".python-save")).toContainText(
      "Saved workspace loaded",
    );
    await page.getByRole("button", { name: "Run Python", exact: true }).click();
    await expect(page.getByTestId("python-output")).toHaveText("17", {
      timeout: 15000,
    });
    const other = await browser.newContext({ baseURL: origin });
    const id = new URL(href!, origin).searchParams.get("saved");
    expect(
      (await other.request.get(`/api/progress/workspaces/${id}`)).status(),
    ).toBe(401);
    await other.close();
  } finally {
    await databasePool().query("DELETE FROM users WHERE email=$1", [email]);
  }
});
