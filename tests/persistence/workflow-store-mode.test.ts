import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLocalWorkflowRepository,
  getWorkflowDatabaseUrl,
  getWorkflowRepositoryMode,
  getWorkflowStoreLabel,
} from "../../src/lib/persistence/workflow-store";

let temporaryDirectory: string | undefined;

afterEach(() => {
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("workflow store runtime mode", () => {
  it("기본 mode는 file이고 local workflow store path를 사용한다", () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-store-mode-"));
    const storePath = join(temporaryDirectory, "workflow-store.json");
    const env = {
      MARKETCREW_WORKFLOW_STORE_PATH: storePath,
    } as unknown as NodeJS.ProcessEnv;

    const repository = createLocalWorkflowRepository(env);

    expect(getWorkflowRepositoryMode(env)).toBe("file");
    expect(getWorkflowStoreLabel(env)).toBe(storePath);
    expect(repository.listApprovalRequests()).toEqual([]);
  });

  it("db mode는 MARKETCREW_DATABASE_URL을 DATABASE_URL보다 우선하고 label에서 password를 숨긴다", () => {
    const env = {
      MARKETCREW_REPOSITORY_MODE: "db",
      MARKETCREW_DATABASE_URL: "postgresql://marketcrew:secret@localhost:5432/marketcrew?schema=public",
      DATABASE_URL: "postgresql://fallback:fallback@localhost:5432/fallback",
    } as unknown as NodeJS.ProcessEnv;

    expect(getWorkflowRepositoryMode(env)).toBe("db");
    expect(getWorkflowDatabaseUrl(env)).toBe(env.MARKETCREW_DATABASE_URL);
    expect(getWorkflowStoreLabel(env)).toBe("postgresql://marketcrew:***@localhost:5432/marketcrew?schema=public");
  });

  it("db mode에서 database URL이 없으면 명확하게 실패한다", () => {
    const env = {
      MARKETCREW_REPOSITORY_MODE: "db",
    } as unknown as NodeJS.ProcessEnv;

    expect(() => createLocalWorkflowRepository(env)).toThrow(
      "MARKETCREW_REPOSITORY_MODE=db에는 MARKETCREW_DATABASE_URL 또는 DATABASE_URL이 필요합니다.",
    );
  });
});
