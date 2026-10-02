import { defineConfig } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: "chromium",
    headless: true,
  },
  workers: 2,
  webServer: [
    {
      command: `pnpm --filter @sim/web exec next ${process.env.E2E_PRODUCTION === "1" ? "start" : "dev"} --hostname 127.0.0.1 -p ${port}`,
      url: `http://127.0.0.1:${port}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    ...(process.env.PYTHON_EXECUTION_ENABLED === "local" ||
    process.env.PUBLIC_PYTHON_EXECUTION_ENABLED === "true"
      ? [
          {
            command: "node apps/execution/server.mjs",
            url: `${process.env.PYTHON_ORCHESTRATOR_URL}/health`,
            reuseExistingServer: false,
            gracefulShutdown: { signal: "SIGTERM" as const, timeout: 10000 },
            timeout: 60000,
          },
        ]
      : []),
  ],
});
