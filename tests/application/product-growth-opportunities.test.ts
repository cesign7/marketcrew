import { describe, expect, it } from "vitest";
import { buildProductGrowthOpportunities } from "../../src/lib/application/product-growth-opportunities";
import type { ProviderSyncReport } from "../../src/lib/domain";

describe("buildProductGrowthOpportunities", () => {
  it("Search Ad 키워드 수요와 쇼핑몰 집계를 합쳐 상품별 후보를 만든다", () => {
    const opportunities = buildProductGrowthOpportunities({
      providerSyncReports: buildSyncedReports(),
      generatedAt: "2026-05-22T02:00:00.000Z",
    });

    expect(opportunities.map((opportunity) => [opportunity.kind, opportunity.owner])).toEqual([
      ["KEYWORD_EXPANSION", "gro"],
      ["MARKETING_PROPOSAL", "copy"],
      ["PRODUCT_DISCOVERY", "pro"],
    ]);
    expect(opportunities[0]?.keywordCandidates).toEqual([
      "추석 선물카드",
      "부처님오신날 선물카드",
      "명절 답례 카드",
      "스승의날 선물",
    ]);
    expect(opportunities[0]?.evidenceLabels).toContain("최대 월검색 16,000회");
    expect(opportunities[2]?.summary).toContain("재구매 고객 4명");
    expect(opportunities.every((opportunity) => opportunity.guardrail.includes("외부 반영 잠금"))).toBe(true);
  });

  it("상품 집계나 키워드 수요가 없으면 근거 없는 후보를 만들지 않는다", () => {
    const opportunities = buildProductGrowthOpportunities({
      providerSyncReports: [
        {
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
          evidenceNotes: ["실패"],
          checkedAt: "2026-05-22T02:00:00.000Z",
          failureReason: "SIGNATURE_ERROR",
        },
      ],
      generatedAt: "2026-05-22T02:00:00.000Z",
    });

    expect(opportunities).toEqual([]);
  });
});

function buildSyncedReports(): ProviderSyncReport[] {
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
      evidenceNotes: ["read-only keyword tool 응답 4건"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      keywordDemandSnapshots: [
        buildKeyword("kw-1", "부처님오신날 선물카드", 5000, 8000),
        buildKeyword("kw-2", "추석 선물카드", 6000, 10000),
        buildKeyword("kw-3", "명절 답례 카드", 3000, 5000),
        buildKeyword("kw-4", "스승의날 선물", 2000, 3000),
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
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      searchTrendSnapshots: [
        {
          id: "trend-1",
          keywordGroupName: "부처님오신날",
          provider: "naver_datalab",
          timeUnit: "date",
          startDate: "2026-04-22",
          endDate: "2026-05-22",
          ratios: [{ period: "2026-05-22", ratio: 100 }],
          collectedAt: "2026-05-22T02:00:00.000Z",
          note: "relative_ratio_not_absolute_volume",
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
    },
  ];
}

function buildKeyword(
  id: string,
  keyword: string,
  monthlyPcSearches: number,
  monthlyMobileSearches: number,
): NonNullable<ProviderSyncReport["keywordDemandSnapshots"]>[number] {
  return {
    id,
    keyword,
    provider: "naver_keyword_tool",
    monthlyPcSearches,
    monthlyMobileSearches,
    competitionIndex: "MEDIUM",
    cachedUntil: "2026-05-23T02:00:00.000Z",
    collectedAt: "2026-05-22T02:00:00.000Z",
    rateLimitState: "OK",
  };
}
