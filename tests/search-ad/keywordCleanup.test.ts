import { describe, expect, it } from "vitest";
import { buildSearchAdKeywordCleanupView, normalizeKeywordText, type SearchAdKeywordStateForCleanup } from "@/features/search-ad/domain/keywordCleanup";

describe("search ad keyword cleanup", () => {
  it("브랜드와 광고유형 안에서 같은 키워드를 중복 묶음으로 만든다", () => {
    const view = buildSearchAdKeywordCleanupView({
      filters: { brand: "all", adProduct: "all" },
      generatedAt: "2026-05-28T09:00:00+09:00",
      keywords: [
        keyword({ keywordId: "kw-1", keywordText: "종이컵인쇄", adgroupId: "grp-a", adgroupName: "A그룹" }),
        keyword({ keywordId: "kw-2", keywordText: " 종이컵인쇄 ", adgroupId: "grp-b", adgroupName: "B그룹" }),
      ],
      performanceRows: [
        {
          brandKey: "coffeeprint",
          adProductType: "powerlink",
          keywordId: "kw-1",
          keywordText: "종이컵인쇄",
          impressions: 1000,
          clicks: 12,
          cost: 12000,
          conversions: 1,
          salesAmount: 50000,
          dataDays: 120,
          startDate: "2026-01-01",
          endDate: "2026-04-30",
        },
      ],
      coverageRows: [{ brandKey: "coffeeprint", adProductType: "powerlink", startDate: "2026-01-01", endDate: "2026-04-30", actualDays: 120 }],
    });

    expect(view.duplicateGroups).toHaveLength(1);
    expect(view.duplicateGroups[0]?.bestKeywordId).toBe("kw-1");
    expect(view.duplicateGroups[0]?.candidates.map((candidate) => candidate.recommendation)).toContain("delete_candidate");
  });

  it("저장된 성과 범위에서 클릭 없는 키워드를 정리 후보로 보여준다", () => {
    const view = buildSearchAdKeywordCleanupView({
      filters: { brand: "stickersee", adProduct: "powerlink" },
      keywords: [keyword({ brandKey: "stickersee", keywordId: "kw-zero", keywordText: "스승의날스티커" })],
      performanceRows: [],
      coverageRows: [{ brandKey: "stickersee", adProductType: "powerlink", startDate: "2025-06-01", endDate: "2026-05-28", actualDays: 365 }],
    });

    expect(view.noClickCandidates).toHaveLength(1);
    expect(view.noClickCandidates[0]?.recommendation).toBe("pause_candidate");
    expect(view.noClickCandidates[0]?.reason).toContain("클릭");
  });

  it("키워드 비교용 정규화는 앞뒤 공백과 연속 공백만 정리한다", () => {
    expect(normalizeKeywordText("  생일   답례품  ")).toBe("생일 답례품");
  });
});

function keyword(overrides: Partial<SearchAdKeywordStateForCleanup>): SearchAdKeywordStateForCleanup {
  return {
    adProductType: "powerlink",
    brandKey: "coffeeprint",
    collectedAt: "2026-05-28T08:00:00+09:00",
    keywordId: "kw",
    keywordText: "키워드",
    userLock: false,
    ...overrides,
  };
}
