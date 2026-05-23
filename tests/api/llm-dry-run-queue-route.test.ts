import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/operations/llm-dry-run-queue/route";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";

let previousStorePath: string | undefined;
let previousBackendApiUrl: string | undefined;
let previousApiBaseUrl: string | undefined;
let temporaryDirectory: string | undefined;
let storePath: string;

beforeEach(() => {
  previousStorePath = process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  previousBackendApiUrl = process.env.MARKETCREW_BACKEND_API_URL;
  previousApiBaseUrl = process.env.MARKETCREW_API_BASE_URL;
  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-llm-dry-run-route-"));
  storePath = join(temporaryDirectory, "workflow-store.json");
  process.env.MARKETCREW_WORKFLOW_STORE_PATH = storePath;
  delete process.env.MARKETCREW_BACKEND_API_URL;
  delete process.env.MARKETCREW_API_BASE_URL;
});

afterEach(() => {
  if (previousStorePath === undefined) {
    delete process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  } else {
    process.env.MARKETCREW_WORKFLOW_STORE_PATH = previousStorePath;
  }
  if (previousBackendApiUrl === undefined) {
    delete process.env.MARKETCREW_BACKEND_API_URL;
  } else {
    process.env.MARKETCREW_BACKEND_API_URL = previousBackendApiUrl;
  }
  if (previousApiBaseUrl === undefined) {
    delete process.env.MARKETCREW_API_BASE_URL;
  } else {
    process.env.MARKETCREW_API_BASE_URL = previousApiBaseUrl;
  }

  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("llm dry-run queue route", () => {
  it("AI 실행 큐와 감사 기록을 반환한다", async () => {
    const response = await GET(new Request("http://127.0.0.1/api/operations/llm-dry-run-queue"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.llmDryRunQueue.title).toBe("AI 실행 큐");
    expect(payload.llmDryRunQueue.items[0].runnerName).toBe("모아");
    expect(payload.llmDryRunQueue.items[0].rawRowsIncluded).toBe(false);
    expect(payload.plannerAudit.tokenUsageLabel).toContain("토큰");

    const repository = createFileMarketingWorkflowRepository(storePath);
    expect(repository.listAgentRuns().some((run) => run.runType === "llm_dry_run")).toBe(true);
  });
});
