import { describe, expect, it } from "vitest";
import { normalizeSearchAdReportStatDate } from "@/server/search-ad/reportSync";

describe("normalizeSearchAdReportStatDate", () => {
  it("네이버 UTC 기준일을 한국 시간 보고서 기준일로 변환한다", () => {
    expect(normalizeSearchAdReportStatDate("2026-05-24T15:00:00Z")).toBe("2026-05-25");
  });

  it("YYYYMMDD 값은 그대로 보고서 기준일로 해석한다", () => {
    expect(normalizeSearchAdReportStatDate("20260525")).toBe("2026-05-25");
  });
});
