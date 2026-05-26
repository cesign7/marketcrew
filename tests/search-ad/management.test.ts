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
});
