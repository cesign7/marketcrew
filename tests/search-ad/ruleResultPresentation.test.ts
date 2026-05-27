import { describe, expect, it } from "vitest";
import { SAMPLE_RULE_RESULTS } from "@/features/search-ad/domain/sampleData";
import { getRuleResultDiagnosis, getRuleResultMetricBadges, getRuleResultRecommendedAction } from "@/features/search-ad/domain/ruleResultPresentation";

describe("rule result presentation", () => {
  it("저효율 규칙 결과를 카드에서 읽기 쉬운 진단과 조치로 바꾼다", () => {
    const result = SAMPLE_RULE_RESULTS[0];

    expect(getRuleResultDiagnosis(result)).toContain("전환이 없습니다");
    expect(getRuleResultRecommendedAction(result)).toContain("입찰 하향");
    expect(getRuleResultMetricBadges(result).map((item) => item.label)).toEqual(["비용", "클릭", "전환"]);
  });

  it("우수 규칙 결과에는 매출과 ROAS 배지를 함께 보여준다", () => {
    const result = SAMPLE_RULE_RESULTS[1];

    expect(getRuleResultDiagnosis(result)).toContain("확장 후보");
    expect(getRuleResultRecommendedAction(result)).toContain("예산 확대");
    expect(getRuleResultMetricBadges(result).map((item) => item.label)).toContain("ROAS");
  });
});
