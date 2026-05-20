import { describe, expect, it } from "vitest";
import {
  normalizeAdgroups,
  normalizeCampaigns,
  normalizeKeywords,
  normalizeStats,
} from "./normalize";

describe("Naver Search Ad normalization", () => {
  it("keeps only usable campaign fields for snapshot storage", () => {
    const campaigns = normalizeCampaigns([
      {
        nccCampaignId: "cmp-1",
        name: "Coffeeprint search campaign",
        campaignTp: "WEB_SITE",
      },
    ]);

    expect(campaigns).toEqual([
      {
        id: "cmp-1",
        name: "Coffeeprint search campaign",
        raw: {
          nccCampaignId: "cmp-1",
          name: "Coffeeprint search campaign",
          campaignTp: "WEB_SITE",
        },
      },
    ]);
  });

  it("keeps adgroup campaign relationships", () => {
    const adgroups = normalizeAdgroups([
      {
        nccAdgroupId: "grp-1",
        nccCampaignId: "cmp-1",
        name: "Invitation adgroup",
      },
    ]);

    expect(adgroups[0]).toMatchObject({
      id: "grp-1",
      campaignId: "cmp-1",
      name: "Invitation adgroup",
    });
  });

  it("turns keyword API rows into dry-run keyword snapshots", () => {
    const keywords = normalizeKeywords(
      [
        {
          nccKeywordId: "kw-1",
          nccAdgroupId: "grp-1",
          nccCampaignId: "cmp-1",
          keyword: "company invitation",
          bidAmt: 720,
        },
      ],
      new Map([["grp-1", "cmp-1"]]),
    );

    expect(keywords).toEqual([
      {
        id: "kw-1",
        adgroupId: "grp-1",
        campaignId: "cmp-1",
        keyword: "company invitation",
        bidAmount: 720,
        raw: {
          nccKeywordId: "kw-1",
          nccAdgroupId: "grp-1",
          nccCampaignId: "cmp-1",
          keyword: "company invitation",
          bidAmt: 720,
        },
      },
    ]);
  });

  it("rejects keyword rows without required IDs", () => {
    expect(() => normalizeKeywords([{ keyword: "missing" }], new Map())).toThrow(
      "nccKeywordId",
    );
  });

  it("normalizes stat summary rows into keyword performance metrics", () => {
    const stats = normalizeStats([
      {
        id: "kw-1",
        impCnt: "120",
        clkCnt: 12,
        salesAmt: "3450",
        ctr: "10",
        cpc: "287.5",
        avgRnk: "1.8",
        ccnt: "2",
        crto: "16.67",
        convAmt: "9000",
        ror: "260.87",
        cpConv: "1725",
      },
    ]);

    expect(stats).toEqual([
      {
        id: "kw-1",
        impressions: 120,
        clicks: 12,
        cost: 3450,
        ctr: 10,
        avgCpc: 287.5,
        avgRank: 1.8,
        conversions: 2,
        conversionRate: 16.67,
        conversionSales: 9000,
        roas: 260.87,
        costPerConversion: 1725,
        raw: {
          id: "kw-1",
          impCnt: "120",
          clkCnt: 12,
          salesAmt: "3450",
          ctr: "10",
          cpc: "287.5",
          avgRnk: "1.8",
          ccnt: "2",
          crto: "16.67",
          convAmt: "9000",
          ror: "260.87",
          cpConv: "1725",
        },
      },
    ]);
  });

  it("defaults missing stat counts to zero and ratios to null", () => {
    expect(normalizeStats([{ id: "kw-1" }])).toEqual([
      {
        id: "kw-1",
        impressions: 0,
        clicks: 0,
        cost: 0,
        ctr: null,
        avgCpc: null,
        avgRank: null,
        conversions: null,
        conversionRate: null,
        conversionSales: null,
        roas: null,
        costPerConversion: null,
        raw: { id: "kw-1" },
      },
    ]);
  });
});
