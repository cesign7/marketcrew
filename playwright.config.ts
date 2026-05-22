import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3010);
const baseURL = `http://127.0.0.1:${port}`;
const workflowStorePath = process.env.MARKETCREW_E2E_WORKFLOW_STORE_PATH ?? ".marketcrew/e2e-workflow-store.json";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    // Keep e2e independent from the user-visible Next dev server on port 3001.
    command: `rm -f ${workflowStorePath} && MARKETCREW_REPOSITORY_MODE=file MARKETCREW_WORKFLOW_STORE_PATH=${workflowStorePath} npm run build && MARKETCREW_REPOSITORY_MODE=file MARKETCREW_WORKFLOW_STORE_PATH=${workflowStorePath} npx next start --port ${port}`,
    url: `${baseURL}/operations`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
