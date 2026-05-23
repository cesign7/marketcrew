import { describe, expect, it } from "vitest";
import { buildProviderSignalAgendaArtifacts } from "../../src/lib/application/provider-signal-agenda";
import type { ProviderSyncReport } from "../../src/lib/domain";

describe("buildProviderSignalAgendaArtifacts", () => {
  it("커머스/영카트 aggregate signal을 브랜드별 프로, 리피 안건으로 분리한다", () => {
    const reports = buildSyncedProviderReports();
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: reports,
      signals: reports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])),
      generatedAt: "2026-05-22T02:00:00.000Z",
      moaSynthesisReportId: "moa-synthesis-sample-001",
    });

    expect(artifacts.agendaCandidates.map((candidate) => [candidate.character, candidate.title])).toEqual([
      ["pro", "스마트스토어 상위 상품 키워드 확장 안건"],
      ["ripi", "영카트 재구매 고객군 CRM 초안 안건"],
    ]);
    expect(artifacts.agendaCandidates.map((candidate) => candidate.title).join(" ")).not.toContain("균형");
    expect(artifacts.approvalRequests).toHaveLength(2);
    expect(artifacts.approvalRequests.every((request) => request.status === "PENDING")).toBe(true);
    expect(artifacts.approvalRequests.every((request) => request.executionPlan.requiresWriteGate === false)).toBe(true);
    expect(artifacts.approvalRequests.map((request) => request.executionPlan.executorKey)).toEqual([
      "internal-product-opportunity-planner",
      "internal-crm-draft-planner",
    ]);
    expect(artifacts.performanceCheckpoints).toHaveLength(10);
    expect(artifacts.characterReports.map((report) => report.character)).toEqual(["pro", "ripi"]);
  });

  it("성공한 aggregate snapshot이 없으면 안건을 만들지 않는다", () => {
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: [
        {
          ...buildSyncedProviderReports()[0],
          status: "FAILED",
          commerceAggregateSnapshot: undefined,
          generatedSignal: undefined,
        },
      ],
      signals: [],
      generatedAt: "2026-05-22T02:00:00.000Z",
    });

    expect(artifacts.agendaCandidates).toEqual([]);
    expect(artifacts.approvalRequests).toEqual([]);
  });

  it("검색광고 성과 이상신호를 그로의 저성과 키워드 조정 안건으로 올린다", () => {
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: [buildSearchAdPerformanceReport()],
      signals: [],
      generatedAt: "2026-05-23T08:00:00.000Z",
      moaSynthesisReportId: "moa-synthesis-sample-001",
    });

    expect(artifacts.agendaCandidates.map((candidate) => [candidate.character, candidate.title])).toEqual([
      ["gro", "저성과 검색광고 키워드 조정 안건"],
    ]);
    expect(artifacts.agendaCandidates[0]?.summary).toContain("주문 없는 키워드");
    expect(artifacts.agendaCandidates[0]?.summary).toContain("기기/시간대");
    expect(artifacts.approvalRequests).toHaveLength(1);
    expect(artifacts.approvalRequests[0]).toMatchObject({
      title: "저성과 검색광고 키워드 조정 안건",
      status: "PENDING",
      dataConfidence: "READY_TO_APPROVE",
      executionPlan: {
        workType: "SEARCH_AD_BID_BUDGET",
        executorKey: "internal-search-ad-performance-planner",
        requiresWriteGate: false,
      },
    });
    expect(artifacts.approvalRequests[0]?.executionPlan.executionScopeProposal?.fields.map((field) => field.label)).toContain(
      "기기/매체",
    );
    expect(artifacts.characterReports.map((report) => report.character)).toEqual(["gro"]);
    expect(artifacts.performanceCheckpoints[0]?.metrics).toEqual(expect.arrayContaining(["CVR", "CPA", "ROAS"]));
  });

  it("쇼핑검색광고 검색어 성과만 있어도 그로의 저성과 조정 안건으로 올린다", () => {
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: [buildShoppingSearchAdPerformanceReport()],
      signals: [],
      generatedAt: "2026-05-23T08:00:00.000Z",
      moaSynthesisReportId: "moa-synthesis-sample-001",
    });

    expect(artifacts.agendaCandidates.map((candidate) => [candidate.character, candidate.title])).toEqual([
      ["gro", "저성과 검색광고 키워드 조정 안건"],
    ]);
    expect(artifacts.agendaCandidates[0]?.summary).toContain("주문 없는 키워드");
    expect(artifacts.approvalRequests[0]?.evidenceIds).toContain("shopping-search-perf-stickersee-no-order-2026-05-23");
  });
});

function buildSyncedProviderReports(): ProviderSyncReport[] {
  return [
    {
      id: "provider-sync-smartstore-2026-05-22",
      provider: "smartstore",
      label: "네이버 커머스/스마트스토어 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses",
      sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only sync"],
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
      endpoint: "https://shop.example.test/marketcrew-bridge.php?action=aggregate",
      sourceUrl: "integrations/youngcart-bridge/README.md",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only sync"],
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

function buildSearchAdPerformanceReport(): ProviderSyncReport {
  return {
    id: "provider-sync-search-ad-performance-2026-05-23",
    provider: "search_ad",
    label: "네이버 키워드광고 성과 읽기 전용 수집",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/stats",
    sourceUrl: "http://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["키워드/기기/시간대 성과 집계만 저장했습니다."],
    checkedAt: "2026-05-23T08:00:00.000Z",
    httpStatus: 200,
    searchAdPerformanceSnapshots: [
      {
        id: "ad-perf-stickersee-no-order-2026-05-23",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일 답례품",
        device: "ALL",
        timeSlot: "09-23",
        windowDays: 7,
        impressions: 2400,
        clicks: 64,
        cost: 38400,
        conversions: 0,
        revenue: 0,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
      {
        id: "ad-perf-stickersee-mobile-2026-05-23",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일축하스티커",
        device: "MOBILE",
        timeSlot: "18-23",
        windowDays: 7,
        impressions: 1800,
        clicks: 120,
        cost: 72000,
        conversions: 2,
        revenue: 60000,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
      {
        id: "ad-perf-stickersee-pc-2026-05-23",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일축하스티커",
        device: "PC",
        timeSlot: "09-17",
        windowDays: 7,
        impressions: 1200,
        clicks: 80,
        cost: 40000,
        conversions: 8,
        revenue: 240000,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
    ],
  };
}

function buildShoppingSearchAdPerformanceReport(): ProviderSyncReport {
  return {
    id: "provider-sync-shopping-search-ad-performance-2026-05-23",
    provider: "search_ad",
    label: "네이버 쇼핑검색광고 성과 읽기 전용 수집",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/stats",
    sourceUrl: "http://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["쇼핑검색광고 검색어 성과 집계만 저장했습니다."],
    checkedAt: "2026-05-23T08:00:00.000Z",
    httpStatus: 200,
    shoppingSearchAdPerformanceSnapshots: [
      {
        id: "shopping-search-perf-stickersee-no-order-2026-05-23",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 쇼핑검색광고",
        adGroupName: "대표 상품형",
        adGroupId: "grp-shopping-a001",
        searchKeyword: "스승의날 카드",
        productGroupName: "스티커씨 선물카드",
        mallName: "스티커씨",
        registeredProductType: "GENERAL",
        windowDays: 30,
        clicks: 42,
        directConversionRate: 0,
        cost: 18900,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
    ],
  };
}
