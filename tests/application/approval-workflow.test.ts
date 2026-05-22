import { describe, expect, it } from "vitest";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import type { ProviderSyncReport } from "../../src/lib/domain";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

function buildSampleApprovals() {
  const result = runAgendaCycle({
    sampleProvider: new SampleProviderAdapter(),
    repository: createMemoryMarketingWorkflowRepository(),
  });

  return {
    readyApproval: result.approvalRequests.find((approval) => approval.status === "PENDING")!,
    blockedApproval: result.approvalRequests.find((approval) => approval.status === "NEEDS_EVIDENCE")!,
    now: result.generatedAt,
  };
}

describe("processOwnerDecision", () => {
  it("승인 후 바로 반영은 실행 전 점검을 통과하더라도 외부 반영 잠금이 닫혀 있으면 외부 쓰기 없이 수동 처리 결과를 남긴다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const { readyApproval, now } = buildSampleApprovals();

    const result = processOwnerDecision({
      approvalRequest: readyApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "대표 승인",
      now,
      externalWriteEnabled: false,
      repository,
    });

    expect(result.ownerDecision.decision).toBe("APPROVE_AND_APPLY");
    expect(result.preflightCheck?.status).toBe("PASSED");
    expect(result.preflightCheck?.warnings).toEqual(["WRITE_GATE"]);
    expect(result.executionResult?.state).toBe("NEEDS_MANUAL_ACTION");
    expect(result.executionResult?.failedOperations[0]?.reason).toBe("WRITE_GATE_CLOSED");
    expect(result.updatedApprovalRequest.status).toBe("APPROVED");
    expect(result.performanceCheckpoints).toHaveLength(3);
    expect(result.outcomeReport?.state).toBe("INCONCLUSIVE");
    expect(result.followUpTasks[0]?.assignedCharacter).toBe("moa");

    expect(repository.listOwnerDecisions()).toHaveLength(1);
    expect(repository.listPreflightChecks()).toHaveLength(1);
    expect(repository.listExecutionResults()).toHaveLength(1);
    expect(repository.listOutcomeReports()).toHaveLength(1);
    expect(repository.listFollowUpInternalTasks()).toHaveLength(1);
  });

  it("근거 보강 상태의 안건은 preflight에서 차단되고 데이 후속 업무로 내려간다", () => {
    const { blockedApproval, now } = buildSampleApprovals();

    const result = processOwnerDecision({
      approvalRequest: blockedApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "자료만 보고 승인 시도",
      now,
      externalWriteEnabled: false,
    });

    expect(result.preflightCheck?.status).toBe("BLOCKED");
    expect(result.preflightCheck?.blockingReasons).toContain("APPROVAL_PENDING");
    expect(result.preflightCheck?.blockingReasons).toContain("DATA_CONFIDENCE");
    expect(result.executionResult).toBeUndefined();
    expect(result.followUpTasks).toEqual([
      {
        id: `followup-preflight-${blockedApproval.id}`,
        sourceApprovalRequestId: blockedApproval.id,
        assignedCharacter: "day",
        title: "실행 전 점검 차단 사유 보강: APPROVAL_PENDING, DATA_CONFIDENCE, ROLLBACK_READY",
        status: "OPEN",
        createdAt: now,
      },
    ]);
  });

  it("읽기 전용 연동 수집 기록이 있으면 승인 결과의 성과 보고에 근거를 붙인다", () => {
    const { readyApproval, now } = buildSampleApprovals();

    const result = processOwnerDecision({
      approvalRequest: readyApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "대표 승인",
      now,
      externalWriteEnabled: false,
      providerSyncReports: [buildSearchAdReport(now)],
    });

    expect(result.outcomeReport?.summary).toContain("읽기 전용 연동 수집 기록 1개");
    expect(result.outcomeReport?.baselineSummary).toContain("키워드광고 월검색 최대 16,000회");
    expect(result.outcomeReport?.evidenceLabels).toContain("키워드광고 수요 1건");
    expect(result.outcomeReport?.sourceReportIds).toEqual(["provider-sync-search-ad-test"]);
  });
});

function buildSearchAdReport(now: string): ProviderSyncReport {
  return {
    id: "provider-sync-search-ad-test",
    provider: "search_ad",
    label: "네이버 키워드광고 read-only sync",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/keywordstool",
    sourceUrl: "http://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["keyword tool"],
    checkedAt: now,
    httpStatus: 200,
    keywordDemandSnapshots: [
      {
        id: "kw-demand-test",
        keyword: "부처님오신날 선물카드",
        provider: "naver_keyword_tool",
        monthlyPcSearches: 6000,
        monthlyMobileSearches: 10000,
        competitionIndex: "LOW",
        cachedUntil: "2026-05-23T02:00:00.000Z",
        collectedAt: now,
        rateLimitState: "OK",
      },
    ],
  };
}
