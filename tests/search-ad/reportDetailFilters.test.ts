import { describe, expect, it } from "vitest";
import { createSampleReportDetailView } from "@/features/search-ad/domain/sampleData";

describe("createSampleReportDetailView filters", () => {
  it("보고서 상세도 브랜드와 광고유형 필터 기준으로 요약과 행을 줄인다", () => {
    const view = createSampleReportDetailView("report-sample-expkeyword-2026-05-25", {
      brand: "stickersee",
      adProduct: "shopping_search",
    });

    expect(view).toBeDefined();
    expect(view?.easyRows).toHaveLength(0);
    expect(view?.rawPreviewRows).toHaveLength(0);
    expect(view?.summary.cost).toBe(0);
  });

  it("필터에 맞는 행이 있으면 해당 범위만 합산한다", () => {
    const view = createSampleReportDetailView("report-sample-shopping-keyword-2026-05-25", {
      brand: "stickersee",
      adProduct: "shopping_search",
    });

    expect(view?.easyRows).toHaveLength(2);
    expect(view?.summary.cost).toBe(98000);
    expect(view?.summary.conversions).toBe(3);
  });
});
