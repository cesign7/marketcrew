import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/persistence/postgres", () => ({
  hasDatabaseUrl: () => true,
  query: mocks.query,
}));

describe("search ad rule result detail view", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.query.mockReset();
  });

  it("규칙 결과와 연결 행, 실행 대상 광고그룹을 상세 화면용으로 묶는다", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM search_ad_rule_results") && sql.includes("WHERE id = $1")) {
        return {
          rows: [
            {
              id: "rule-low-stickersee",
              brand_key: "stickersee",
              ad_product_type: "powerlink",
              category: "low_efficiency",
              target_type: "search_term",
              target_id: "스티커소량제작",
              target_label: "스티커소량제작",
              severity: "medium",
              period_days: 30,
              reason: "클릭과 비용은 있으나 전환이 없습니다.",
              metrics: { clicks: 28, cost: 23400, conversions: 0, salesAmount: 0 },
              evidence_packet: {
                adgroupId: "grp-a001-02-000000020742623",
                adgroupName: "M_감사/생일/답례 스티커",
                campaignId: "cmp-a001",
                campaignName: "스티커씨_파워링크",
                reportId: "report-177442248",
                sourceRowIds: ["normalized-row-1"],
              },
              created_at: "2026-05-26T08:00:00+09:00",
            },
          ],
        };
      }

      if (sql.includes("FROM search_ad_report_normalized_rows")) {
        return {
          rows: [
            {
              id: "normalized-row-1",
              report_row_id: "raw-row-1",
              report_type: "EXPKEYWORD",
              brand_key: "stickersee",
              ad_product_type: "powerlink",
              campaign_id: "cmp-a001",
              campaign_name: "스티커씨_파워링크",
              adgroup_id: "grp-a001-02-000000020742623",
              adgroup_name: "M_감사/생일/답례 스티커",
              keyword_id: "nkw-a001",
              keyword_text: "스티커소량제작",
              search_term: "스티커소량제작",
              ad_id: null,
              criterion_id: null,
              extension_id: null,
              media_id: null,
              device: null,
              impressions: "1300",
              clicks: "28",
              cost: "23400",
              conversions: "0",
              sales_amount: "0",
              source_date: "2026-05-25",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const { getSearchAdRuleResultDetailView } = await import("@/lib/persistence/searchAdRepository");

    const detail = await getSearchAdRuleResultDetailView("rule-low-stickersee");

    expect(detail?.result.targetLabel).toBe("스티커소량제작");
    expect(detail?.actionTarget).toEqual({
      targetType: "adgroup",
      targetId: "grp-a001-02-000000020742623",
      targetLabel: "M_감사/생일/답례 스티커",
    });
    expect(detail?.relatedRows).toHaveLength(1);
    expect(detail?.relatedRows[0]?.adgroupName).toBe("M_감사/생일/답례 스티커");
  });
});
