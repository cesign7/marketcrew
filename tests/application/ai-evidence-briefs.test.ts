import { describe, expect, it } from "vitest";
import { buildAiEvidenceBriefs } from "../../src/lib/application/ai-evidence-briefs";
import type { ProviderSyncReport } from "../../src/lib/domain";

describe("buildAiEvidenceBriefs", () => {
  it("연동 수집 기록을 AI 판독용 요약 근거와 판단 등급으로 정리한다", () => {
    const briefs = buildAiEvidenceBriefs({
      providerSyncReports: buildProviderReports(),
      generatedAt: "2026-05-22T09:00:00.000Z",
    });

    expect(briefs.map((brief) => [brief.providerKey, brief.decision])).toEqual([
      ["search_ad", "JUDGMENT_READY"],
      ["datalab", "SOURCE_REVIEW_REQUIRED"],
      ["smartstore", "JUDGMENT_READY"],
      ["shop", "JUDGMENT_READY"],
    ]);
    expect(briefs.map((brief) => brief.providerKey)).not.toContain("commerce_cross_channel");

    const keywordBrief = briefs.find((brief) => brief.providerKey === "search_ad");
    expect(keywordBrief?.title).toBe("네이버 키워드광고 AI 판독 근거");
    expect(keywordBrief?.summary).toContain("상위 키워드 2개");
    expect(keywordBrief?.allowedUseCases).toContain("키워드 확장 후보 선별");
    expect(keywordBrief?.blockedUseCases).toContain("광고비/입찰가 즉시 변경");
    expect(keywordBrief?.rawDataPolicyLabel).toBe("원천 행 제외, 요약 근거와 근거 ID만 사용");
    expect(keywordBrief?.evidenceIds).toEqual(["kw-1", "kw-2"]);

    const datalabBrief = briefs.find((brief) => brief.providerKey === "datalab");
    expect(datalabBrief?.decisionLabel).toBe("원천 확인 필요");
    expect(datalabBrief?.blockedUseCases).toContain("절대 검색량 판단");

    const smartstoreBrief = briefs.find((brief) => brief.providerKey === "smartstore");
    expect(smartstoreBrief?.summary).toContain("스티커씨 주문 100건");
    expect(smartstoreBrief?.blockedUseCases).toContain("상품 가격/옵션 즉시 변경");

    const commerceSummaries = briefs
      .filter((brief) => brief.providerKey === "smartstore" || brief.providerKey === "shop")
      .map((brief) => brief.summary)
      .join(" ");
    expect(commerceSummaries).not.toContain("함께");
  });

  it("수집 실패나 오래된 키워드 캐시는 결재 금지나 보강 필요로 낮춘다", () => {
    const briefs = buildAiEvidenceBriefs({
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
          evidenceNotes: ["서명 오류"],
          checkedAt: "2026-05-22T02:00:00.000Z",
          failureReason: "SIGNATURE_ERROR",
        },
        {
          id: "provider-sync-search-ad-stale",
          provider: "search_ad",
          label: "네이버 키워드광고 read-only sync",
          status: "SYNCED",
          readOnly: true,
          networkAttempted: true,
          writeAttempted: false,
          endpoint: "https://api.searchad.naver.com/keywordstool",
          sourceUrl: "http://naver.github.io/searchad-apidoc/",
          missingEnvKeys: [],
          evidenceNotes: ["stale keyword"],
          checkedAt: "2026-05-22T03:00:00.000Z",
          httpStatus: 200,
          keywordDemandSnapshots: [
            {
              id: "kw-stale",
              keyword: "오래된 키워드",
              provider: "naver_keyword_tool",
              monthlyPcSearches: 10,
              monthlyMobileSearches: 12,
              competitionIndex: "LOW",
              cachedUntil: "2026-05-22T04:00:00.000Z",
              collectedAt: "2026-05-21T02:00:00.000Z",
              rateLimitState: "STALE",
            },
          ],
        },
      ],
      generatedAt: "2026-05-22T09:00:00.000Z",
    });

    expect(briefs[0]?.decision).toBe("NEEDS_MORE_EVIDENCE");
    expect(briefs[0]?.decisionLabel).toBe("보강 필요");
    expect(briefs[0]?.blockedUseCases).toContain("결재 상신");
  });
});

function buildProviderReports(): ProviderSyncReport[] {
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
      evidenceNotes: ["read-only keyword tool 응답 2건"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      keywordDemandSnapshots: [
        {
          id: "kw-1",
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
          id: "kw-2",
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
        id: "shop-aggregate-COFFEEPRINT-2026-05-22",
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
