import { describe, expect, it } from "vitest";
import { buildAgendaRoomViewModel } from "../../src/features/agenda-room/buildAgendaRoomViewModel";
import type { ProviderSyncReport } from "../../src/lib/domain";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("buildAgendaRoomViewModel", () => {
  it("결재함 버킷과 결재 미리보기를 샘플 workflow 결과에서 만든다", () => {
    const viewModel = buildAgendaRoomViewModel({ env: {} });

    expect(viewModel.opiReport.summary).toContain("대표 결재 대기 1건");
    expect(viewModel.inboxBuckets.map((bucket) => [bucket.id, bucket.count])).toEqual([
      ["TODAY_APPROVAL", 1],
      ["SEASONAL_KEYWORD_REVIEW", 2],
      ["TRACKING_OUTCOME", 3],
      ["WAITING_EVIDENCE", 1],
      ["AUTO_HOLD", 0],
      ["FAILED_EXECUTION", 1],
    ]);

    const readyPreview = viewModel.approvalPreviews.find((preview) => preview.statusLabel === "대표 승인 대기");
    expect(readyPreview).toBeDefined();
    expect(readyPreview?.beforeItems).toContain("키워드 없음");
    expect(readyPreview?.afterItems).toContain("일예산 30,000원");
    expect(readyPreview?.rollbackPlan).toContain("되돌립니다");
    expect(readyPreview?.disabledReason).toBeUndefined();
    expect(readyPreview?.provenance.summaryLabel).toContain("근거 4개");
    expect(readyPreview?.provenance.evidenceLabels).toEqual(expect.arrayContaining([expect.stringContaining("키워드 수요")]));
    expect(readyPreview?.provenance.safetyLabels).toContain("원천 행 제외");

    const blockedPreview = viewModel.approvalPreviews.find((preview) => preview.statusLabel === "추가 근거 요청");
    expect(blockedPreview?.disabledReason).toContain("추가 근거 보강");

    expect(viewModel.ownerDecisionFlows[0]?.preflightStatusLabel).toBe("실행 전 점검 통과");
    expect(viewModel.ownerDecisionFlows[0]?.executionStateLabel).toBe("수동 처리 필요");
    expect(viewModel.ownerDecisionFlows[0]?.followUpTasks[0]).toContain("오피");
    expect(viewModel.providerReadiness.map((provider) => provider.id)).toEqual([
      "search_ad",
      "datalab",
      "smartstore",
      "shop",
      "llm",
    ]);
    expect(viewModel.providerReadiness.find((provider) => provider.id === "search_ad")?.canWriteLabel).toBe("쓰기 차단");
    expect(viewModel.plannerPreview.rawRowsLabel).toBe("원천 행 제외");
    expect(viewModel.plannerPreview.selectedAgendaIds[0]).toBe("approval-agenda-season-plan-buddha-gift-card");
    expect(viewModel.plannerPreview.audit.providerLabel).toBe("연동 규칙 기반");
    expect(viewModel.plannerPreview.audit.modelLabel).toBe("모델 규칙 기반 대체");
    expect(viewModel.plannerPreview.audit.billingLabel).toBe("과금 없음");
    expect(viewModel.plannerPreview.audit.sourceCountLabels).toContain("후보 2건");
    expect(viewModel.llmCostGovernance.statusLabel).toBe("실제 호출 차단");
    expect(viewModel.llmCostGovernance.gateChecks.find((check) => check.id === "rate-policy")?.tone).toBe("blocked");
  });

  it("읽기 전용 연동 집계를 담당 캐릭터 안건으로 함께 보여준다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const reports = buildProviderAggregateReports();
    repository.saveProviderSyncReports(reports);
    repository.saveSignals(reports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])));

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.opiReport.summary).toContain("실제 읽기 전용 연동 집계");
    expect(viewModel.summary.waitingApproval).toBe(4);
    expect(viewModel.agendaCards.map((card) => card.title)).toEqual(
      expect.arrayContaining([
        "스마트스토어 상위 상품 키워드 확장 안건",
        "영카트 재구매 고객군 CRM 초안 안건",
        "스마트스토어/자체몰 매출 균형 점검 안건",
      ]),
    );
    expect(viewModel.agendaCards.find((card) => card.owner === "프로")?.source).toContain("연동 수집");
    expect(viewModel.characters.find((character) => character.id === "pro")?.queueCount).toBe(1);
    expect(viewModel.characters.find((character) => character.id === "ripi")?.queueCount).toBe(1);
    expect(viewModel.characters.find((character) => character.id === "maru")?.queueCount).toBe(1);
    expect(viewModel.providerSyncEvidence.map((report) => report.providerLabel)).toEqual([
      "네이버 키워드광고",
      "스마트스토어(스티커씨)",
      "쇼핑몰(커피프린트)",
    ]);
    expect(viewModel.providerSyncEvidence.find((report) => report.providerKey === "search_ad")?.notes).toContain(
      "실제 호출은 대표가 제공한 서버 환경 설정으로만 수행하며 외부 반영 잠금과 무관합니다.",
    );
    const smartstoreEvidence = viewModel.providerSyncEvidence.find((report) => report.providerKey === "smartstore");
    expect(smartstoreEvidence?.brandLabel).toBe("스티커씨");
    expect(smartstoreEvidence?.historyPolicy.requestWindowLabel).toContain("24시간");
    expect(smartstoreEvidence?.historyPolicy.seasonalityLabel).toContain("전년도 명절");
    expect(smartstoreEvidence?.snapshotLabels).toContain(
      "스티커씨 주문 100건",
    );
    expect(viewModel.providerSyncEvidence.find((report) => report.providerKey === "shop")?.brandLabel).toBe("커피프린트");
    expect(viewModel.productGrowthOpportunities.map((opportunity) => opportunity.kindLabel)).toEqual([
      "키워드 확장",
      "마케팅 제안",
      "상품 발굴",
    ]);
    expect(viewModel.productGrowthOpportunities[0]?.keywords).toContain("추석 선물카드");
    const smartstorePreview = viewModel.approvalPreviews.find((preview) => preview.title === "스마트스토어 상위 상품 키워드 확장 안건");
    expect(smartstorePreview?.provenance.providerEvidenceLabels[0]).toContain("스마트스토어");
    expect(smartstorePreview?.provenance.agentRunLabels[0]).toContain("오피 계획");
    expect(viewModel.plannerPreview.audit.sourceCountLabels).toContain("후보 5건");
    expect(viewModel.ownerDecisionFlows).toHaveLength(2);
    expect(viewModel.ownerDecisionFlows[0]?.outcomeEvidenceLabels).toContain("키워드광고 월검색 최대 16,000회");
    expect(viewModel.ownerDecisionFlows[1]?.outcomeSummary).toContain("내부 초안 실행");
    expect(viewModel.ownerDecisionFlows[1]?.outcomeEvidenceLabels).toContain("스마트스토어 매출 600,120원");
  });

  it("같은 근거의 연동 수집 이력은 결재 미리보기에서 최신 1건과 누적 횟수로 접는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const reports = buildProviderAggregateReports();
    const smartstoreReport = reports.find((report) => report.provider === "smartstore")!;
    const shopReport = reports.find((report) => report.provider === "shop")!;
    const repeatedReports: ProviderSyncReport[] = [
      ...reports,
      {
        ...smartstoreReport,
        id: "provider-sync-smartstore-2026-05-22T02:30:00.000Z",
        checkedAt: "2026-05-22T02:30:00.000Z",
        commerceAggregateSnapshot: smartstoreReport.commerceAggregateSnapshot
          ? {
              ...smartstoreReport.commerceAggregateSnapshot,
              grossSales: 602620,
              collectedAt: "2026-05-22T02:30:00.000Z",
            }
          : undefined,
      },
      {
        ...shopReport,
        id: "provider-sync-shop-2026-05-22T02:30:00.000Z",
        checkedAt: "2026-05-22T02:30:00.000Z",
        shopAggregateSnapshot: shopReport.shopAggregateSnapshot
          ? {
              ...shopReport.shopAggregateSnapshot,
              collectedAt: "2026-05-22T02:30:00.000Z",
            }
          : undefined,
      },
    ];
    repository.saveProviderSyncReports(repeatedReports);
    repository.saveSignals(repeatedReports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])));

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    const balancePreview = viewModel.approvalPreviews.find(
      (preview) => preview.title === "스마트스토어/자체몰 매출 균형 점검 안건",
    );
    expect(balancePreview?.provenance.summaryLabel).toContain("연동 수집 2개 (누적 4회)");
    expect(balancePreview?.provenance.providerEvidenceLabels).toEqual([
      "스마트스토어(스티커씨) · 최신 동기화 완료 · 스티커씨 주문 100건, 스티커씨 매출 602,620원 · 누적 2회",
      "쇼핑몰(커피프린트) · 최신 동기화 완료 · 커피프린트 주문 28건, 커피프린트 재구매 4명 · 누적 2회",
    ]);
  });
});

