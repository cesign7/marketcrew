import { describe, expect, it } from "vitest";
import { REPORT_COLUMN_SCHEMAS } from "@/features/search-ad/domain/reportColumnSchemas";
import { parseSearchAdReport } from "@/features/search-ad/domain/parseSearchAdReport";

describe("parseSearchAdReport", () => {
  it("헤더 없는 TSV를 reportTp 컬럼 순서표로 해석한다", () => {
    const rawText = [
      "커피프린트_파워링크\t봉투/포장 인쇄\t종이컵인쇄\t소량 종이컵 제작\t1,800\t42\t38,200\t0\t0\t2.3\t909\tPC",
      "스티커씨_파워링크\t감사 스티커\t답례스티커\t생일 답례 스티커\t900\t18\t12,000\t2\t66,000\t2.0\t667\tMOBILE",
    ].join("\n");

    const result = parseSearchAdReport("EXPKEYWORD", rawText, {
      reportFileId: "file-1",
      sourceDate: "2026-05-25",
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.brandKey).toBe("coffeeprint");
    expect(result.rows[0]?.rawRow.clicks).toBe(42);
    expect(result.normalizedRows[0]).toMatchObject({
      adProductType: "powerlink",
      brandKey: "coffeeprint",
      clicks: 42,
      cost: 38200,
      searchTerm: "소량 종이컵 제작",
    });
  });

  it("컬럼 수가 맞지 않으면 파싱 실패를 명확히 낸다", () => {
    expect(() =>
      parseSearchAdReport("EXPKEYWORD", "커피프린트_파워링크\t부족한행", {
        reportFileId: "file-1",
        sourceDate: "2026-05-25",
      }),
    ).toThrow("SEARCH_AD_REPORT_PARSE_FAILED:EXPKEYWORD");
  });

  it("실제 확인된 reportTp별 컬럼 수를 고정한다", () => {
    expect(REPORT_COLUMN_SCHEMAS.AD).toHaveLength(14);
    expect(REPORT_COLUMN_SCHEMAS.AD_DETAIL).toHaveLength(16);
    expect(REPORT_COLUMN_SCHEMAS.AD_CONVERSION).toHaveLength(13);
    expect(REPORT_COLUMN_SCHEMAS.AD_CONVERSION_DETAIL).toHaveLength(15);
    expect(REPORT_COLUMN_SCHEMAS.ADEXTENSION).toHaveLength(15);
    expect(REPORT_COLUMN_SCHEMAS.EXPKEYWORD).toHaveLength(12);
    expect(REPORT_COLUMN_SCHEMAS.SHOPPINGKEYWORD_DETAIL).toHaveLength(16);
    expect(REPORT_COLUMN_SCHEMAS.SHOPPINGKEYWORD_CONVERSION_DETAIL).toHaveLength(15);
    expect(REPORT_COLUMN_SCHEMAS.CRITERION).toHaveLength(7);
    expect(REPORT_COLUMN_SCHEMAS.CRITERION_CONVERSION).toHaveLength(8);
  });
});
