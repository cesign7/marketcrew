import { describe, expect, it } from "vitest";
import { buildSearchAdKeywordInsightView } from "@/features/search-ad/domain/keywordInsights";

describe("keyword insights", () => {
  it("같은 키워드의 기기, 매체, 시간대 조합을 효율 후보와 축소 후보로 나눈다", () => {
    const view = buildSearchAdKeywordInsightView({
      filters: { brand: "stickersee", adProduct: "shopping_search" },
      generatedAt: "2026-05-28T09:00:00+09:00",
      segments: [
        {
          brandKey: "stickersee",
          adProductType: "shopping_search",
          targetLabel: "생일답례품스티커",
          targetKind: "search_term",
          searchTerm: "생일답례품스티커",
          device: "M",
          mediaId: "8753",
          mediaLabel: "네이버 통합검색 - 모바일",
          hourCode: "10",
          regionCode: "02",
          impressions: 1200,
          clicks: 80,
          cost: 80000,
          conversions: 16,
          salesAmount: 480000,
          dataDays: 12,
          reportStartDate: "2026-05-01",
          reportEndDate: "2026-05-28",
          reportsUsed: ["SHOPPINGKEYWORD_DETAIL", "SHOPPINGKEYWORD_CONVERSION_DETAIL"],
        },
        {
          brandKey: "stickersee",
          adProductType: "shopping_search",
          targetLabel: "생일답례품스티커",
          targetKind: "search_term",
          searchTerm: "생일답례품스티커",
          device: "P",
          mediaId: "11068",
          mediaLabel: "네이버 쇼핑 - PC",
          hourCode: "21",
          regionCode: "09",
          impressions: 600,
          clicks: 32,
          cost: 36000,
          conversions: 0,
          salesAmount: 0,
          dataDays: 8,
          reportStartDate: "2026-05-01",
          reportEndDate: "2026-05-28",
          reportsUsed: ["SHOPPINGKEYWORD_DETAIL"],
        },
      ],
    });

    expect(view.bestSegments[0]).toMatchObject({
      recommendation: "scale",
      deviceLabel: "모바일",
      hourLabel: "10시~11시",
      regionLabel: "지역 코드 02",
    });
    expect(view.wasteSegments[0]).toMatchObject({
      recommendation: "narrow",
      deviceLabel: "PC",
      hourLabel: "21시~22시",
    });
  });

  it("표본이 작은 조합은 확장하지 않고 관찰 후보로 남긴다", () => {
    const view = buildSearchAdKeywordInsightView({
      filters: { brand: "coffeeprint", adProduct: "powerlink" },
      segments: [
        {
          brandKey: "coffeeprint",
          adProductType: "powerlink",
          targetLabel: "초대장제작",
          targetKind: "registered_keyword",
          keywordText: "초대장제작",
          impressions: 40,
          clicks: 2,
          cost: 3000,
          conversions: 1,
          salesAmount: 120000,
          dataDays: 1,
          reportsUsed: ["AD_DETAIL", "AD_CONVERSION_DETAIL"],
        },
      ],
    });

    expect(view.bestSegments).toHaveLength(0);
    expect(view.watchSegments[0]?.recommendation).toBe("watch");
  });

  it("광고 ID 기준 조합은 키워드와 분리하고 실제 광고명으로 판단한다", () => {
    const view = buildSearchAdKeywordInsightView({
      filters: { brand: "stickersee", adProduct: "shopping_search" },
      generatedAt: "2026-05-28T09:00:00+09:00",
      segments: [
        {
          brandKey: "stickersee",
          adProductType: "shopping_search",
          targetLabel: "생일축하스티커 상품 광고",
          targetKind: "ad",
          adId: "nad-a001-02-000000203421541",
          campaignName: "스티커씨_쇼핑검색",
          adgroupName: "M_감사/생일/답례 스티커",
          device: "M",
          mediaId: "8753",
          mediaLabel: "네이버 통합검색 - 모바일",
          hourCode: "21",
          regionCode: "02",
          impressions: 800,
          clicks: 21,
          cost: 23025,
          conversions: 14,
          salesAmount: 202400,
          dataDays: 22,
          reportStartDate: "2026-05-06",
          reportEndDate: "2026-05-27",
          reportsUsed: ["AD_DETAIL", "AD_CONVERSION_DETAIL"],
        },
      ],
    });

    expect(view.bestSegments[0]).toMatchObject({
      targetKind: "ad",
      targetLabel: "생일축하스티커 상품 광고",
      hourLabel: "21시~22시",
    });
  });
});