function buildProviderAggregateReports(): ProviderSyncReport[] {
  return [
    {
      id: "provider-sync-search-ad-2026-05-22",
      provider: "search_ad",
      label: "네이버 키워드광고 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.searchad.naver.com/keywordstool",
      sourceUrl: "http://naver.github.io/searchad-apidoc/",
      missingEnvKeys: [],
      evidenceNotes: [
        "read-only keyword tool 응답 2건을 KeywordDemandSnapshot으로 정규화했습니다.",
        "실제 호출은 대표가 제공한 server env로만 수행하며 write gate와 무관합니다.",
      ],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      keywordDemandSnapshots: [
        {
          id: "kw-demand-search-ad-추석선물카드-2026-05-22",
          keyword: "추석 선물카드",
          provider: "naver_keyword_tool",
          monthlyPcSearches: 6000,
          monthlyMobileSearches: 10000,
          competitionIndex: "MEDIUM",
          cachedUntil: "2026-05-23T02:00:00.000Z",
          collectedAt: "2026-05-22T02:00:00.000Z",
          rateLimitState: "OK",
        },
        {
          id: "kw-demand-search-ad-부처님오신날선물카드-2026-05-22",
          keyword: "부처님오신날 선물카드",
          provider: "naver_keyword_tool",
          monthlyPcSearches: 5000,
          monthlyMobileSearches: 8000,
          competitionIndex: "LOW",
          cachedUntil: "2026-05-23T02:00:00.000Z",
          collectedAt: "2026-05-22T02:00:00.000Z",
          rateLimitState: "OK",
        },
      ],
    },
    {
      id: "provider-sync-smartstore-2026-05-22",
      provider: "smartstore",
      label: "네이버 커머스/스마트스토어 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.commerce.naver.com/order",
      sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
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
      generatedSignal: {
        id: "signal-commerce-aggregate-stickersee-2026-05-22",
        source: "smartstore",
        signalType: "weekly_trend",
        entityType: "product",
        entityId: "STICKERSEE",
        title: "스마트스토어 주문 집계 동기화",
        currentValue: 600120,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["commerce-aggregate-STICKERSEE-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
    {
      id: "provider-sync-shop-2026-05-22",
      provider: "shop",
      label: "자체 쇼핑몰/영카트 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://shop.example.test/bridge?action=aggregate",
      sourceUrl: "integrations/youngcart-bridge/README.md",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      shopAggregateSnapshot: {
        id: "shop-aggregate-youngcart-2026-05-22",
        provider: "youngcart_bridge",
        brandKey: "COFFEEPRINT",
        windowDays: 30,
        orderCount: 28,
        repeatCustomerCount: 4,
        grossSales: 4081900,
        averageOrderValue: 145782,
        collectedAt: "2026-05-22T02:00:00.000Z",
        dataScope: "aggregate_only",
      },
      generatedSignal: {
        id: "signal-shop-aggregate-coffeeprint-2026-05-22",
        source: "shop",
        signalType: "weekly_trend",
        entityType: "customer_segment",
        entityId: "COFFEEPRINT",
        title: "영카트 주문/재구매 집계 동기화",
        currentValue: 4,
        baselineValue: 28,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["shop-aggregate-youngcart-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
  ];
}
