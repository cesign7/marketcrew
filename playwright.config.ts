import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3010);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? port + 1);
const baseURL = `http://127.0.0.1:${port}`;
const workflowStorePath = process.env.MARKETCREW_E2E_WORKFLOW_STORE_PATH ?? ".marketcrew/e2e-workflow-store.json";
const localE2eBaseEnv = [
  "MARKETCREW_AUTH_DISABLED=1",
  "MARKETCREW_REPOSITORY_MODE=file",
  `MARKETCREW_WORKFLOW_STORE_PATH=${workflowStorePath}`,
  "MARKETCREW_BACKEND_API_TOKEN=",
  "MARKETCREW_API_TOKEN=",
].join(" ");
const localE2eBuildEnv = [
  localE2eBaseEnv,
  "MARKETCREW_BACKEND_API_URL=",
  "MARKETCREW_API_BASE_URL=",
].join(" ");
const localE2eBackendEnv = ["MARKETCREW_BACKEND_MODE=1", localE2eBuildEnv].join(" ");
const localE2eFrontendEnv = [
  localE2eBaseEnv,
  `MARKETCREW_BACKEND_API_URL=http://127.0.0.1:${backendPort}`,
  "MARKETCREW_API_BASE_URL=",
].join(" ");

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
    command: [
      "bash -lc",
      JSON.stringify(
        [
          "set -e",
          "trap 'kill 0' EXIT",
          `rm -f ${workflowStorePath}`,
          `${localE2eBuildEnv} npm run build`,
          `${localE2eBackendEnv} npx next start --port ${backendPort} & until curl -sf http://127.0.0.1:${backendPort}/api/backend/health >/dev/null; do sleep 0.2; done`,
          `${localE2eFrontendEnv} npx next start --port ${port}`,
        ].join("; "),
      ),
    ].join(" "),
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
