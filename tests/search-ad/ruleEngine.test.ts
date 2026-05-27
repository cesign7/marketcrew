import { describe, expect, it } from "vitest";
import { buildSearchAdRuleResults } from "@/features/search-ad/domain/ruleEngine";
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

describe("buildSearchAdRuleResults", () => {
  it("클릭과 비용은 있으나 전환이 없으면 저효율 후보로 분류한다", () => {
    const results = buildSearchAdRuleResults([row({ id: "row-low", clicks: 20, cost: 20000, conversions: 0, salesAmount: 0 })], criteria);

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("low_efficiency");
    expect(results[0]?.severity).toBe("medium");
  });

  it("목표 CPA와 ROAS를 통과하면 우수 후보로 분류한다", () => {
    const results = buildSearchAdRuleResults(
      [row({ id: "row-good", brandKey: "stickersee", clicks: 30, cost: 30000, conversions: 3, salesAmount: 120000 })],
      [{ ...criteria[0], brandKey: "stickersee" }],
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("good_performance");
  });

  it("전환은 있는데 전환매출이 없으면 ROAS 판단보다 데이터 점검을 먼저 올린다", () => {
    const results = buildSearchAdRuleResults(
      [row({ id: "row-missing-sales", brandKey: "stickersee", clicks: 30, cost: 30000, conversions: 2, salesAmount: 0 })],
      [{ ...criteria[0], brandKey: "stickersee" }],
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("needs_review");
    expect(results[0]?.evidencePacket.actionIntentLabel).toBe("데이터 점검 후보");
    expect(results[0]?.reason).toContain("전환매출");
  });

  it("커피프린트는 전환 기준 확정 전까지 전환 성과를 데이터 점검으로 먼저 올린다", () => {
    const results = buildSearchAdRuleResults([row({ id: "row-coffeeprint-conversion", clicks: 30, cost: 30000, conversions: 2, salesAmount: 120000 })], criteria);

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("needs_review");
    expect(results[0]?.reason).toContain("커피프린트 전환 기준");
    expect(results[0]?.evidencePacket.measurementStatusLabel).toBe("전환 기준 확인 필요");
  });

  it("최소 표본에 못 미치면 판단하지 않는다", () => {
    const results = buildSearchAdRuleResults([row({ id: "row-small", impressions: 10, clicks: 1, cost: 900, conversions: 0, salesAmount: 0 })], criteria);

    expect(results).toHaveLength(0);
  });
});

function row(overrides: Partial<SearchAdNormalizedRow>): SearchAdNormalizedRow {
  return {
    id: "row",
    reportRowId: "raw-row",
    reportType: "EXPKEYWORD",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    campaignName: "커피프린트_파워링크",
    adgroupName: "봉투/포장 인쇄",
    keywordText: "종이컵인쇄",
    searchTerm: "소량 종이컵 제작",
    impressions: 1000,
    clicks: 20,
    cost: 20000,
    conversions: 0,
    salesAmount: 0,
    sourceDate: "2026-05-25",
    ...overrides,
  };
}
