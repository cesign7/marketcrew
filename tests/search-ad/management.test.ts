import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchAdFetch: vi.fn(),
}));

vi.mock("@/lib/integrations/search-ad/client", () => ({
  searchAdFetch: mocks.searchAdFetch,
}));

describe("search ad management API", () => {
  beforeEach(() => {
    mocks.searchAdFetch.mockReset();
  });

  it("광고그룹 켜기/끄기는 현재 광고그룹을 읽은 뒤 userLock만 갱신 요청한다", async () => {
    const { updateSearchAdAdgroupUserLock } = await import("@/lib/integrations/search-ad/management");
    mocks.searchAdFetch
      .mockResolvedValueOnce([
        {
          nccAdgroupId: "grp-a001",
          nccCampaignId: "cmp-a001",
          name: "M_감사/생일/답례 스티커",
          userLock: false,
          bidAmt: 770,
        },
      ])
      .mockResolvedValueOnce({
        nccAdgroupId: "grp-a001",
        nccCampaignId: "cmp-a001",
        name: "M_감사/생일/답례 스티커",
        userLock: true,
        bidAmt: 770,
      });

    const updated = await updateSearchAdAdgroupUserLock("grp-a001", true);

    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(1, "/ncc/adgroups?ids=grp-a001");
    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(2, "/ncc/adgroups/grp-a001?fields=userLock", {
      method: "PUT",
      body: JSON.stringify({
        nccAdgroupId: "grp-a001",
        nccCampaignId: "cmp-a001",
        name: "M_감사/생일/답례 스티커",
        userLock: true,
        bidAmt: 770,
      }),
    });
    expect(updated.userLock).toBe(true);
  });

  it("캠페인 켜기/끄기도 현재 캠페인을 읽은 뒤 userLock만 갱신 요청한다", async () => {
    const { updateSearchAdCampaignUserLock } = await import("@/lib/integrations/search-ad/management");
    mocks.searchAdFetch
      .mockResolvedValueOnce([
        {
          nccCampaignId: "cmp-a001",
          name: "스티커씨_파워링크",
          campaignTp: "WEB_SITE",
          userLock: false,
        },
      ])
      .mockResolvedValueOnce({
        nccCampaignId: "cmp-a001",
        name: "스티커씨_파워링크",
        campaignTp: "WEB_SITE",
        userLock: true,
      });

    const updated = await updateSearchAdCampaignUserLock("cmp-a001", true);

    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(1, "/ncc/campaigns?ids=cmp-a001");
    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(2, "/ncc/campaigns/cmp-a001?fields=userLock", {
      method: "PUT",
      body: JSON.stringify({
        nccCampaignId: "cmp-a001",
        name: "스티커씨_파워링크",
        campaignTp: "WEB_SITE",
        userLock: true,
      }),
    });
    expect(updated.userLock).toBe(true);
  });

  it("키워드 켜기/끄기도 현재 키워드를 읽은 뒤 userLock만 갱신 요청한다", async () => {
    const { updateSearchAdKeywordUserLock } = await import("@/lib/integrations/search-ad/management");
    mocks.searchAdFetch
      .mockResolvedValueOnce({
        nccKeywordId: "nkw-a001",
        nccAdgroupId: "grp-a001",
        keyword: "감사스티커",
        userLock: false,
        bidAmt: 220,
      })
      .mockResolvedValueOnce({
        nccKeywordId: "nkw-a001",
        nccAdgroupId: "grp-a001",
        keyword: "감사스티커",
        userLock: true,
        bidAmt: 220,
      });

    const updated = await updateSearchAdKeywordUserLock("nkw-a001", true);

    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(1, "/ncc/keywords/nkw-a001");
    expect(mocks.searchAdFetch).toHaveBeenNthCalledWith(2, "/ncc/keywords/nkw-a001?fields=userLock", {
      method: "PUT",
      body: JSON.stringify({
        nccKeywordId: "nkw-a001",
        nccAdgroupId: "grp-a001",
        keyword: "감사스티커",
        userLock: true,
        bidAmt: 220,
      }),
    });
    expect(updated.userLock).toBe(true);
  });

  it("광고그룹 타게팅 설정은 ownerId와 types 조건으로 조회한다", async () => {
    const { listSearchAdTargets } = await import("@/lib/integrations/search-ad/management");
    mocks.searchAdFetch.mockResolvedValueOnce([
      {
        nccTargetId: "tgt-a001",
        ownerId: "grp-a001",
        targetTp: "TIME_WEEKLY_TARGET",
        target: { monday: [{ startHour: 9, endHour: 18 }] },
      },
    ]);

    const targets = await listSearchAdTargets("grp-a001", ["TIME_WEEKLY_TARGET", "PC_MOBILE_TARGET"]);

    expect(mocks.searchAdFetch).toHaveBeenCalledWith("/ncc/targets?ownerId=grp-a001&types=TIME_WEEKLY_TARGET&types=PC_MOBILE_TARGET");
    expect(targets[0]?.targetTp).toBe("TIME_WEEKLY_TARGET");
  });

  it("여러 광고그룹 타게팅 설정은 ownerIds 조건으로 한 번에 조회한다", async () => {
    const { listSearchAdTargetsByOwnerIds } = await import("@/lib/integrations/search-ad/management");
    mocks.searchAdFetch.mockResolvedValueOnce([
      {
        nccTargetId: "tgt-a001",
        ownerId: "grp-a001",
        targetTp: "PC_MOBILE_TARGET",
        target: { pc: true, mobile: true },
      },
    ]);

    const targets = await listSearchAdTargetsByOwnerIds(["grp-a001", "grp-a002", "grp-a001"]);

    expect(mocks.searchAdFetch).toHaveBeenCalledWith("/ncc/targets?ownerIds=grp-a001%2Cgrp-a002");
    expect(targets[0]?.ownerId).toBe("grp-a001");
  });
});
