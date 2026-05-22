import { describe, expect, it } from "vitest";
import { runSampleAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { recordPlannerAgentRun, recordProviderSyncAgentRuns } from "../../src/lib/application/agent-run-recorder";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import type { ProviderSyncReport } from "../../src/lib/domain";
import { buildDeterministicPlannerResult, buildPlannerAuditRun, buildPlannerInputFromApprovals } from "../../src/lib/llm/planner";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("AgentRunRecorder", () => {
  it("모아 planner 감사 정보를 AgentRun과 approval link로 저장한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const cycle = runSampleAgendaCycle();
    const input = buildPlannerInputFromApprovals(cycle.approvalRequests, cycle.generatedAt);
    const result = buildDeterministicPlannerResult(input);
    const audit = buildPlannerAuditRun(input, result, { providerEvidenceNoteCount: 4 });

    const run = recordPlannerAgentRun(repository, input, result, audit);

    expect(run.id).toBe(audit.id);
    expect(run.runType).toBe("opi_planner");
    expect(run.provider).toBe("deterministic");
    expect(run.tokenUsage.totalTokens).toBe(audit.tokenUsage.totalEstimate);
    expect(repository.listAgentRunsForWorkflowObject({ objectType: "approval_request", objectId: result.recommendedApprovalIds[0] })).toEqual([
      run,
    ]);
  });

  it("provider sync report를 read-only AgentRun으로 저장하고 signal에 연결한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const report = buildProviderSyncReport();

    const [run] = recordProviderSyncAgentRuns(repository, [report]);

    expect(run).toMatchObject({
      id: "agent-run-provider-sync-provider-sync-search-ad-2026-05-22",
      runType: "provider_sync",
      mode: "provider_read_only",
      provider: "naver",
      status: "SUCCEEDED",
    });
    expect(repository.listAgentRunsForWorkflowObject({ objectType: "provider_sync_report", objectId: report.id })).toHaveLength(1);
    expect(repository.listAgentRunsForWorkflowObject({ objectType: "signal", objectId: report.generatedSignal!.id })).toHaveLength(1);
  });

  it("대표 결정 workflow 결과를 local AgentRun으로 저장한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const cycle = runSampleAgendaCycle();
    const approvalRequest = cycle.approvalRequests.find((approval) => approval.status === "PENDING");
    expect(approvalRequest).toBeDefined();

    const result = processOwnerDecision({
      approvalRequest: approvalRequest!,
      decision: "APPROVE_DRAFT_ONLY",
      memo: "초안만 승인",
      now: cycle.generatedAt,
      repository,
    });

    const runs = repository.listAgentRunsForWorkflowObject({
      objectType: "approval_request",
      objectId: approvalRequest!.id,
    });
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: `agent-run-owner-decision-${result.ownerDecision.id}`,
      runType: "owner_decision",
      mode: "mock_execution",
      provider: "local",
      tokenUsage: {
        totalTokens: 0,
        estimatedCostKrw: 0,
      },
    });
    expect(repository.listAgentRunsForWorkflowObject({ objectType: "outcome_report", objectId: result.outcomeReport!.id })).toHaveLength(1);
  });
});

function buildProviderSyncReport(): ProviderSyncReport {
  const checkedAt = "2026-05-22T04:45:00.000Z";

  return {
    id: "provider-sync-search-ad-2026-05-22",
    provider: "search_ad",
    label: "네이버 키워드광고",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/keywordstool",
    sourceUrl: "https://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["read-only keyword tool 응답 1건을 KeywordDemandSnapshot으로 정규화했습니다."],
    checkedAt,
    httpStatus: 200,
    keywordDemandSnapshots: [
      {
        id: "kw-demand-gift-card-2026-05-22",
        keyword: "추석선물카드",
        provider: "naver_keyword_tool",
        monthlyPcSearches: 120,
        monthlyMobileSearches: 240,
        competitionIndex: "MEDIUM",
        cachedUntil: "2026-05-23",
        collectedAt: checkedAt,
        rateLimitState: "OK",
      },
    ],
    generatedSignal: {
      id: "signal-provider-sync-search-ad-2026-05-22",
      source: "search_ad",
      signalType: "seasonal_keyword_demand",
      entityType: "keyword",
      entityId: "추석선물카드",
      title: "추석선물카드 수요 확인",
      currentValue: 360,
      periodStart: "2026-05-22",
      periodEnd: "2026-05-22",
      evidenceRowIds: ["kw-demand-gift-card-2026-05-22"],
      createdAt: checkedAt,
    },
  };
}
