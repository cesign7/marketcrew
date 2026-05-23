import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/approvals/[id]/decision/route";
import { GET as GET_APPROVAL_OUTCOMES } from "../../src/app/api/approvals/[id]/outcomes/route";
import { GET as GET_WORKFLOW_STATE } from "../../src/app/api/operations/workflow-state/route";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";

let previousStorePath: string | undefined;
let temporaryDirectory: string | undefined;
let storePath: string;

beforeEach(() => {
  previousStorePath = process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-route-"));
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

describe("approval decision route", () => {
  it("대표 초안 승인 요청을 API에서 처리한다", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "APPROVE_DRAFT_ONLY",
          memo: "초안 확정\n\n실행 범위: 부처님오신날 키워드 테스트 실행 범위\n- 기기/매체: 모바일만",
          executionScopeSelection: {
            proposalTitle: "부처님오신날 키워드 테스트 실행 범위",
            selections: [
              {
                fieldId: "device",
                label: "기기/매체",
                value: "모바일만",
              },
            ],
          },
        }),
      }),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.result.updatedApprovalRequest.status).toBe("APPROVED");
    expect(payload.result.executionResult.appliedOperations).toEqual(["draft-only:mock-search-ad-keyword-executor"]);
    expect(payload.result.outcomeReport.summary).toContain("초안 확정");

    const repository = createFileMarketingWorkflowRepository(storePath);
    expect(repository.listOwnerDecisions()).toHaveLength(1);
    expect(repository.listOwnerDecisions()[0]?.executionScopeSelection?.selections[0]).toEqual({
      fieldId: "device",
      label: "기기/매체",
      value: "모바일만",
    });
    expect(repository.listOwnerDecisions()[0]?.memo).toContain("실행 범위");
    expect(repository.listExecutionResults()).toHaveLength(1);
    expect(repository.listOutcomeReports()).toHaveLength(1);
    expect(repository.listFollowUpInternalTasks()).toHaveLength(1);
    expect(repository.listFollowUpInternalTasks()[0]?.title).toContain("초안 확정 범위");
  });

  it("대표 즉시 반영은 write gate가 닫혀 있으면 423으로 안전하게 멈춘다", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "APPROVE_AND_APPLY",
          memo: "즉시 반영 시도",
        }),
      }),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload.result.executionResult.state).toBe("NEEDS_MANUAL_ACTION");
    expect(payload.result.executionResult.failedOperations[0].reason).toBe("WRITE_GATE_CLOSED");
  });

  it("workflow-state API에서 결재 후 저장된 업무 상태를 다시 조회한다", async () => {
    await POST(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "APPROVE_DRAFT_ONLY",
          memo: "상태 조회 검증",
        }),
      }),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );

    const response = await GET_WORKFLOW_STATE(new Request("http://127.0.0.1/api/operations/workflow-state"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.state.counts.approvalRequests).toBe(2);
    expect(payload.state.counts.ownerDecisions).toBe(1);
    expect(payload.state.counts.executionResults).toBe(1);
    expect(payload.state.counts.outcomeReports).toBe(1);
    expect(payload.state.counts.followUpInternalTasks).toBe(1);
    expect(payload.state.recent.ownerDecisionIds).toEqual([
      "decision-approval-agenda-season-plan-buddha-gift-card-approve_draft_only",
    ]);
  });

  it("approval outcomes API에서 저장된 성과 보고를 다시 조회한다", async () => {
    await POST(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/decision", {
        method: "POST",
        body: JSON.stringify({
          decision: "APPROVE_AND_APPLY",
          memo: "성과 보고 조회 검증",
        }),
      }),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );

    const response = await GET_APPROVAL_OUTCOMES(
      new Request("http://127.0.0.1/api/approvals/approval-agenda-season-plan-buddha-gift-card/outcomes"),
      { params: Promise.resolve({ id: "approval-agenda-season-plan-buddha-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.approvalId).toBe("approval-agenda-season-plan-buddha-gift-card");
    expect(payload.outcomeReports).toHaveLength(1);
    expect(payload.outcomeReports[0].stateLabel).toBe("판단 보류");
    expect(payload.outcomeReports[0].summary).toContain("외부 반영 잠금");
  });
});
