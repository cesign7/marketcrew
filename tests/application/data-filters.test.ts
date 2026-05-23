import { describe, expect, it } from "vitest";
import { filterProviderEvidenceExpansionPlans } from "../../src/features/agenda-room/data-filters";
import { buildProviderEvidenceExpansionPlans } from "../../src/features/agenda-room/provider-evidence-expansion-plans";

describe("data filters", () => {
  it("광고와 데이터랩 근거는 브랜드별 해석 근거로 유지하고 판매채널 준비 항목은 브랜드 안에 둔다", () => {
    const plans = buildProviderEvidenceExpansionPlans();

    expect(filterProviderEvidenceExpansionPlans(plans, "coffeeprint").map((plan) => plan.title)).toEqual([
      "광고그룹 실제 설정",
      "기기·시간대·요일 성과",
      "데이터랩 세그먼트",
      "커피프린트 스마트스토어 추가 준비",
    ]);

    expect(filterProviderEvidenceExpansionPlans(plans, "stickersee").map((plan) => plan.title)).toEqual([
      "광고그룹 실제 설정",
      "기기·시간대·요일 성과",
      "스마트스토어 순매출과 클레임",
      "데이터랩 세그먼트",
      "스티커씨 스마트스토어 데이터솔루션",
    ]);
  });
});
