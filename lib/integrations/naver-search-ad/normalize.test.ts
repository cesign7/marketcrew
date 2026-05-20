import { describe, expect, it } from "vitest";
import {
  normalizeAdgroups,
  normalizeCampaigns,
  normalizeKeywords,
} from "./normalize";

describe("Naver Search Ad normalization", () => {
  it("keeps only usable campaign fields for snapshot storage", () => {
    const campaigns = normalizeCampaigns([
      {
        nccCampaignId: "cmp-1",
        name: "커피프린트 검색광고",
        campaignTp: "WEB_SITE",
      },
    ]);

    expect(campaigns).toEqual([
      {
        id: "cmp-1",
        name: "커피프린트 검색광고",
        raw: {
          nccCampaignId: "cmp-1",
          name: "커피프린트 검색광고",
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
        name: "초대장 그룹",
      },
    ]);

    expect(adgroups[0]).toMatchObject({
      id: "grp-1",
      campaignId: "cmp-1",
      name: "초대장 그룹",
    });
  });

  it("turns keyword API rows into dry-run keyword snapshots", () => {
    const keywords = normalizeKeywords(
      [
        {
          nccKeywordId: "kw-1",
          nccAdgroupId: "grp-1",
          nccCampaignId: "cmp-1",
          keyword: "기업 초대장",
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
        keyword: "기업 초대장",
        bidAmount: 720,
        raw: {
          nccKeywordId: "kw-1",
          nccAdgroupId: "grp-1",
          nccCampaignId: "cmp-1",
          keyword: "기업 초대장",
          bidAmt: 720,
        },
      },
    ]);
  });

  it("rejects keyword rows without required IDs", () => {
    expect(() => normalizeKeywords([{ keyword: "누락" }], new Map())).toThrow(
      "nccKeywordId",
    );
  });
});
