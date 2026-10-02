import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import { problems, getProblem } from "@sim/problems";
import { createChoreography } from "@sim/visual-choreography";
import type { AlgorithmEvent } from "@sim/semantic-events";
export const viewports = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
export const root = resolve(
  process.env.VISUAL_AUDIT_DIR ?? "artifacts/visual-audit/development-capture",
);
if (
  !root.startsWith(
    resolve("artifacts", "visual-audit") +
      (process.platform === "win32" ? "\\" : "/"),
  )
)
  throw new Error(
    "Capture directory must remain under project artifacts/visual-audit",
  );
mkdirSync(root, { recursive: true });
export const shots: Record<string, unknown>[] = [];
export const omissions: Record<string, string>[] = [];
export function fixture(id: string) {
  return id === "increasing-array"
    ? { values: [8, 2, 5, 1, 7] }
    : getProblem(id)!.defaultInput;
}
export function plans(id: string) {
  const problem = getProblem(id)!,
    run = problem.run(fixture(id));
  try {
    return run.teachingSteps.map((step) => {
      run.timeline.seek(step.eventRange.end);
      const plan = createChoreography(
        run.timeline,
        problem.metadata.renderer,
        problem.metadata.tags,
        step,
      );
      return {
        step,
        plan,
        events: run.events.slice(
          Math.max(0, step.eventRange.start - 1),
          step.eventRange.end,
        ),
        text: JSON.stringify(plan.reducedMotion.actions),
      };
    });
  } finally {
    run.timeline.dispose();
  }
}
export function selectStep(
  id: string,
  predicate: (event: AlgorithmEvent) => boolean,
  occurrence = 0,
) {
  const matches = plans(id).filter((item) => item.events.some(predicate));
  if (!matches[occurrence])
    throw new Error("Required meaningful state missing: " + id);
  return matches[occurrence].step.index;
}
export function representative(id: string) {
  const all = plans(id);
  if (id === "increasing-array") return 1;
  if (id === "dice-combinations")
    return selectStep(
      id,
      (e) => e.type === "DP_UPDATE" && e.entities.length > 1,
      3,
    );
  if (id === "edit-distance")
    return selectStep(
      id,
      (e) => e.type === "DP_UPDATE" && e.entities.length >= 4,
    );
  if (id === "shortest-routes-i")
    return selectStep(id, (e) => e.type === "RELAX_EDGE");
  if (id === "chessboard-and-queens")
    return selectStep(id, (e) => e.explanation.startsWith("Place a queen"), 1);
  if (id === "sum-of-two-values")
    return selectStep(
      id,
      (e) => e.pedagogy?.equation?.includes(" < ") === true,
    );
  return (
    all.find(
      (item) =>
        item.step.index > 0 &&
        item.plan.reducedMotion.actions.some((a) => a.type === "SHOW_EQUATION"),
    )?.step.index ?? Math.min(4, all.length - 2)
  );
}
export async function loadProblem(
  page: Page,
  id: string,
  step = representative(id),
) {
  await page.goto("/problems/" + id);
  await page.getByLabel("JSON input").fill(JSON.stringify(fixture(id)));
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await seek(page, id, step);
}
export async function seek(
  page: Page,
  id: string,
  step: number,
  phase = "settle",
) {
  const slider = page.getByRole("slider", {
    name: "Learning position",
    exact: true,
  });
  await slider.fill(String(step));
  await expect(slider).toHaveValue(String(step));
  await page
    .getByRole("group", { name: "Reasoning phases" })
    .getByRole("button", { name: phase, exact: true })
    .click();
  await expect(page.locator(".choreography-stage")).toHaveAttribute(
    "data-phase",
    phase,
  );
  const entry = plans(id)[step];
  return {
    fixture: fixture(id),
    teachingStep: entry.step.id,
    teachingStepTitle: entry.step.title,
    technicalEventPosition: Number(
      await page.locator(".choreography-stage").getAttribute("data-position"),
    ),
    choreographyPhase: phase,
  };
}
export async function capture(
  page: Page,
  category: string,
  name: string,
  description: string,
  meta: Record<string, unknown> = {},
) {
  await page.evaluate(() => document.fonts.ready);
  const passwords = page.locator('input[type="password"]');
  for (let i = 0; i < (await passwords.count()); i++)
    if (await passwords.nth(i).inputValue())
      throw new Error("Clear password before screenshot");
  const text = await page.locator("body").innerText();
  if (
    /(?:postgres(?:ql)?:\/\/|Bearer [a-zA-Z0-9_-]{24}|[A-Z]:\\\\Users\\|#token=[A-Za-z0-9_-]{43})/.test(
      text,
    )
  )
    throw new Error("Sensitive content detected; capture refused");
  const viewport = page.viewportSize()!;
  const preset =
    Object.entries(viewports).find(
      ([, v]) => v.width === viewport.width,
    )?.[0] ?? "custom";
  const filename = category + "/" + name + "-" + preset + ".png";
  if (shots.some((s) => s.filename === filename))
    throw new Error("Duplicate capture filename: " + filename);
  const output = join(root, filename);
  mkdirSync(join(root, category), { recursive: true });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
  }));
  await page.screenshot({
    path: output,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  const stage = page.locator(".choreography-stage").first();
  shots.push({
    filename,
    category,
    route: page.url().startsWith("http")
      ? new URL(page.url()).pathname
      : "email-preview",
    viewport,
    authState: "anonymous",
    fixture: null,
    teachingStep: null,
    technicalEventPosition: (await stage.count())
      ? Number(await stage.getAttribute("data-position"))
      : null,
    choreographyPhase: (await stage.count())
      ? await stage.getAttribute("data-phase")
      : null,
    reducedMotion: await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    fullPage: true,
    description,
    expectedPurpose: description,
    overflow: overflow.scrollWidth > overflow.viewportWidth ? overflow : null,
    ...meta,
  });
  writeManifest(false);
  expect(
    overflow.scrollWidth,
    "Unexpected page-level overflow: " + filename,
  ).toBeLessThanOrEqual(overflow.viewportWidth);
}
function sourceRoutes() {
  const base = resolve("apps/web/src/app"),
    routes: { route: string; category: string; source: string }[] = [];
  function walk(path: string) {
    for (const e of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.tsx") {
        const pathRoute = "/" + relative(base, path).replaceAll("\\", "/");
        const route = pathRoute === "/" ? "/" : pathRoute;
        const category = route.startsWith("/problems")
          ? "problem"
          : route === "/lab/compare"
            ? "compare"
            : route.startsWith("/lab")
              ? "lab"
              : route === "/own-code"
                ? "own-code"
                : route === "/account/settings"
                  ? "settings"
                  : route === "/dashboard"
                    ? "account"
                    : route.startsWith("/account")
                      ? "auth"
                      : "public";
        for (const actual of route.includes("[id]")
          ? problems.map((p) => route.replace("[id]", p.metadata.id))
          : [route])
          routes.push({
            route: actual,
            category,
            source: relative(resolve("."), full).replaceAll("\\", "/"),
          });
      }
    }
  }
  walk(base);
  routes.push({
    route: "/visual-audit-not-found",
    category: "error",
    source: "Next built-in 404",
  });
  return routes;
}
export const inventory = sourceRoutes();
export function writeManifest(complete: boolean) {
  writeFileSync(
    join(root, "route-inventory.json"),
    JSON.stringify(
      {
        routes: inventory,
        notes: [
          "Home is also the catalog.",
          "Sign-in and registration share /account.",
          "Error boundaries are states, not separate routes.",
          "There is no public administration route.",
        ],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(root, "manifest.json"),
    JSON.stringify(
      {
        schemaVersion: "1.0",
        generatedAt: new Date().toISOString(),
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
          windowsHide: true,
        }).trim(),
        complete,
        darkModeSupported: false,
        viewports,
        screenshots: shots,
        omissions,
        routesNotCaptured: inventory.filter(
          (r) => !shots.some((s) => s.route === r.route),
        ),
        purpose:
          "Actual UI capture for external human review; not visual-regression certification.",
      },
      null,
      2,
    ),
  );
}
