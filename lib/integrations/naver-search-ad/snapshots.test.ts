import { describe, expect, it } from "vitest";
import { toKeywordSnapshotRows, toSyncCounts } from "./snapshots";

describe("Naver Search Ad snapshot preparation", () => {
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
          keyword: "기업 초대장",
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
        keyword: "기업 초대장",
        bidAmount: 720,
        impressions: 0,
        clicks: 0,
        cost: 0,
        collectedDate,
        rawJson: { nccKeywordId: "kw-1" },
      },
    ]);
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
