import { describe, expect, it } from "vitest";
import { backfillExecutionScopes } from "../../src/lib/application/execution-scope-backfill";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("backfillExecutionScopes", () => {
  it("기존 검색광고 결재안과 대표 결정에 실행 범위를 소급 적용한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const agendaCycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const approval = agendaCycle.approvalRequests.find(
      (request) => request.id === "approval-agenda-season-plan-buddha-gift-card",
    )!;
    repository.saveApprovalRequests([
      {
        ...approval,
        executionPlan: {
          ...approval.executionPlan,
          executionScopeProposal: undefined,
        },
      },
    ]);
    processOwnerDecision({
      approvalRequest: {
        ...approval,
        executionPlan: {
          ...approval.executionPlan,
          executionScopeProposal: undefined,
        },
      },
      decision: "APPROVE_DRAFT_ONLY",
      memo: "기존 초안 확정",
      now: agendaCycle.generatedAt,
      repository,
    });

    const result = backfillExecutionScopes(repository, {
      now: "2026-05-23T14:00:00.000Z",
    });

    expect(result.approvalRequests.updatedItems).toEqual([
      {
        id: "approval-agenda-season-plan-buddha-gift-card",
        title: "부처님오신날 선물카드 키워드 테스트 승인안",
        scopeTitle: "부처님오신날 키워드 테스트 실행 범위",
      },
    ]);
    expect(result.ownerDecisions.updated).toBe(1);
    expect(repository.listApprovalRequests()[0]?.executionPlan.executionScopeProposal?.fields.map((field) => field.label)).toContain(
      "기기/매체",
    );
    expect(repository.listOwnerDecisions()[0]?.executionScopeSelection?.selections.map((selection) => selection.label)).toContain(
      "시간대",
    );
    expect(repository.listOwnerDecisions()[0]?.memo).toContain("소급 적용");
  });

  it("미리보기 모드에서는 저장 데이터를 바꾸지 않는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const agendaCycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const approval = agendaCycle.approvalRequests[0]!;
    repository.saveApprovalRequests([
      {
        ...approval,
        executionPlan: {
          ...approval.executionPlan,
          executionScopeProposal: undefined,
        },
      },
    ]);

    const result = backfillExecutionScopes(repository, {
      dryRun: true,
      now: "2026-05-23T14:00:00.000Z",
    });

    expect(result.applied).toBe(false);
    expect(result.approvalRequests.updated).toBe(1);
    expect(repository.listApprovalRequests()[0]?.executionPlan.executionScopeProposal).toBeUndefined();
  });
});
