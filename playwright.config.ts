import { defineConfig } from "@playwright/test";

const port = process.env.E2E_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: `pnpm --filter @sim/web exec next dev -p ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
