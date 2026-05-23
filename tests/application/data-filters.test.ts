import { describe, expect, it } from "vitest";
import { filterProviderEvidenceExpansionPlans } from "../../src/features/agenda-room/data-filters";
import { buildProviderEvidenceExpansionPlans } from "../../src/features/agenda-room/provider-evidence-expansion-plans";

describe("data filters", () => {
  it("광고와 데이터랩 근거는 별도 채널이 아니라 공통 마케팅 근거로 유지한다", () => {
    const plans = buildProviderEvidenceExpansionPlans();

    expect(filterProviderEvidenceExpansionPlans(plans, "coffeeprint").map((plan) => plan.title)).toEqual([
      "광고그룹 실제 설정",
      "기기·시간대·요일 성과",
      "데이터랩 세그먼트",
    ]);

    expect(filterProviderEvidenceExpansionPlans(plans, "stickersee").map((plan) => plan.title)).toEqual([
      "광고그룹 실제 설정",
      "기기·시간대·요일 성과",
      "스마트스토어 순매출과 클레임",
      "데이터랩 세그먼트",
      "스마트스토어 데이터솔루션",
    ]);
  });
});
