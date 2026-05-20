import { describe, expect, it } from "vitest";
import {
  toAdgroupSnapshotRows,
  toCampaignSnapshotRows,
  toKeywordPerformanceRows,
  toKeywordSnapshotRows,
  toSyncCounts,
} from "./snapshots";

describe("Naver Search Ad snapshot preparation", () => {
  it("builds campaign snapshot rows for persisted sync", () => {
    const collectedAt = new Date("2026-05-20T00:00:00.000Z");

    const rows = toCampaignSnapshotRows({
      accountId: "account-1",
      collectedAt,
      campaigns: [
        {
          id: "cmp-1",
          name: "Coffeeprint search campaign",
          raw: { nccCampaignId: "cmp-1", name: "Coffeeprint search campaign" },
        },
      ],
    });

    expect(rows).toEqual([
      {
        accountId: "account-1",
        campaignId: "cmp-1",
        campaignName: "Coffeeprint search campaign",
        brandKey: "COFFEEPRINT",
        collectedAt,
        rawJson: { nccCampaignId: "cmp-1", name: "Coffeeprint search campaign" },
      },
    ]);
  });

  it("builds adgroup snapshot rows for persisted sync", () => {
    const collectedAt = new Date("2026-05-20T00:00:00.000Z");

    const rows = toAdgroupSnapshotRows({
      accountId: "account-1",
      collectedAt,
      adgroups: [
        {
          id: "grp-1",
          campaignId: "cmp-1",
          name: "Stickersee adgroup",
          raw: { nccAdgroupId: "grp-1", nccCampaignId: "cmp-1" },
        },
      ],
    });

    expect(rows).toEqual([
      {
        accountId: "account-1",
        campaignId: "cmp-1",
        adgroupId: "grp-1",
        adgroupName: "Stickersee adgroup",
        brandKey: "STICKERSEE",
        collectedAt,
        rawJson: { nccAdgroupId: "grp-1", nccCampaignId: "cmp-1" },
      },
    ]);
  });

  it("builds dry-run keyword snapshot rows with zero performance metrics", () => {
    const collectedDate = new Date("2026-05-20T00:00:00.000Z");

    const rows = toKeywordSnapshotRows({
      accountId: "account-1",
      collectedDate,
      keywords: [
        {
          id: "kw-1",
          adgroupId: "grp-1",
          campaignId: "cmp-1",
          keyword: "company invitation",
          bidAmount: 720,
          raw: { nccKeywordId: "kw-1" },
        },
      ],
    });

    expect(rows).toEqual([
      {
        accountId: "account-1",
        campaignId: "cmp-1",
        adgroupId: "grp-1",
        keywordId: "kw-1",
        keyword: "company invitation",
        bidAmount: 720,
        impressions: 0,
        clicks: 0,
        cost: 0,
        collectedDate,
        rawJson: { nccKeywordId: "kw-1" },
      },
    ]);
  });

  it("builds keyword performance rows from stat metrics and local keyword metadata", () => {
    const performanceDate = new Date("2026-05-19T00:00:00.000Z");

    const rows = toKeywordPerformanceRows({
      accountId: "account-1",
      performanceDate,
      stats: [
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
          raw: { id: "kw-1" },
        },
      ],
      keywordMetaById: new Map([
        [
          "kw-1",
          {
            campaignId: "cmp-1",
            adgroupId: "grp-1",
            keywordId: "kw-1",
            keyword: "company invitation",
          },
        ],
      ]),
    });

    expect(rows).toEqual([
      {
        accountId: "account-1",
        campaignId: "cmp-1",
        adgroupId: "grp-1",
        keywordId: "kw-1",
        keyword: "company invitation",
        date: performanceDate,
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
        rawJson: { id: "kw-1" },
      },
    ]);
  });

  it("skips keyword performance rows when local keyword metadata is missing", () => {
    const performanceDate = new Date("2026-05-19T00:00:00.000Z");

    expect(
      toKeywordPerformanceRows({
        accountId: "account-1",
        performanceDate,
        stats: [
          {
            id: "unknown-kw",
            impressions: 1,
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
            raw: { id: "unknown-kw" },
          },
        ],
        keywordMetaById: new Map(),
      }),
    ).toEqual([]);
  });

  it("summarizes synced entity counts", () => {
    expect(
      toSyncCounts({
        campaigns: [1, 2],
        adgroups: [1],
        keywords: [1, 2, 3],
        snapshots: [1, 2, 3],
      }),
    ).toEqual({
      campaignsCount: 2,
      adgroupsCount: 1,
      keywordsCount: 3,
      snapshotsCount: 3,
    });
  });
});
