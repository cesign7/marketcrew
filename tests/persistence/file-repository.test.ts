import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import type { ProviderSyncReport } from "../../src/lib/domain";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";
import { buildWorkflowStateSummary, persistProviderSyncReports } from "../../src/lib/persistence/workflow-store";

let temporaryDirectory: string | undefined;

afterEach(() => {
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("FileMarketingWorkflowRepository", () => {
  it("대표 결정, 실행 결과, 성과 보고, 후속 업무를 파일에 저장하고 다시 조회한다", () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-workflow-"));
    const storePath = join(temporaryDirectory, "workflow-store.json");
    const repository = createFileMarketingWorkflowRepository(storePath);
    const agendaCycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const approvalRequest = agendaCycle.approvalRequests.find((approval) => approval.status === "PENDING");
    expect(approvalRequest).toBeDefined();

    processOwnerDecision({
      approvalRequest: approvalRequest!,
      decision: "APPROVE_DRAFT_ONLY",
      memo: "초안 승인 후 재상신",
      now: agendaCycle.generatedAt,
      repository,
    });

    const reloadedRepository = createFileMarketingWorkflowRepository(storePath);
    expect(reloadedRepository.listApprovalRequests().find((approval) => approval.id === approvalRequest!.id)?.status).toBe(
      "APPROVED",
    );
    expect(reloadedRepository.listOwnerDecisions()).toHaveLength(1);
    expect(reloadedRepository.listExecutionResults()).toHaveLength(1);
    expect(reloadedRepository.listOutcomeReports()).toHaveLength(1);
    expect(reloadedRepository.listFollowUpInternalTasks()).toHaveLength(1);
    expect(reloadedRepository.listFollowUpInternalTasks()[0]?.assignedCharacter).toBe("moa");
  });

  it("읽기 전용 provider sync 결과와 스냅샷을 파일에 저장하고 다시 조회한다", () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-workflow-"));
    const storePath = join(temporaryDirectory, "workflow-store.json");
    const repository = createFileMarketingWorkflowRepository(storePath);
    const checkedAt = "2026-05-22T01:35:00.000Z";
    const providerSyncReport: ProviderSyncReport = {
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
      searchTrendSnapshots: [
        {
          id: "trend-gift-card-2026-05-22",
          keywordGroupName: "추석 선물카드",
          provider: "naver_datalab",
          timeUnit: "date",
          startDate: "2026-04-22",
          endDate: "2026-05-22",
          ratios: [{ period: "2026-05-22", ratio: 100 }],
          collectedAt: checkedAt,
          note: "relative_ratio_not_absolute_volume",
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

    persistProviderSyncReports(repository, [providerSyncReport]);

    const reloadedRepository = createFileMarketingWorkflowRepository(storePath);
    const summary = buildWorkflowStateSummary(reloadedRepository, storePath);
    expect(reloadedRepository.listProviderSyncReports()).toHaveLength(1);
    expect(reloadedRepository.listKeywordDemandSnapshots()[0]?.keyword).toBe("추석선물카드");
    expect(reloadedRepository.listSearchTrendSnapshots()[0]?.keywordGroupName).toBe("추석 선물카드");
    expect(reloadedRepository.listSignals()[0]?.id).toBe("signal-provider-sync-search-ad-2026-05-22");
    expect(summary.counts).toMatchObject({
      providerSyncReports: 1,
      keywordDemandSnapshots: 1,
      searchTrendSnapshots: 1,
      signals: 1,
    });
  });
});
