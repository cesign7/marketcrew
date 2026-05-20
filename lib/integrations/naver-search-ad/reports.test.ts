import { describe, expect, it } from "vitest";
import {
  parseSearchAdStatReport,
  toKeywordPerformanceRowsFromReport,
} from "./reports";

describe("Naver Search Ad stat report parsing", () => {
  it("parses tab-separated keyword performance report rows", () => {
    const rows = parseSearchAdStatReport(
      [
        "Date\tCampaign ID\tAd Group ID\tKeyword ID\tKeyword\tImpression\tClick\tCost\tCTR\tCPC\tAverage Rank",
        "2026-05-19\tcmp-1\tgrp-1\tkw-1\t커피 스티커\t1,200\t36\t18,000\t3\t500\t1.8",
      ].join("\n"),
      "SHOPPINGKEYWORD_DETAIL",
    );

    expect(rows).toEqual([
      expect.objectContaining({
        reportType: "SHOPPINGKEYWORD_DETAIL",
        date: new Date("2026-05-19T00:00:00.000+09:00"),
        campaignId: "cmp-1",
        adgroupId: "grp-1",
        keywordId: "kw-1",
        keyword: "커피 스티커",
        impressions: 1200,
        clicks: 36,
        cost: 18000,
        ctr: 3,
        avgCpc: 500,
        avgRank: 1.8,
      }),
    ]);
  });

  it("maps report rows to stored keyword performance rows by keyword id", () => {
    const reportRows = parseSearchAdStatReport(
      [
        "Date,Ad Group ID,Keyword ID,Keyword,Impression,Click,Cost",
        "2026-05-19,grp-1,kw-1,커피 스티커,100,4,1200",
      ].join("\n"),
      "AD_DETAIL",
    );
    const keywordMetaById = new Map([
      [
        "kw-1",
        {
          campaignId: "cmp-current",
          adgroupId: "grp-current",
          keywordId: "kw-1",
          keyword: "커피 스티커",
        },
      ],
    ]);

    expect(
      toKeywordPerformanceRowsFromReport({
        accountId: "account-1",
        reportRows,
        keywordMetaById,
      }),
    ).toEqual([
      expect.objectContaining({
        accountId: "account-1",
        campaignId: "cmp-current",
        adgroupId: "grp-current",
        keywordId: "kw-1",
        keyword: "커피 스티커",
        date: new Date("2026-05-19T00:00:00.000+09:00"),
        impressions: 100,
        clicks: 4,
        cost: 1200,
      }),
    ]);
  });

  it("maps report rows by adgroup and keyword when keyword id is missing", () => {
    const reportRows = parseSearchAdStatReport(
      [
        "Date\tAd Group ID\tKeyword\tImpression\tClick\tCost",
        "2026-05-19\tgrp-1\t커피 스티커\t100\t4\t1200",
      ].join("\n"),
      "AD_DETAIL",
    );
    const keywordMetaById = new Map([
      [
        "kw-1",
        {
          campaignId: "cmp-current",
          adgroupId: "grp-1",
          keywordId: "kw-1",
          keyword: "커피 스티커",
        },
      ],
    ]);

    expect(
      toKeywordPerformanceRowsFromReport({
        accountId: "account-1",
        reportRows,
        keywordMetaById,
      }),
    ).toHaveLength(1);
  });
});
