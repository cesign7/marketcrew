import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  updateSearchAdAdgroupUserLock: vi.fn(),
}));

vi.mock("@/lib/persistence/postgres", () => ({
  hasDatabaseUrl: () => true,
  query: mocks.query,
}));

vi.mock("@/lib/integrations/search-ad/management", () => ({
  updateSearchAdAdgroupUserLock: mocks.updateSearchAdAdgroupUserLock,
}));

describe("search ad action apply", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SEARCH_AD_WRITE_ENABLED", "1");
    vi.stubEnv("NAVER_SEARCH_AD_WRITE_ENABLED", "");
    mocks.query.mockReset();
    mocks.updateSearchAdAdgroupUserLock.mockReset();
  });

  it("write gate가 열리면 광고그룹 userLock을 실제 provider에 반영하고 로그를 applied로 남긴다", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM search_ad_action_previews") && sql.includes("WHERE id = $1")) {
        return {
          rows: [
            {
              id: "preview-adgroup-grp-a001-turn-off",
              target_type: "adgroup",
              target_id: "grp-a001",
              requested_action: "turn_off",
              before_state: { userLock: false, status: "ELIGIBLE", statusReason: "VALID" },
              after_state: { userLock: true },
              impact_summary: { expectedEffect: "광고 노출을 중지합니다.", affectedChildren: 3, recentCost: 10000, recentClicks: 20, recentConversions: 0 },
              write_gate_open: true,
              created_at: "2026-05-26T08:00:00+09:00",
            },
          ],
        };
      }

      if (sql.includes("FROM search_ad_adgroup_snapshots") && sql.includes("DISTINCT ON")) {
        return {
          rows: [
            {
              id: "adgroup-grp-a001",
              provider_adgroup_id: "grp-a001",
              provider_campaign_id: "cmp-a001",
              brand_key: "stickersee",
              ad_product_type: "powerlink",
              name: "M_감사/생일/답례 스티커",
              user_lock: false,
              status: "ELIGIBLE",
              status_reason: "VALID",
              bid_amount: "770",
              daily_budget: "30000",
              collected_at: "2026-05-26T08:00:00+09:00",
            },
          ],
        };
      }

      return { rows: [] };
    });
    mocks.updateSearchAdAdgroupUserLock.mockResolvedValue({
      nccAdgroupId: "grp-a001",
      nccCampaignId: "cmp-a001",
      name: "M_감사/생일/답례 스티커",
      userLock: true,
      status: "ELIGIBLE",
      statusReason: "VALID",
      bidAmt: 770,
      dailyBudget: 30000,
    });

    const { applySearchAdActionPreview } = await import("@/lib/persistence/searchAdRepository");
    const log = await applySearchAdActionPreview("preview-adgroup-grp-a001-turn-off");

    expect(mocks.updateSearchAdAdgroupUserLock).toHaveBeenCalledWith("grp-a001", true);
    expect(log.status).toBe("applied");
    expect(log.reason).toContain("껐습니다");
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO search_ad_action_logs"), expect.arrayContaining([expect.any(String), log.previewId, "applied"]));
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO search_ad_adgroup_snapshots"), expect.arrayContaining([expect.any(String), "grp-a001", "cmp-a001", "stickersee", "powerlink"]));
  });
});
