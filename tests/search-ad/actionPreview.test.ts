import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/persistence/postgres", () => ({
  hasDatabaseUrl: () => true,
  query: mocks.query,
}));

describe("search ad action preview", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.query.mockReset();
  });

  it("키워드 미리보기는 목록 상한 대신 대상 ID로 최신 스냅샷을 직접 찾는다", async () => {
    mocks.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM search_ad_keyword_snapshots") && sql.includes("provider_keyword_id = $1")) {
        expect(values).toEqual(["nkw-late-candidate"]);
        return {
          rows: [
            {
              id: "keyword-nkw-late-candidate",
              provider_keyword_id: "nkw-late-candidate",
              provider_adgroup_id: "grp-a001",
              brand_key: "coffeeprint",
              ad_product_type: "powerlink",
              keyword_text: "중복후보키워드",
              user_lock: false,
              status: "ELIGIBLE",
              status_reason: "VALID",
              bid_amount: "220",
              collected_at: "2026-05-26T08:00:00+09:00",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const { createSearchAdActionPreview } = await import("@/lib/persistence/searchAdRepository");
    const preview = await createSearchAdActionPreview({
      targetType: "keyword",
      targetId: "nkw-late-candidate",
      requestedAction: "turn_off",
    });

    expect(preview?.targetLabel).toBe("중복후보키워드");
    expect(preview?.targetType).toBe("keyword");
    expect(preview?.afterState.userLock).toBe(true);
  });
});
