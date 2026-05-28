import { describe, expect, it } from "vitest";
import { groupRuleResultsForDisplay } from "@/features/search-ad/domain/ruleResultGrouping";
import type { SearchAdRuleResult } from "@/features/search-ad/domain/types";

describe("groupRuleResultsForDisplay", () => {
  it("같은 광고 소재가 기기/매체별로 쪼개진 경우 합산 카드와 세부 분해를 만든다", () => {
    const groups = groupRuleResultsForDisplay([
      result({ id: "mobile-main", device: "M", mediaId: "8753", clicks: 625, conversions: 218, cost: 707213, salesAmount: 2401400 }),
      result({ id: "pc", device: "P", mediaId: "11068", clicks: 17, conversions: 7, cost: 19823, salesAmount: 71500 }),
      result({ id: "mobile-sub", device: "M", mediaId: "341893", clicks: 44, conversions: 21, cost: 51688, salesAmount: 186400 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.results).toHaveLength(3);
    expect(groups[0]?.deviceCount).toBe(2);
    expect(groups[0]?.mediaCount).toBe(3);
    expect(groups[0]?.result.metrics.clicks).toBe(686);
    expect(groups[0]?.result.metrics.conversions).toBe(246);
    expect(groups[0]?.result.metrics.conversionRate).toBeCloseTo(35.86, 2);
    expect(groups[0]?.breakdowns.map((item) => item.label)).toEqual(["모바일 · 매체 8753", "모바일 · 매체 341893", "PC · 매체 11068"]);
  });

  it("같은 검색어라도 광고그룹이 다르면 다른 판단 카드로 남긴다", () => {
    const groups = groupRuleResultsForDisplay([
      result({ id: "group-a", targetType: "search_term", targetId: "스티커", targetLabel: "스티커", adgroupId: "grp-a", adgroupName: "감사 스티커" }),
      result({ id: "group-b", targetType: "search_term", targetId: "스티커", targetLabel: "스티커", adgroupId: "grp-b", adgroupName: "행사 스티커" }),
    ]);

    expect(groups).toHaveLength(2);
  });
});

type ResultOverrides = Partial<SearchAdRuleResult> & {
  adgroupId?: string;
  adgroupName?: string;
  clicks?: number;
  conversions?: number;
  cost?: number;
  device?: string;
  impressions?: number;
  mediaId?: string;
  salesAmount?: number;
};

function result(overrides: ResultOverrides = {}): SearchAdRuleResult {
  const clicks = Number(overrides.metrics?.clicks ?? overrides.clicks ?? 10);
  const conversions = Number(overrides.metrics?.conversions ?? overrides.conversions ?? 0);
  const cost = Number(overrides.metrics?.cost ?? overrides.cost ?? 10000);
  const salesAmount = Number(overrides.metrics?.salesAmount ?? overrides.salesAmount ?? 0);

  return {
    id: overrides.id ?? "rule",
    brandKey: overrides.brandKey ?? "stickersee",
    adProductType: overrides.adProductType ?? "shopping_search",
    category: overrides.category ?? "good_performance",
    targetType: overrides.targetType ?? "ad",
    targetId: overrides.targetId ?? "nad-a001-02-000000203421541",
    targetLabel: overrides.targetLabel ?? "M_감사/생일/답례 스티커 광고 소재",
    severity: overrides.severity ?? "low",
    periodDays: overrides.periodDays ?? 30,
    reason: overrides.reason ?? "성과 확인",
    metrics: {
      impressions: Number(overrides.metrics?.impressions ?? overrides.impressions ?? 1000),
      clicks,
      cost,
      conversions,
      salesAmount,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
      roas: cost > 0 ? (salesAmount / cost) * 100 : null,
    },
    evidencePacket: {
      actionIntent: "operation_check",
      reportFamily: "ad_performance",
      reportType: "AD",
      campaignId: "cmp-a",
      campaignName: "스티커씨_쇼핑검색",
      adgroupId: overrides.adgroupId ?? "grp-a001-02-000000029331497",
      adgroupName: overrides.adgroupName ?? "M_감사/생일/답례 스티커",
      adId: overrides.targetId ?? "nad-a001-02-000000203421541",
      device: overrides.device,
      deviceLabel: overrides.device ? (overrides.device === "P" ? "PC" : "모바일") : undefined,
      mediaId: overrides.mediaId,
      sourceRowIds: [`row-${overrides.id ?? "rule"}`],
      ...overrides.evidencePacket,
    },
    createdAt: overrides.createdAt ?? "2026-05-28T09:00:00+09:00",
  };
}
