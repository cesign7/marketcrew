import { describe, expect, it, vi } from "vitest";
import { syncSearchAdState } from "@/server/search-ad/stateSync";

const mocks = vi.hoisted(() => ({
  getSearchAdCredentials: vi.fn(),
  hasDatabaseUrl: vi.fn(),
  listSearchAdCampaigns: vi.fn(),
  listSearchAdAdgroups: vi.fn(),
  listSearchAdKeywords: vi.fn(),
  listSearchAdAds: vi.fn(),
  saveSearchAdStateSnapshots: vi.fn(),
}));

vi.mock("@/lib/integrations/search-ad/client", () => ({
  getSearchAdCredentials: mocks.getSearchAdCredentials,
}));

vi.mock("@/lib/integrations/search-ad/management", () => ({
  listSearchAdCampaigns: mocks.listSearchAdCampaigns,
  listSearchAdAdgroups: mocks.listSearchAdAdgroups,
  listSearchAdKeywords: mocks.listSearchAdKeywords,
  listSearchAdAds: mocks.listSearchAdAds,
}));

vi.mock("@/lib/persistence/postgres", () => ({
  hasDatabaseUrl: mocks.hasDatabaseUrl,
}));

vi.mock("@/lib/persistence/searchAdRepository", () => ({
  saveSearchAdStateSnapshots: mocks.saveSearchAdStateSnapshots,
}));

describe("syncSearchAdState", () => {
  it("네이버 키워드는 광고그룹별 조건으로 수집한다", async () => {
    mocks.getSearchAdCredentials.mockReturnValue({ apiKey: "key", secretKey: "secret", customerId: "customer" });
    mocks.hasDatabaseUrl.mockReturnValue(true);
    mocks.listSearchAdCampaigns.mockResolvedValue([
      { nccCampaignId: "cmp-1", name: "스티커씨_파워링크", campaignTp: "WEB_SITE" },
    ]);
    mocks.listSearchAdAdgroups.mockResolvedValue([
      { nccAdgroupId: "grp-1", nccCampaignId: "cmp-1", name: "스티커씨_감사스티커" },
      { nccAdgroupId: "grp-2", nccCampaignId: "cmp-1", name: "스티커씨_생일스티커" },
    ]);
    mocks.listSearchAdKeywords.mockImplementation(async (adgroupId: string) => [
      { nccKeywordId: `kw-${adgroupId}`, nccAdgroupId: adgroupId, keyword: "감사스티커" },
    ]);
    mocks.listSearchAdAds.mockImplementation(async (adgroupId: string) => [
      {
        nccAdId: `nad-${adgroupId}`,
        nccAdgroupId: adgroupId,
        ad: { headline: "감사 스티커", pc: { final: "https://stickersee.example/pc" }, mobile: { final: "https://stickersee.example/m" } },
      },
    ]);
    mocks.saveSearchAdStateSnapshots.mockResolvedValue({ collectedAt: "2026-05-26T04:10:00.000Z", saved: 7 });

    const result = await syncSearchAdState();

    expect(result.ok).toBe(true);
    expect(mocks.listSearchAdKeywords).toHaveBeenCalledWith("grp-1");
    expect(mocks.listSearchAdKeywords).toHaveBeenCalledWith("grp-2");
    expect(mocks.listSearchAdKeywords).not.toHaveBeenCalledWith();
    expect(mocks.listSearchAdAds).toHaveBeenCalledWith("grp-1");
    expect(mocks.listSearchAdAds).toHaveBeenCalledWith("grp-2");
    expect(mocks.saveSearchAdStateSnapshots).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ targetType: "keyword", providerId: "kw-grp-1", parentProviderId: "grp-1" }),
        expect.objectContaining({ targetType: "keyword", providerId: "kw-grp-2", parentProviderId: "grp-2" }),
        expect.objectContaining({
          targetType: "ad",
          providerId: "nad-grp-1",
          parentProviderId: "grp-1",
          name: "감사 스티커",
          pcFinalUrl: "https://stickersee.example/pc",
          mobileFinalUrl: "https://stickersee.example/m",
        }),
      ]),
    );
  });
});
