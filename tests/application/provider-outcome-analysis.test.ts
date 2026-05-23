import { describe, expect, it } from "vitest";
import { buildProviderSignalAgendaArtifacts } from "../../src/lib/application/provider-signal-agenda";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import type { ProviderSyncReport } from "../../src/lib/domain";

const NOW = "2026-05-22T02:00:00.000Z";

describe("provider outcome analysis", () => {
  it("승인된 내부 초안을 실제 읽기 전용 연동 요약 기준선과 성과 보고에 연결한다", () => {
    const reports = buildProviderReports();
    const artifacts = buildProviderSignalAgendaArtifacts({
      signals: [],
      providerSyncReports: reports,
      generatedAt: NOW,
    });
    const productApproval = artifacts.approvalRequests.find(
      (request) => request.executionPlan.workType === "PRODUCT_DRAFT",
    )!;

    const result = processOwnerDecision({
      approvalRequest: productApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "내부 초안 승인",
      now: NOW,
      externalWriteEnabled: false,
      providerSyncReports: reports,
    });

    expect(result.executionResult?.state).toBe("APPLIED");
    expect(result.outcomeReport?.state).toBe("INCONCLUSIVE");
    expect(result.outcomeReport?.summary).toContain("내부 초안 실행");
    expect(result.outcomeReport?.baselineSummary).toContain("최신 읽기 전용 연동 요약 자료");
    expect(result.outcomeReport?.baselineSummary).toContain("스마트스토어 매출 600,120원");
    expect(result.outcomeReport?.checkpointSummary).toContain("수집 기록 provider-sync-smartstore-2026-05-22");
    expect(result.outcomeReport?.evidenceLabels).toEqual(
      expect.arrayContaining([
        "스마트스토어 30일 주문 100건",
        "키워드광고 월검색 최대 16,000회",
        "검색광고 성과 생일 답례품 클릭 64회 주문 0건",
      ]),
    );
    expect(result.outcomeReport?.sourceReportIds).toEqual([
      "provider-sync-smartstore-2026-05-22",
      "provider-sync-search-ad-2026-05-22",
      "provider-sync-datalab-2026-05-22",
      "provider-sync-shop-2026-05-22",
    ]);
  });
});

function buildProviderReports(): ProviderSyncReport[] {
  return [
    {
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
      checkedAt: NOW,
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
        collectedAt: NOW,
        dataScope: "aggregate_only",
      },
    },
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
      evidenceNotes: ["keyword tool"],
      checkedAt: NOW,
      httpStatus: 200,
      keywordDemandSnapshots: [
        {
          id: "kw-demand-1",
          keyword: "추석 선물카드",
          provider: "naver_keyword_tool",
          monthlyPcSearches: 6000,
          monthlyMobileSearches: 10000,
          competitionIndex: "MEDIUM",
          cachedUntil: "2026-05-23T02:00:00.000Z",
          collectedAt: NOW,
          rateLimitState: "OK",
        },
      ],
      searchAdPerformanceSnapshots: [
        {
          id: "ad-perf-stickersee-no-order-2026-05-22",
          provider: "naver_search_ad",
          brandKey: "STICKERSEE",
          campaignName: "스티커씨 검색광고",
          adGroupName: "대표 상품",
          keyword: "생일 답례품",
          device: "MOBILE",
          timeSlot: "18-23",
          windowDays: 7,
          impressions: 2400,
          clicks: 64,
          cost: 38400,
          conversions: 0,
          revenue: 0,
          targetCpa: 12000,
          targetRoas: 2.5,
          trackingVerified: true,
          collectedAt: NOW,
          dataScope: "aggregate_only",
        },
      ],
    },
    {
      id: "provider-sync-datalab-2026-05-22",
      provider: "datalab",
      label: "네이버 데이터랩 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://openapi.naver.com/v1/datalab/search",
      sourceUrl: "https://developers.naver.com/docs/serviceapi/datalab/search/search.md",
      missingEnvKeys: [],
      evidenceNotes: ["relative ratio"],
      checkedAt: NOW,
      httpStatus: 200,
      searchTrendSnapshots: [
        {
          id: "trend-1",
          keywordGroupName: "추석",
          provider: "naver_datalab",
          timeUnit: "date",
          startDate: "2026-04-22",
          endDate: "2026-05-22",
          ratios: [{ period: "2026-05-22", ratio: 100 }],
          collectedAt: NOW,
          note: "relative_ratio_not_absolute_volume",
        },
      ],
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
      checkedAt: NOW,
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
        collectedAt: NOW,
        dataScope: "aggregate_only",
      },
    },
  ];
}
