import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/persistence/postgres", () => ({
  hasDatabaseUrl: () => true,
  query: mocks.query,
}));

describe("search ad action logs view", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.query.mockReset();
  });

  it("실행 미리보기와 이력의 provider ID를 최신 광고그룹명으로 보완한다", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM search_ad_action_previews") && !sql.includes("WHERE id = $1")) {
        return {
          rows: [
            {
              id: "preview-adgroup-grp-a001-turn-off",
              target_type: "adgroup",
              target_id: "grp-a001-02-000000020742623",
              target_name: "M_감사/생일/답례 스티커",
              requested_action: "turn_off",
              before_state: { userLock: false, status: "ELIGIBLE", statusReason: "VALID" },
              after_state: { userLock: true },
              impact_summary: { expectedEffect: "선택한 운영 단위의 광고 노출을 중지합니다.", affectedChildren: 0, recentCost: 0, recentClicks: 0, recentConversions: 0 },
              write_gate_open: true,
              created_at: "2026-05-26T08:00:00+09:00",
            },
          ],
        };
      }

      if (sql.includes("FROM search_ad_action_logs")) {
        return {
          rows: [
            {
              id: "log-preview-adgroup-grp-a001-turn-off",
              preview_id: "preview-adgroup-grp-a001-turn-off",
              status: "applied",
              error_message: null,
              created_at: "2026-05-26T08:01:00+09:00",
              target_id: "grp-a001-02-000000020742623",
              target_name: "M_감사/생일/답례 스티커",
              requested_action: "turn_off",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const { getSearchAdActionLogsView } = await import("@/lib/persistence/searchAdRepository");

    const view = await getSearchAdActionLogsView();

    expect(view.previews[0]?.targetLabel).toBe("M_감사/생일/답례 스티커");
    expect(view.logs[0]?.targetLabel).toBe("M_감사/생일/답례 스티커");
  });
});
