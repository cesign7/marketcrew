import { describe, expect, it } from "vitest";
import { toKeywordDiagnosticMetrics } from "./keyword-diagnostics";

describe("keyword diagnostics DB helpers", () => {
  it("aggregates performance rows by keyword for diagnosis", () => {
    const metrics = toKeywordDiagnosticMetrics([
      row({
        keywordId: "kw-1",
        impressions: 100,
        clicks: 10,
        cost: 5000,
        conversions: 1,
        conversionSales: 50_000,
        avgRank: 2,
      }),
      row({
        keywordId: "kw-1",
        impressions: 200,
        clicks: 20,
        cost: 10_000,
        conversions: 2,
        conversionSales: 100_000,
        avgRank: 3,
      }),
    ]);

    expect(metrics).toEqual([
      {
        keywordId: "kw-1",
        keyword: "기업 초대장",
        campaignId: "cmp-1",
        adgroupId: "grp-1",
        impressions: 300,
        clicks: 30,
        cost: 15000,
        conversions: 3,
        conversionSales: 150000,
        avgRank: 2.5,
        avgCpc: 500,
      },
    ]);
  });
});

function row(overrides: Partial<PerformanceRowInput> = {}): PerformanceRowInput {
  return {
    keywordId: "kw-1",
    keyword: "기업 초대장",
    campaignId: "cmp-1",
    adgroupId: "grp-1",
    impressions: 100,
    clicks: 10,
    cost: 5000,
    conversions: 1,
    conversionSales: 50_000,
    avgRank: 2,
    ...overrides,
  };
}

interface PerformanceRowInput {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adgroupId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number | null;
  conversionSales: number | null;
  avgRank: number | null;
}
