import { describe, expect, it } from "vitest";
import { buildSearchAdFilterHref } from "@/features/search-ad/domain/filterLinks";

describe("buildSearchAdFilterHref", () => {
  it("상세 페이지 경로를 유지하면서 브랜드와 광고유형 필터를 붙인다", () => {
    expect(buildSearchAdFilterHref("/reports/report-1", { brand: "stickersee", adProduct: "shopping_search" })).toBe(
      "/reports/report-1?brand=stickersee&adProduct=shopping_search",
    );
  });

  it("기존 query와 hash를 유지하고 전체 필터는 query에서 제거한다", () => {
    expect(buildSearchAdFilterHref("/rule-results?actionIntent=landing_check#top", { brand: "all", adProduct: "powerlink" })).toBe(
      "/rule-results?actionIntent=landing_check&adProduct=powerlink#top",
    );
  });
});
