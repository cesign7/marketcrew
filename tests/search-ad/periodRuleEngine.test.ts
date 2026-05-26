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
    expect(results[0]?.evidencePacket.dataCoverageLabel).toBe("수집 2026-05-24~2026-05-25 · 실제 2일치 / 규칙 30일");
  });

  it("기준 기간이 모두 수집되면 정상 판단으로 표시하고 합산 전환 성과를 판단한다", () => {
    const sevenDayCriteria: SearchAdRuleCriteria[] = [
      {
        ...criteria[0],
        periodDays: 7,
        minClicks: 7,
        minCost: 700,
        targetCpa: 1000,
        targetRoas: 200,
      },
    ];
    const rows = Array.from({ length: 7 }, (_, index) =>
      row({
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
