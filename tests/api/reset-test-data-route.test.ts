import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "../../src/app/api/operations/reset-test-data/route";
import { WORKFLOW_RESET_CONFIRMATION } from "../../src/lib/application/workflow-reset-policy";

let previousStorePath: string | undefined;
let previousRepositoryMode: string | undefined;
let previousBackendApiUrl: string | undefined;
let previousApiBaseUrl: string | undefined;
let temporaryDirectory: string | undefined;

beforeEach(() => {
  previousStorePath = process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  previousRepositoryMode = process.env.MARKETCREW_REPOSITORY_MODE;
  previousBackendApiUrl = process.env.MARKETCREW_BACKEND_API_URL;
  previousApiBaseUrl = process.env.MARKETCREW_API_BASE_URL;
  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-reset-route-"));
  process.env.MARKETCREW_WORKFLOW_STORE_PATH = join(temporaryDirectory, "workflow-store.json");
  process.env.MARKETCREW_REPOSITORY_MODE = "file";
  delete process.env.MARKETCREW_BACKEND_API_URL;
  delete process.env.MARKETCREW_API_BASE_URL;
});

afterEach(() => {
  restoreEnv("MARKETCREW_WORKFLOW_STORE_PATH", previousStorePath);
  restoreEnv("MARKETCREW_REPOSITORY_MODE", previousRepositoryMode);
  restoreEnv("MARKETCREW_BACKEND_API_URL", previousBackendApiUrl);
  restoreEnv("MARKETCREW_API_BASE_URL", previousApiBaseUrl);

  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("reset test data route", () => {
  it("초기화 미리보기와 보존 범위를 반환한다", async () => {
    const response = await GET(new Request("http://127.0.0.1/api/operations/reset-test-data"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("PREVIEW");
    expect(payload.preview.confirmation).toBe(WORKFLOW_RESET_CONFIRMATION);
    expect(payload.preview.preservedCollections).toEqual([{ collection: "aiOperationsSettings", count: 0 }]);
  });

  it("확인 문구가 틀리면 초기화를 막는다", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/operations/reset-test-data", {
        method: "POST",
        body: JSON.stringify({ confirmation: "초기화" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("CONFIRMATION_REQUIRED");
  });

  it("파일 저장소에서는 정확한 확인 문구가 있어도 초기화를 실행하지 않는다", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/operations/reset-test-data", {
        method: "POST",
        body: JSON.stringify({ confirmation: WORKFLOW_RESET_CONFIRMATION }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("DB_MODE_REQUIRED");
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
