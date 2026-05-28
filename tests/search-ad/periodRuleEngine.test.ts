import { describe, expect, it } from "vitest";
import { buildSearchAdPeriodRuleResults } from "@/features/search-ad/domain/ruleEngine";
import type { SearchAdNormalizedRow, SearchAdRuleCriteria } from "@/features/search-ad/domain/types";

const criteria: SearchAdRuleCriteria[] = [
  {
    id: "criteria-coffeeprint-powerlink",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    periodDays: 30,
    minImpressions: 100,
    minClicks: 10,
    minCost: 10000,
    targetCpa: 25000,
    targetRoas: 250,
    enabled: true,
  },
];

describe("buildSearchAdPeriodRuleResults", () => {
  it("기간 안의 같은 검색어 성과를 합산하고 실제 수집 일수를 함께 남긴다", () => {
    const results = buildSearchAdPeriodRuleResults(
      [
        row({ id: "row-1", sourceDate: "2026-05-24", clicks: 6, cost: 6000 }),
        row({ id: "row-2", sourceDate: "2026-05-25", clicks: 6, cost: 6000 }),
      ],
      criteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("low_efficiency");
    expect(results[0]?.metrics.clicks).toBe(12);
    expect(results[0]?.metrics.cost).toBe(12000);
    expect(results[0]?.reason).toContain("일부 기간 판단");
    expect(results[0]?.evidencePacket.actualDataDays).toBe(2);
    expect(results[0]?.evidencePacket.coverageStatus).toBe("partial");
    expect(results[0]?.evidencePacket.dataCoverageLabel).toBe("수집 2026-05-24~2026-05-25 · 실제 2일 기준 (목표 30일)");
  });

  it("기준 기간이 모두 수집되면 정상 판단으로 표시하고 합산 전환 성과를 판단한다", () => {
    const sevenDayCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        brandKey: "stickersee",
        periodDays: 7,
        minClicks: 7,
        minCost: 700,
        targetCpa: 1000,
        targetRoas: 200,
      },
    ];
    const rows = Array.from({ length: 7 }, (_, index) =>
      row({
        brandKey: "stickersee",
        id: `row-good-${index}`,
        sourceDate: `2026-05-${String(19 + index).padStart(2, "0")}`,
        clicks: 2,
        cost: 100,
        conversions: 1,
        salesAmount: 500,
      }),
    );

    const results = buildSearchAdPeriodRuleResults(rows, sevenDayCriteria, "2026-05-26T08:00:00+09:00");

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("good_performance");
    expect(results[0]?.evidencePacket.actualDataDays).toBe(7);
    expect(results[0]?.evidencePacket.coverageStatus).toBe("complete");
    expect(results[0]?.evidencePacket.coverageWarningLabel).toBe("정상 판단");
    expect(results[0]?.evidencePacket.dataCoverageLabel).toBe("수집 2026-05-19~2026-05-25 · 최근 7일 기준");
  });

  it("커피프린트 전환 기준이 확정 전이면 우수 성과로 단정하지 않고 데이터 점검으로 올린다", () => {
    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "coffeeprint-conversion",
          clicks: 20,
          cost: 20000,
          conversions: 2,
          salesAmount: 100000,
        }),
      ],
      criteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("needs_review");
    expect(results[0]?.reason).toContain("커피프린트 전환 기준");
    expect(results[0]?.evidencePacket.measurementStatusLabel).toBe("전환 기준 확인 필요");
  });

  it("기준 기간 밖의 오래된 성과는 현재 판단에 합산하지 않는다", () => {
    const results = buildSearchAdPeriodRuleResults(
      [
        row({ id: "old-row", sourceDate: "2026-04-01", clicks: 50, cost: 50000 }),
        row({ id: "recent-row", sourceDate: "2026-05-25", clicks: 1, cost: 1000 }),
      ],
      criteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(0);
  });

  it("한글 검색어가 다른데 ID 정규화 결과가 같아도 서로 다른 규칙 결과로 남긴다", () => {
    const noClickCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        adProductType: "shopping_search",
        minImpressions: 100,
        minClicks: 10,
        minCost: 10000,
      },
    ];

    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "row-horse",
          adProductType: "shopping_search",
          reportType: "SHOPPINGKEYWORD_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          searchTerm: "말띠해",
          keywordText: "말띠해",
          device: "P",
          mediaId: "612593",
          impressions: 120,
          clicks: 0,
          cost: 0,
        }),
        row({
          id: "row-year",
          adProductType: "shopping_search",
          reportType: "SHOPPINGKEYWORD_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          searchTerm: "병오년",
          keywordText: "병오년",
          device: "P",
          mediaId: "612593",
          impressions: 130,
          clicks: 0,
          cost: 0,
        }),
      ],
      noClickCriteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(2);
    expect(new Set(results.map((result) => result.id)).size).toBe(2);
    expect(results.map((result) => result.targetLabel).sort()).toEqual(["말띠해", "병오년"]);
  });

  it("쇼핑검색 검색어 상세와 전환 상세를 같은 검색어로 합산해 판단한다", () => {
    const shoppingCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        brandKey: "stickersee",
        adProductType: "shopping_search",
        targetCpa: 10000,
        targetRoas: 200,
      },
    ];

    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "shopping-clicks",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "SHOPPINGKEYWORD_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          searchTerm: "생일답례품스티커",
          clicks: 20,
          cost: 10000,
          conversions: 0,
          salesAmount: 0,
        }),
        row({
          id: "shopping-conversions",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "SHOPPINGKEYWORD_CONVERSION_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          searchTerm: "생일답례품스티커",
          clicks: 0,
          cost: 0,
          conversions: 2,
          salesAmount: 50000,
        }),
      ],
      shoppingCriteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("good_performance");
    expect(results[0]?.metrics.clicks).toBe(20);
    expect(results[0]?.metrics.conversions).toBe(2);
    expect(results[0]?.metrics.salesAmount).toBe(50000);
    expect(results[0]?.evidencePacket.actionIntentLabel).toBe("상품 확장 후보");
    expect(results[0]?.evidencePacket.seasonHint).toBe("생일/답례");
    expect(results[0]?.evidencePacket.sourceRowIds).toEqual(expect.arrayContaining([expect.stringContaining("shopping-clicks"), expect.stringContaining("shopping-conversions")]));
  });

  it("쇼핑검색 확장소재 성과 보고서는 기간 합산 후에도 비효율 후보로 올리지 않는다", () => {
    const shoppingCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        brandKey: "stickersee",
        adProductType: "shopping_search",
        minImpressions: 100,
        minClicks: 10,
        minCost: 10000,
      },
    ];

    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "shopping-extension-1",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "ADEXTENSION",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          extensionId: "ext-shopping-talk",
          impressions: 2000,
          clicks: 0,
          cost: 0,
        }),
        row({
          id: "shopping-extension-2",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "ADEXTENSION",
          campaignId: "cmp-shopping",
          adgroupId: "grp-shopping",
          extensionId: "ext-shopping-talk",
          sourceDate: "2026-05-24",
          impressions: 1200,
          clicks: 0,
          cost: 0,
        }),
      ],
      shoppingCriteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(0);
  });

  it("같은 상품 광고의 광고성과 보고서가 있으면 광고성과 상세 보고서를 별도 저효율로 중복 판단하지 않는다", () => {
    const shoppingCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        brandKey: "stickersee",
        adProductType: "shopping_search",
        targetCpa: 10000,
        targetRoas: 200,
      },
    ];

    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "shopping-ad-performance",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "AD",
          campaignId: "cmp-shopping",
          adgroupId: "grp-birthday",
          adgroupName: "M_감사/생일/답례 스티커",
          adId: "nad-birthday",
          device: "M",
          mediaId: "8753",
          searchTerm: undefined,
          keywordText: undefined,
          clicks: 625,
          cost: 707213,
          conversions: 218,
          salesAmount: 2401400,
        }),
        row({
          id: "shopping-ad-detail-zero-conversion",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "AD_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-birthday",
          adgroupName: "M_감사/생일/답례 스티커",
          adId: "nad-birthday",
          device: "M",
          mediaId: "8753",
          searchTerm: undefined,
          keywordText: undefined,
          clicks: 625,
          cost: 707242,
          conversions: 0,
          salesAmount: 0,
        }),
      ],
      shoppingCriteria,
      "2026-05-26T08:00:00+09:00",
    );

    const birthdayResults = results.filter((result) => result.targetId === "nad-birthday");

    expect(birthdayResults).toHaveLength(1);
    expect(birthdayResults[0]?.category).toBe("good_performance");
    expect(birthdayResults[0]?.metrics.clicks).toBe(625);
    expect(birthdayResults[0]?.metrics.conversions).toBe(218);
    expect(results.some((result) => result.category === "low_efficiency")).toBe(false);
  });

  it("광고성과 상세 보고서만 있으면 전환이 없다고 단정하지 않고 자동 후보를 만들지 않는다", () => {
    const shoppingCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        brandKey: "stickersee",
        adProductType: "shopping_search",
      },
    ];

    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "shopping-ad-detail-only",
          brandKey: "stickersee",
          adProductType: "shopping_search",
          reportType: "AD_DETAIL",
          campaignId: "cmp-shopping",
          adgroupId: "grp-birthday",
          adgroupName: "M_감사/생일/답례 스티커",
          adId: "nad-only-detail",
          device: "P",
          mediaId: "11068",
          searchTerm: undefined,
          keywordText: undefined,
          clicks: 20,
          cost: 20000,
          conversions: 0,
          salesAmount: 0,
        }),
      ],
      shoppingCriteria,
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(0);
  });

  it("타게팅 성과와 타게팅 전환을 합산해 기기/연령대 조정 후보를 판단한다", () => {
    const results = buildSearchAdPeriodRuleResults(
      [
        row({
          id: "criterion-clicks",
          brandKey: "stickersee",
          reportType: "CRITERION",
          criterionId: "grp-a001~AG3539",
          searchTerm: undefined,
          keywordText: undefined,
          device: "M",
          clicks: 12,
          cost: 12000,
          conversions: 0,
          salesAmount: 0,
        }),
        row({
          id: "criterion-conversions",
          brandKey: "stickersee",
          reportType: "CRITERION_CONVERSION",
          criterionId: "grp-a001~AG3539",
          searchTerm: undefined,
          keywordText: undefined,
          device: "M",
          clicks: 0,
          cost: 0,
          conversions: 1,
          salesAmount: 60000,
        }),
      ],
      [{ ...criteria[0], brandKey: "stickersee" }],
      "2026-05-26T08:00:00+09:00",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("good_performance");
    expect(results[0]?.targetType).toBe("criterion");
    expect(results[0]?.evidencePacket.actionIntentLabel).toBe("타게팅 조정 후보");
    expect(results[0]?.evidencePacket.deviceLabel).toBe("모바일");
    expect(results[0]?.evidencePacket.targetDetailLabel).toBe("35~39세");
  });
});

function row(overrides: Partial<SearchAdNormalizedRow>): SearchAdNormalizedRow {
  return {
    id: "row",
    reportRowId: "report-20260525-row-1",
    reportType: "EXPKEYWORD",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    campaignName: "커피프린트_파워링크",
    adgroupName: "봉투/포장 인쇄",
    keywordText: "종이컵인쇄",
    searchTerm: "소량 종이컵 제작",
    impressions: 1000,
    clicks: 6,
    cost: 6000,
    conversions: 0,
    salesAmount: 0,
    sourceDate: "2026-05-25",
    ...overrides,
  };
}
