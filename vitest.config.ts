import { defineConfig } from "vitest/config";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    // Keep CPU-heavy property checks and Docker probes within a predictable host budget.
    maxWorkers: 2,
    include: ["tests/**/*.test.ts", "apps/web/src/components/**/*.test.ts"],
  },
});
