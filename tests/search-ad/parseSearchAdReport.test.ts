import { describe, expect, it } from "vitest";
import { REPORT_COLUMN_SCHEMAS } from "@/features/search-ad/domain/reportColumnSchemas";
import { parseSearchAdReport } from "@/features/search-ad/domain/parseSearchAdReport";

describe("parseSearchAdReport", () => {
  it("헤더 없는 TSV를 reportTp 컬럼 순서표로 해석한다", () => {
    const rawText = [
      "20260525\t123888\tcmp-m002-01-000000039451167\tgrp-m001-01-000001408384958\t커피프린트 소량 종이컵 제작\t27758\tP\t42\t3\t0\t38200\t0",
      "20260525\t123888\tcmp-a001-02-000000005825928\tgrp-a001-02-000000029331497\t스티커씨 생일 답례 스티커\t8753\tM\t18\t2\t2\t12000\t66000",
    ].join("\n");

    const result = parseSearchAdReport("EXPKEYWORD", rawText, {
      reportFileId: "file-1",
      sourceDate: "2026-05-25",
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.brandKey).toBe("coffeeprint");
    expect(result.rows[0]?.rawRow.clicks).toBe(42);
    expect(result.rows[0]?.rawRow.cost).toBe(38200);
    expect(result.normalizedRows[0]).toMatchObject({
      adProductType: "powerlink",
      brandKey: "coffeeprint",
      clicks: 42,
      cost: 38200,
      searchTerm: "커피프린트 소량 종이컵 제작",
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
