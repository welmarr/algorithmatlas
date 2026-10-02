import { createHash, randomBytes, randomUUID } from "node:crypto";
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { problems } from "@sim/problems";
import {
  operationsPool,
  setControl,
  ExecutionStore,
  consumeQuota,
} from "@sim/operations";
import { emailLink } from "../e2e/mail";
import {
  capture,
  fixture,
  inventory,
  loadProblem,
  plans,
  representative,
  seek,
  selectStep,
  shots,
  viewports,
  writeManifest,
} from "./helpers";
test.describe.configure({ mode: "serial" });
let allComplete = false;
test.beforeAll(() => {
  if (
    process.env.VISUAL_CAPTURE_DISPOSABLE !== "1" ||
    !process.env.E2E_DATABASE_URL
  )
    throw new Error(
      "Visual capture requires an explicitly disposable database",
    );
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
});
test.afterAll(async () => {
  writeManifest(
    allComplete &&
      inventory.every((r) => shots.some((s) => s.route === r.route)),
  );
  await operationsPool().end();
});
let verifiedState: Awaited<ReturnType<BrowserContext["storageState"]>>;
const email = "visual-audit@example.test",
  password = "visual audit test password";
const origin = () => process.env.APP_URL!;
const pool = () => operationsPool();
async function resetQuota() {
  await pool().query("DELETE FROM rate_limits");
}
async function runPython(page: Page, source?: string, expected?: string) {
  await resetQuota();
  if (source !== undefined)
    await page.getByLabel("Python source", { exact: true }).fill(source);
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  if (expected)
    await expect(page.getByTestId("python-output")).toHaveText(expected, {
      timeout: 20000,
    });
}
async function snapProblem(
  page: Page,
  id: string,
  index: number,
  name: string,
  description: string,
  phase = "settle",
) {
  const meta = await seek(page, id, index, phase);
  await capture(page, "03-choreography", name, description, meta);
}
test("public routes, all registered problems and representative reasoning phases", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/");
  await capture(
    page,
    "00-overview",
    "home-catalog",
    "Home and catalog share one route; inspect navigation, primary action and problem discovery.",
  );
  for (const problem of problems) {
    const id = problem.metadata.id,
      index = representative(id);
    await loadProblem(page, id, index);
    await capture(
      page,
      "02-problems",
      "problem-" + plans(id)[index].step.id.replaceAll(":", "-"),
      problem.metadata.title +
        " at a meaningful input-dependent teaching step.",
      await seek(page, id, index),
    );
  }
  const representativeIds = [
    "increasing-array",
    "sum-of-two-values",
    "labyrinth",
    "shortest-routes-i",
    "tree-diameter",
    "dice-combinations",
    "edit-distance",
    "factory-machines",
    "chessboard-and-queens",
    "polygon-area",
  ];
  for (const id of representativeIds) {
    const index = representative(id);
    await loadProblem(page, id, index);
    const reason = plans(id)[index].plan.phases.some(
      (p) => p.purpose === "compare",
    )
      ? "compare"
      : "decide";
    for (const [label, phase] of [
      ["before", "focus"],
      ["reason", reason],
      ["after", "settle"],
    ])
      await snapProblem(
        page,
        id,
        index,
        id + "-" + label,
        "Triptych: " +
          id +
          " · " +
          label +
          ". Review explanation, semantic color and non-color cues.",
        phase,
      );
  }
  await loadProblem(page, "increasing-array", 1);
  await expect(page.locator(".reasoning-equation")).toContainText(
    "2 < 8 · 2 → 8 · +6 · total 6",
  );
  await snapProblem(
    page,
    "increasing-array",
    plans("increasing-array").length - 1,
    "increasing-array-final-17",
    "Final five eights and minimum total of 17 increments for [8,2,5,1,7].",
  );
  await expect(page.locator(".result")).toContainText("17");
  await page.getByRole("tab", { name: "Learn the idea" }).click();
  await capture(
    page,
    "01-public",
    "increasing-array-learn",
    "Concept and explanation view before using the simulator.",
  );
  await page.goto("/lab/renderers");
  await capture(
    page,
    "01-public",
    "renderer-gallery",
    "Actual renderer demonstration route.",
  );
  await page.goto("/visual-audit-not-found");
  await capture(
    page,
    "12-errors",
    "not-found",
    "Unknown route has a understandable 404 state.",
  );
});
test("specific pointer, traversal, relaxation, dependency and backtracking decisions", async ({
  page,
}) => {
  test.setTimeout(180000);
  const sum = "sum-of-two-values";
  await loadProblem(page, sum, 1);
  await snapProblem(
    page,
    sum,
    0,
    "sum-original-positions",
    "Original values and original positions before sorting.",
  );
  await snapProblem(
    page,
    sum,
    selectStep(sum, (e) => e.type === "SWAP"),
    "sum-sorting-identities",
    "Sorting preserves original positions; compare original and sorted identities.",
    "compare",
  );
  for (const [symbol, name] of [
    [" < ", "move-left"],
    [" > ", "move-right"],
    [" = 12", "match"],
  ]) {
    const step = selectStep(
      sum,
      (e) => !!e.pedagogy?.equation?.includes(symbol),
    );
    await snapProblem(
      page,
      sum,
      step,
      "sum-" + name,
      "Actual " + name + " decision for target 12, with pointer reasoning.",
      "compare",
    );
  }
  await snapProblem(
    page,
    sum,
    plans(sum).length - 1,
    "sum-original-answer-indices",
    "Match returns original answer positions 1 and 6.",
  );
  const bfs = "labyrinth";
  await loadProblem(page, bfs);
  for (const [name, index, description] of [
    [
      "frontier",
      selectStep(bfs, (e) => e.type === "QUEUE_PUSH", 3),
      "BFS queue/frontier and previously visited cells.",
    ],
    [
      "distance-layer",
      selectStep(
        bfs,
        (e) => e.type === "SET_CELL_DISTANCE" && e.payload.value === 3,
      ),
      "Distance layer three reached from the supplied maze.",
    ],
    [
      "target",
      selectStep(
        bfs,
        (e) => e.type === "VISIT_CELL" && e.entities.includes("grid:3:4"),
      ),
      "Target B reached by breadth-first search.",
    ],
    [
      "reconstruction",
      selectStep(bfs, (e) => e.type === "MARK", 2),
      "Path reconstruction while earlier cells remain visited.",
    ],
    [
      "final-path",
      plans(bfs).length - 1,
      "Completed shortest path through the maze.",
    ],
  ] as const) {
    await snapProblem(page, bfs, index, "labyrinth-" + name, description);
  }
  const dijkstra = "shortest-routes-i";
  await loadProblem(page, dijkstra);
  await snapProblem(
    page,
    dijkstra,
    selectStep(dijkstra, (e) => e.type === "HEAP_EXTRACT", 1),
    "dijkstra-minimum",
    "Priority queue minimum selection after initial relaxation.",
  );
  const relax = selectStep(
    dijkstra,
    (e) => e.type === "RELAX_EDGE" && !!e.pedagogy?.equation?.includes(" < "),
  );
  await snapProblem(
    page,
    dijkstra,
    relax,
    "dijkstra-candidate-equation",
    "Candidate equation, previous distance and decision to relax.",
    "compare",
  );
  await snapProblem(
    page,
    dijkstra,
    selectStep(dijkstra, (e) => e.type === "SET_DISTANCE", 2),
    "dijkstra-distance-updated",
    "Accepted relaxation changes the recorded distance.",
  );
  for (const id of [
    "dice-combinations",
    "edit-distance",
    "factory-machines",
    "polygon-area",
  ]) {
    await loadProblem(page, id);
    await snapProblem(
      page,
      id,
      representative(id),
      id + "-dependencies-or-decision",
      "Inspect actual dependencies, geometric representation or interval decision.",
      "compare",
    );
  }
  const queens = "chessboard-and-queens";
  await loadProblem(page, queens);
  for (const [name, predicate] of [
    [
      "candidate",
      (e: { explanation: string }) => e.explanation.startsWith("Consider row"),
    ],
    [
      "conflict",
      (e: { explanation: string }) => e.explanation.startsWith("Reject row"),
    ],
    [
      "placed",
      (e: { explanation: string }) =>
        e.explanation.startsWith("Place a queen at row 1"),
    ],
    [
      "deeper-recursion",
      (e: { explanation: string }) =>
        e.explanation.startsWith("Place a queen at row 3"),
    ],
    [
      "backtrack",
      (e: { explanation: string }) => e.explanation.startsWith("Backtrack"),
    ],
  ] as const) {
    await snapProblem(
      page,
      queens,
      selectStep(queens, predicate),
      "queens-" + name,
      "Backtracking: " + name + " with explicit reason and cell cue.",
    );
    if (name === "conflict")
      await expect(page.locator(".grid-visual .role-rejected")).toHaveText("×");
  }
});
test("Lab editing and Compare synchronized and completed states", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const size of ["desktop", "mobile"] as const) {
    await page.setViewportSize(viewports[size]);
    await page.goto("/lab");
    await capture(
      page,
      "04-lab",
      "lab-initial",
      "Lab default editable structure and available algorithms.",
    );
    await page
      .getByRole("spinbutton", { name: "Index 0", exact: true })
      .fill("0");
    await capture(
      page,
      "04-lab",
      "lab-edited",
      "Edited array before rerunning; input is visibly under user control.",
      { fixture: { values: [0, 2, 5, 1, 7] } },
    );
    await page
      .getByRole("button", { name: "Run algorithm", exact: true })
      .click();
    const slider = page.getByRole("slider", {
      name: "Learning position",
      exact: true,
    });
    await slider.fill("3");
    await capture(
      page,
      "04-lab",
      "lab-active",
      "Active teaching step for the edited array.",
    );
    await slider.fill((await slider.getAttribute("max"))!);
    await capture(
      page,
      "04-lab",
      "lab-completed",
      "Completed sort reflects the changed input.",
    );
  }
  await page.setViewportSize(viewports.desktop);
  await page.goto("/lab/compare");
  await capture(
    page,
    "05-compare",
    "compare-pair-input",
    "BFS and DFS share the same graph input and expose different route results.",
  );
  await page.getByRole("button", { name: "Play both", exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole("region", { name: "Right simulation" })
        .locator(".comparison-position")
        .innerText(),
    )
    .not.toMatch(/^0 \/ /);
  await page.getByRole("button", { name: "Pause both", exact: true }).click();
  // Choose a deterministic common event position after exercising synchronized play/pause.
  for (const side of ["Left", "Right"])
    await page
      .getByRole("slider", { name: side + " event position" })
      .fill("8");
  await capture(
    page,
    "05-compare",
    "compare-active",
    "Same event position; different BFS/DFS frontier and visited state.",
  );
  for (const side of ["Left", "Right"]) {
    const slider = page.getByRole("slider", { name: side + " event position" });
    await slider.fill((await slider.getAttribute("max"))!);
  }
  await capture(
    page,
    "05-compare",
    "compare-completed",
    "Completed route comparison makes the different paths visible.",
  );
});
test("Python observed execution, semantic view, raw fallback and actual operational errors", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/own-code");
  await capture(
    page,
    "06-python",
    "python-editor-initial",
    "Python source and JSON input before execution.",
  );
  await setControl("runner_paused", true);
  try {
    await runPython(page);
    await expect(page.locator(".python-status")).toHaveText(
      "Execution: queued",
    );
    await capture(
      page,
      "06-python",
      "python-queued",
      "A real durable job waiting while worker claims are paused.",
    );
  } finally {
    await setControl("runner_paused", false);
  }
  await expect(page.getByTestId("python-output")).toHaveText("17", {
    timeout: 20000,
  });
  await capture(
    page,
    "06-python",
    "python-completed",
    "Actual execution returns 17 and creates observed semantic events.",
  );
  await page
    .getByRole("slider", { name: "Python playback position" })
    .fill("4");
  await capture(
    page,
    "06-python",
    "python-teaching",
    "Observed changes linked to the executed source and teaching steps.",
  );
  await page
    .getByRole("button", { name: "Technical events", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Python playback position" })
    .fill("8");
  await page.getByText("Raw trace ·", { exact: false }).click();
  await capture(
    page,
    "06-python",
    "python-technical-raw",
    "Technical events and real line/local-variable trace.",
  );
  await page.getByLabel("Example", { exact: true }).selectOption("graph");
  await runPython(page, undefined, "[0,4,6]");
  await page
    .getByRole("slider", { name: "Python playback position" })
    .fill("4");
  await capture(
    page,
    "06-python",
    "python-graph",
    "Supported graph example maps actual execution into a graph view.",
  );
  await page.getByLabel("Example", { exact: true }).selectOption("raw");
  await runPython(page, undefined, "30");
  await page.getByText("How this view was inferred", { exact: true }).click();
  await capture(
    page,
    "06-python",
    "python-raw-fallback",
    "Unsupported structure uses the honest variables/source fallback.",
  );
  for (const [name, source, code] of [
    ["syntax-error", "def solve(:", "PYTHON_SYNTAX_ERROR"],
    ["runtime-error", "def solve(data): return 1 / 0", "PYTHON_RUNTIME_ERROR"],
    [
      "policy-error",
      "import socket\ndef solve(data): return socket.socket()",
      "PYTHON_POLICY_REJECTED",
    ],
    [
      "memory-limit",
      "def solve(data): return [0] * 30000000",
      "PYTHON_MEMORY_LIMIT",
    ],
    [
      "timeout",
      "def solve(data): return sum(range(1000000000))",
      "PYTHON_TIMEOUT",
    ],
  ]) {
    await runPython(page, source);
    if (name === "timeout") {
      await expect(page.locator(".python-status")).toHaveText(
        "Execution: running",
      );
      await capture(
        page,
        "06-python",
        "python-running",
        "A real CPU-heavy bounded program is running; its timeout is captured next.",
      );
    }
    await expect(page.locator(".python-error")).toContainText(code, {
      timeout: 20000,
    });
    await capture(
      page,
      "12-errors",
      "python-" + name,
      "Actual runner outcome: " + name + " with actionable user message.",
    );
  }
  await resetQuota();
  await setControl("runner_paused", true);
  const store = new ExecutionStore(),
    handles: {
      job: Awaited<ReturnType<ExecutionStore["submit"]>>;
      actor: Parameters<ExecutionStore["submit"]>[1];
    }[] = [];
  try {
    await runPython(page, "def solve(data): return 17");
    await expect(page.locator(".python-status")).toHaveText(
      "Execution: queued",
    );
    await page
      .getByRole("button", { name: "Cancel execution", exact: true })
      .click();
    await expect(page.locator(".python-error")).toContainText(
      "PYTHON_CANCELLED",
    );
    await capture(
      page,
      "13-operational",
      "python-cancelled",
      "User cancellation removes a queued job without executing it.",
    );
    for (let i = 0; i < 8; i++) {
      const actor = {
        clientHash: randomBytes(32).toString("hex"),
        ipHash: randomBytes(32).toString("hex"),
        ownerId: null,
        verified: false,
        idempotencyKey: randomUUID(),
      };
      handles.push({
        job: await store.submit(
          {
            schemaVersion: "0.1",
            source: "def solve(data): return 0",
            input: {},
          },
          actor,
        ),
        actor,
      });
    }
    await runPython(page);
    await expect(page.locator(".python-error")).toContainText(
      "PYTHON_QUEUE_FULL",
    );
    await capture(
      page,
      "13-operational",
      "python-queue-busy",
      "Actual queue saturation rejects one-above-capacity admission.",
    );
  } finally {
    for (const { job, actor } of handles)
      await store.access(job.id, job.capability, actor, "cancel");
    await setControl("runner_paused", false);
  }
  await resetQuota();
  const quota = createHash("sha256")
    .update("python:global-minute")
    .digest("hex");
  for (let i = 0; i < 60; i++) await consumeQuota(pool(), quota, 60, 60);
  await page.getByRole("button", { name: "Run Python", exact: true }).click();
  await expect(page.locator(".python-error")).toContainText(
    "PYTHON_RATE_LIMITED",
  );
  await capture(
    page,
    "13-operational",
    "python-rate-limited",
    "Real server-side global quota is exhausted in the disposable test fixture.",
  );
  await resetQuota();
  await setControl("python_disabled", true);
  try {
    await page.getByRole("button", { name: "Run Python", exact: true }).click();
    await expect(page.locator(".python-error")).toContainText(
      "PYTHON_DISABLED",
    );
    await capture(
      page,
      "13-operational",
      "python-disabled",
      "Operational kill switch explains temporary unavailability while the editor remains usable.",
    );
  } finally {
    await setControl("python_disabled", false);
  }
});
test("sanitized account, saved work, reset, email and error-boundary screens", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await resetQuota();
  await page.goto("/account");
  await capture(
    page,
    "07-auth",
    "sign-in-and-register",
    "Sign-in and create-account share a screen; anonymous learning stays available.",
  );
  const invalidRegistration = await page.request.post("/api/auth/register", {
    headers: { origin: origin() },
    data: { email, password, confirmPassword: "different test password" },
  });
  expect(invalidRegistration.status()).toBe(400);
  await page.goto("/account?error=AUTH_INVALID_INPUT");
  await capture(
    page,
    "07-auth",
    "registration-validation",
    "Registration validation explains password and confirmation requirements.",
  );
  const post = (action: string, data: unknown) =>
    page.request.post("/api/auth/" + action, {
      headers: { origin: origin() },
      data,
    });
  expect(
    (
      await post("register", {
        email,
        password,
        confirmPassword: password,
        name: "Visual audit",
      })
    ).status(),
  ).toBe(201);
  await page.goto("/account?notice=verification-sent");
  await capture(
    page,
    "07-auth",
    "verification-required",
    "New unverified account can continue learning while email is pending.",
    { authState: "unverified" },
  );
  const verifyUrl = await emailLink(page.request, email, "verify");
  await page.goto(verifyUrl);
  await expect(
    page.getByRole("button", { name: "Verify email", exact: true }),
  ).toBeEnabled();
  await capture(
    page,
    "07-auth",
    "verify-link",
    "Verification action with token removed from the visible URL.",
    { authState: "unverified" },
  );
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await capture(
    page,
    "07-auth",
    "verification-success",
    "Email verification succeeds and unlocks saving.",
    { authState: "verified" },
  );
  await page.goto("/dashboard");
  await capture(
    page,
    "08-account",
    "dashboard-empty",
    "Verified dashboard before any work is saved.",
    { authState: "verified" },
  );
  await loadProblem(page, "increasing-array", 1);
  await page.getByLabel("Save as").fill("Four increases");
  await page.getByRole("button", { name: "Save input", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Input saved");
  await page
    .getByRole("button", { name: "Save reference run", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Run saved");
  await capture(
    page,
    "08-account",
    "saved-problem-run",
    "Verified account saves the supplied input and actual curated result.",
    { authState: "verified", fixture: fixture("increasing-array") },
  );
  await page.goto("/own-code");
  await page.getByLabel("Example", { exact: true }).selectOption("array");
  await runPython(page, undefined, "17");
  await page
    .getByLabel("Workspace name", { exact: true })
    .fill("Python four increases");
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(page.locator(".python-save")).toContainText("Workspace saved");
  await capture(
    page,
    "08-account",
    "python-workspace-saved",
    "Verified Python workspace list after saving source and input.",
    { authState: "verified" },
  );
  await page
    .getByRole("link", { name: "Python four increases", exact: true })
    .click();
  await expect(page.locator(".python-save")).toContainText(
    "Saved workspace loaded",
  );
  await capture(
    page,
    "08-account",
    "python-workspace-loaded",
    "Restored source/input; rerunning creates a fresh trace.",
    { authState: "verified" },
  );
  await pool().query(
    "UPDATE simulation_runs SET created_at='2026-10-02T12:00:00Z' WHERE user_id=(SELECT id FROM users WHERE email=$1)",
    [email],
  );
  await page.goto("/dashboard");
  await capture(
    page,
    "08-account",
    "dashboard-saved-work",
    "Saved input, reference run and Python workspace in the verified dashboard.",
    { authState: "verified" },
  );
  await page.goto("/account/settings");
  await page.getByLabel("Type DELETE").fill("DELETE");
  await capture(
    page,
    "08-account",
    "account-data-delete-confirmation",
    "Owned data counts and explicit deletion confirmation; no password is filled.",
    { authState: "verified" },
  );
  await pool().query(
    "ALTER TABLE python_workspaces RENAME TO visual_audit_unavailable_workspaces",
  );
  try {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "This view could not load" }),
    ).toBeVisible();
    await capture(
      page,
      "12-errors",
      "application-error-boundary",
      "Actual database dependency failure reaches the sanitized application error boundary.",
      { authState: "verified" },
    );
  } finally {
    await pool().query(
      "ALTER TABLE visual_audit_unavailable_workspaces RENAME TO python_workspaces",
    );
  }
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await capture(
    page,
    "07-auth",
    "logout-anonymous",
    "Signed-out user returns to anonymous learning.",
  );
  expect(
    (
      await post("login", { email, password: "incorrect audit password" })
    ).status(),
  ).toBe(401);
  await page.goto("/account?error=AUTH_INVALID_CREDENTIALS");
  await capture(
    page,
    "07-auth",
    "wrong-credentials",
    "Generic credential error does not expose password details.",
  );
  await page.goto("/account/forgot");
  await capture(
    page,
    "07-auth",
    "forgot-password",
    "Password reset request form.",
  );
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: /Send reset/ }).click();
  await capture(
    page,
    "07-auth",
    "forgot-sent",
    "Generic reset confirmation for a sanitized test identity.",
  );
  const resetUrl = await emailLink(page.request, email, "reset");
  await page.goto(resetUrl);
  await expect(
    page.getByRole("button", { name: "Set new password" }),
  ).toBeEnabled();
  await capture(
    page,
    "07-auth",
    "reset-password",
    "One-use reset form with empty password fields and no visible token.",
  );
  const nextPassword = "new visual audit test password";
  await page.getByLabel("New password", { exact: true }).fill(nextPassword);
  await page.getByLabel("Confirm password", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await capture(
    page,
    "07-auth",
    "reset-success",
    "Password reset success; previous sessions revoked.",
  );
  expect(
    (await post("login", { email, password: nextPassword })).status(),
  ).toBe(200);
  await page.goto("/account");
  await capture(
    page,
    "08-account",
    "account-overview",
    "Verified account overview and navigation to saved work and data controls.",
    { authState: "verified" },
  );
  verifiedState = await page.context().storageState();
  const messages = await (
    await page.request.get(
      process.env.MAILPIT_API +
        "/api/v1/search?query=" +
        encodeURIComponent("to:" + email),
    )
  ).json();
  for (const purpose of ["verify", "reset"]) {
    const message = messages.messages.find((m: { Subject: string }) =>
      m.Subject.startsWith(purpose === "verify" ? "Verify" : "Reset"),
    );
    const content = await (
      await page.request.get(
        process.env.MAILPIT_API + "/api/v1/message/" + message.ID,
      )
    ).json();
    const sanitized = content.HTML.replace(
      /https?:\/\/[^"\s<>]*#token=[A-Za-z0-9_%-]+/g,
      "https://example.test/account/" + purpose + "#token=REDACTED",
    );
    const preview = await browser.newPage({ viewport: viewports.desktop });
    await preview.setContent(sanitized);
    await capture(
      preview,
      "11-email",
      "email-" + purpose,
      "Actual delivered HTML email with the actionable token URL replaced by REDACTED.",
      { route: "email-preview:" + purpose, authState: "anonymous" },
    );
    await preview.close();
  }
});
test("responsive core matrix and reduced-motion reasoning", async ({
  browser,
  page,
}) => {
  test.setTimeout(180000);
  for (const size of ["tablet", "mobile"] as const) {
    await page.setViewportSize(viewports[size]);
    for (const route of [
      "/",
      "/lab",
      "/lab/compare",
      "/own-code",
      "/account",
      "/account/forgot",
    ]) {
      await page.goto(route);
      await capture(
        page,
        "09-responsive",
        route === "/" ? "home" : route.slice(1).replaceAll("/", "-"),
        "Core route at " + size + " size, with page-level overflow checked.",
      );
    }
    for (const id of [
      "increasing-array",
      "shortest-routes-i",
      "edit-distance",
    ]) {
      await loadProblem(page, id);
      await capture(
        page,
        "09-responsive",
        id,
        "Meaningful " + id + " teaching state at " + size + " size.",
        await seek(page, id, representative(id)),
      );
    }
    const signed = await browser.newContext({
      storageState: verifiedState,
      viewport: viewports[size],
      baseURL: origin(),
    });
    const account = await signed.newPage();
    await account.goto("/dashboard");
    await capture(
      account,
      "09-responsive",
      "account-dashboard",
      "Verified saved-work dashboard at " + size + " size.",
      { authState: "verified" },
    );
    await signed.close();
  }
  await page.setViewportSize(viewports.desktop);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const id of [
    "increasing-array",
    "sum-of-two-values",
    "shortest-routes-i",
  ]) {
    await loadProblem(page, id);
    await capture(
      page,
      "10-reduced-motion",
      id,
      "Same meaningful teaching state with reduced motion: reason and decision remain visible.",
      await seek(page, id, representative(id)),
    );
  }
  const missing = inventory.filter(
    (r) => !shots.some((s) => s.route === r.route),
  );
  expect(missing).toEqual([]);
  allComplete = true;
});
