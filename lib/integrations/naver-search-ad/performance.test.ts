import { describe, expect, it } from "vitest";
import {
  collectStatReportPerformanceRows,
  chunkIds,
  getDefaultReportStatDates,
  getDefaultPerformanceDateRange,
  selectLatestKeywordMeta,
} from "./performance";

describe("Naver Search Ad performance sync helpers", () => {
  it("builds the default recent 90 day range ending yesterday in Korea", () => {
    expect(
      getDefaultPerformanceDateRange(new Date("2026-05-20T04:00:00.000Z")),
    ).toEqual({
      since: "2026-02-19",
      until: "2026-05-19",
      performanceDate: new Date("2026-05-19T00:00:00.000+09:00"),
    });
  });

  it("selects the latest snapshot metadata once per keyword", () => {
    const metas = selectLatestKeywordMeta(
      [
        keywordSnapshot("kw-1", "old keyword", "2026-05-18T00:00:00.000Z"),
        keywordSnapshot("kw-2", "second keyword", "2026-05-18T01:00:00.000Z"),
        keywordSnapshot("kw-1", "new keyword", "2026-05-19T00:00:00.000Z"),
      ],
      10,
    );

    expect([...metas.entries()]).toEqual([
      [
        "kw-1",
        {
          campaignId: "cmp-kw-1",
          adgroupId: "grp-kw-1",
          keywordId: "kw-1",
          keyword: "new keyword",
        },
      ],
      [
        "kw-2",
        {
          campaignId: "cmp-kw-2",
          adgroupId: "grp-kw-2",
          keywordId: "kw-2",
          keyword: "second keyword",
        },
      ],
    ]);
  });

  it("chunks ids to keep stats requests bounded", () => {
    expect(chunkIds(["kw-1", "kw-2", "kw-3", "kw-4", "kw-5"], 2)).toEqual([
      ["kw-1", "kw-2"],
      ["kw-3", "kw-4"],
      ["kw-5"],
    ]);
  });

  it("builds bounded recent stat report dates ending yesterday in Korea", () => {
    expect(getDefaultReportStatDates(new Date("2026-05-20T04:00:00.000Z"), 3)).toEqual([
      "20260517",
      "20260518",
      "20260519",
    ]);
  });

  it("collects built stat reports and maps downloaded rows to keyword performance", async () => {
    const client = {
      createStatReportJob: async () => ({
        reportJobId: "456",
        reportType: "SHOPPINGKEYWORD_DETAIL" as const,
        statDate: "2026-05-19T00:00:00Z",
        status: "REGIST" as const,
        downloadUrl: null,
        raw: {},
      }),
      getStatReportJob: async () => ({
        reportJobId: "456",
        reportType: "SHOPPINGKEYWORD_DETAIL" as const,
        statDate: "2026-05-19T00:00:00Z",
        status: "BUILT" as const,
        downloadUrl: "https://api.searchad.naver.com/stat-reports/456/download",
        raw: {},
      }),
      downloadStatReport: async () =>
        [
          "Date\tAd Group ID\tKeyword ID\tKeyword\tImpression\tClick\tCost",
          "2026-05-19\tgrp-1\tkw-1\t커피 스티커\t100\t4\t1200",
        ].join("\n"),
    };
    const keywordMetaById = new Map([
      [
        "kw-1",
        {
          campaignId: "cmp-1",
          adgroupId: "grp-1",
          keywordId: "kw-1",
          keyword: "커피 스티커",
        },
      ],
    ]);

    const result = await collectStatReportPerformanceRows({
      accountId: "account-1",
      client,
      keywordMetaById,
      reportTypes: ["SHOPPINGKEYWORD_DETAIL"],
      statDates: ["20260519"],
      maxPollAttempts: 1,
      pollIntervalMs: 0,
    });

    expect(result.jobs).toEqual([
      expect.objectContaining({
        reportType: "SHOPPINGKEYWORD_DETAIL",
        statDate: "20260519",
        status: "BUILT",
      }),
    ]);
    expect(result.performanceRows).toEqual([
      expect.objectContaining({
        accountId: "account-1",
        keywordId: "kw-1",
        date: new Date("2026-05-19T00:00:00.000+09:00"),
        impressions: 100,
        clicks: 4,
        cost: 1200,
      }),
    ]);
  });
});

function keywordSnapshot(keywordId: string, keyword: string, createdAt: string) {
  return {
    campaignId: `cmp-${keywordId}`,
    adgroupId: `grp-${keywordId}`,
    keywordId,
    keyword,
    createdAt: new Date(createdAt),
  };
}
