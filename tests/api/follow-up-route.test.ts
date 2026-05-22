import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as POST_DECISION } from "../../src/app/api/approvals/[id]/decision/route";
import { PATCH } from "../../src/app/api/follow-ups/[id]/route";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";

let previousStorePath: string | undefined;
let temporaryDirectory: string | undefined;
let storePath: string;

beforeEach(() => {
  previousStorePath = process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-followup-route-"));
  storePath = join(temporaryDirectory, "workflow-store.json");
  process.env.MARKETCREW_WORKFLOW_STORE_PATH = storePath;
});

afterEach(() => {
  if (previousStorePath === undefined) {
    delete process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  } else {
    process.env.MARKETCREW_WORKFLOW_STORE_PATH = previousStorePath;
  }

  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("follow-up route", () => {
  it("후속 업무를 완료 처리하고 다시 조회 가능한 상태로 저장한다", async () => {
    await POST_DECISION(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "APPROVE_DRAFT_ONLY",
          memo: "초안만 승인",
        }),
      }),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );

    const response = await PATCH(
      new Request("http://127.0.0.1/api/follow-ups/followup-draft-approval-agenda-season-plan-buddha-gift-card", {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
      { params: Promise.resolve({ id: "followup-draft-approval-agenda-season-plan-buddha-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.task.status).toBe("DONE");

    const repository = createFileMarketingWorkflowRepository(storePath);
    expect(repository.listFollowUpInternalTasks()[0]?.status).toBe("DONE");
  });

  it("잘못된 상태 값은 저장하지 않는다", async () => {
    const response = await PATCH(
      new Request("http://127.0.0.1/api/follow-ups/missing", {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
