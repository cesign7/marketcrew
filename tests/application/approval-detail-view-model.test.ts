import { describe, expect, it } from "vitest";
import { buildApprovalDetailViewModel } from "../../src/features/approvals/buildApprovalDetailViewModel";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import type { ProviderSyncReport } from "../../src/lib/domain";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("buildApprovalDetailViewModel", () => {
  it("결재 상세 화면에 미리보기, 결정 흐름, 성과 체크포인트를 모은다", () => {
    const viewModel = buildApprovalDetailViewModel("approval-agenda-season-plan-buddha-gift-card");

    expect(viewModel?.title).toBe("부처님오신날 선물카드 키워드 테스트 승인안");
    expect(viewModel?.approvalPreview.diffSummary).toContain("키워드 2개");
    expect(viewModel?.approvalPreview.executionScopeProposal?.fields.map((field) => [field.label, field.recommendedValue])).toEqual(
      expect.arrayContaining([
        ["광고 유형", "네이버 키워드광고"],
        ["기기/매체", "모바일 우선 + PC 소액 병행"],
        ["시간대", "전체 시간 소액 테스트"],
      ]),
    );
    expect(viewModel?.ownerDecisionFlows[0]?.executionStateLabel).toBe("수동 처리 필요");
    expect(viewModel?.outcomeCheckpoints).toHaveLength(3);
  });

  it("존재하지 않는 결재 요청은 undefined로 반환한다", () => {
    expect(buildApprovalDetailViewModel("missing-approval")).toBeUndefined();
  });

  it("결재 상세 화면에 관련 연동 수집 실패/근거를 함께 모은다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveProviderSyncReports([buildFailedSearchAdReport(), buildSmartstoreReport()]);

    const viewModel = buildApprovalDetailViewModel("approval-agenda-season-plan-buddha-gift-card", {
      repository,
    });

    expect(viewModel?.providerSyncEvidence.map((report) => report.providerLabel)).toEqual([
      "네이버 키워드광고",
      "스마트스토어(스티커씨)",
    ]);
    expect(viewModel?.providerSyncEvidence[0]?.statusLabel).toBe("동기화 실패");
    expect(viewModel?.providerSyncEvidence[0]?.failureReason).toBe("SIGNATURE_ERROR");
    expect(viewModel?.providerSyncEvidence[0]?.writeLabel).toBe("쓰기 시도 없음");
  });

  it("저장된 outcome report를 결재 상세 성과 보고 이력으로 다시 읽는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const agendaCycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const approvalRequest = agendaCycle.approvalRequests.find((approval) => approval.status === "PENDING")!;

    processOwnerDecision({
      approvalRequest,
      decision: "APPROVE_AND_APPLY",
      memo: "성과 보고 이력 검증",
      now: agendaCycle.generatedAt,
      externalWriteEnabled: false,
      repository,
    });

    const viewModel = buildApprovalDetailViewModel(approvalRequest.id, {
      repository,
    });

    expect(viewModel?.outcomeHistory).toHaveLength(1);
    expect(viewModel?.outcomeHistory[0]?.stateLabel).toBe("판단 보류");
    expect(viewModel?.outcomeHistory[0]?.summary).toContain("외부 반영 잠금");
    expect(viewModel?.outcomeHistory[0]?.followUpAgendaTitle).toContain("외부 반영 잠금");
  });

  it("결재와 연결된 AI 실행 이력에 대표 결정, 모델, 토큰, 연결 객체를 표시한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const agendaCycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const approvalRequest = agendaCycle.approvalRequests.find((approval) => approval.status === "PENDING")!;

    processOwnerDecision({
      approvalRequest,
      decision: "APPROVE_DRAFT_ONLY",
      memo: "AgentRun timeline 검증",
      now: agendaCycle.generatedAt,
      repository,
    });

    const viewModel = buildApprovalDetailViewModel(approvalRequest.id, {
      repository,
    });

    expect(viewModel?.agentRunTimeline.map((run) => run.runnerLabel)).toContain("대표 결정");
    expect(viewModel?.agentRunTimeline[0]?.modelLabel).toContain("모델");
    expect(viewModel?.agentRunTimeline[0]?.tokenLabel).toContain("토큰");
    expect(viewModel?.agentRunTimeline.flatMap((run) => run.linkedObjectLabels)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("결재안"),
        expect.stringContaining("대표 결정"),
        expect.stringContaining("성과 보고"),
      ]),
    );
  });
});

function buildFailedSearchAdReport(): ProviderSyncReport {
  return {
    id: "provider-sync-search-ad-failed",
    provider: "search_ad",
    label: "네이버 키워드광고 read-only sync",
    status: "FAILED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/keywordstool",
    sourceUrl: "http://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["서명 검증 실패로 keyword demand snapshot을 만들지 못했습니다."],
    checkedAt: "2026-05-22T02:00:00.000Z",
    httpStatus: 403,
    failureReason: "SIGNATURE_ERROR",
  };
}

function buildSmartstoreReport(): ProviderSyncReport {
  return {
    id: "provider-sync-smartstore-2026-05-22",
    provider: "smartstore",
    label: "네이버 커머스/스마트스토어 read-only sync",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.commerce.naver.com/order",
    sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/order",
    missingEnvKeys: [],
    evidenceNotes: ["aggregate-only"],
    checkedAt: "2026-05-22T02:00:00.000Z",
    httpStatus: 200,
    commerceAggregateSnapshot: {
      id: "commerce-aggregate-STICKERSEE-2026-05-22",
      provider: "naver_commerce",
      brandKey: "STICKERSEE",
      windowDays: 30,
      paidOrderCount: 100,
      grossSales: 600120,
      topProductName: "생일축하스티커",
      dataSolutionAvailable: false,
      collectedAt: "2026-05-22T02:00:00.000Z",
      dataScope: "aggregate_only",
    },
  };
}
