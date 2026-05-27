import { describe, expect, it } from "vitest";
import { ALL_SEARCH_AD_REPORT_TYPES } from "@/features/search-ad/domain/reportRetention";
import { REPORT_TYPE_GUIDES } from "@/features/search-ad/domain/reportTypes";
import { RULE_CATEGORY_GUIDES } from "@/features/search-ad/domain/ruleCriteriaGuides";
import { RULE_CATEGORY_LABELS } from "@/features/search-ad/domain/reportTypes";

describe("search ad guide copy", () => {
  it("모든 네이버 보고서 종류에 해석 안내가 있다", () => {
    for (const reportType of ALL_SEARCH_AD_REPORT_TYPES) {
      const guide = REPORT_TYPE_GUIDES[reportType];

      expect(guide.focus).not.toHaveLength(0);
      expect(guide.includes).not.toHaveLength(0);
      expect(guide.useFor).not.toHaveLength(0);
      expect(guide.caution).not.toHaveLength(0);
    }
  });

  it("파워링크와 쇼핑검색광고 검색어 보고서의 주의 문구를 분리한다", () => {
    expect(REPORT_TYPE_GUIDES.EXPKEYWORD.caution).toContain("파워링크");
    expect(REPORT_TYPE_GUIDES.EXPKEYWORD.caution).toContain("쇼핑검색광고 검색어와 섞어 판단하지 않습니다");
    expect(REPORT_TYPE_GUIDES.SHOPPINGKEYWORD_DETAIL.focus).toContain("쇼핑검색광고");
  });

  it("모든 규칙 분류에 카드 해석 안내가 있다", () => {
    const guideCategories = new Set(RULE_CATEGORY_GUIDES.map((guide) => guide.category));

    for (const category of Object.keys(RULE_CATEGORY_LABELS)) {
      expect(guideCategories.has(category as keyof typeof RULE_CATEGORY_LABELS)).toBe(true);
    }
  });
});
