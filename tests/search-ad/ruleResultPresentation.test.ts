import { describe, expect, it } from "vitest";
import { SAMPLE_RULE_RESULTS } from "@/features/search-ad/domain/sampleData";
import {
  getRuleResultActionCandidate,
  getRuleResultContextBadges,
  getRuleResultDiagnosis,
  getRuleResultMetricBadges,
  getRuleResultRecommendedAction,
} from "@/features/search-ad/domain/ruleResultPresentation";

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

  it("근거 패킷의 조치 후보와 기기/시즌 단서를 화면용으로 꺼낸다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[0],
      evidencePacket: {
        ...SAMPLE_RULE_RESULTS[0].evidencePacket,
        actionIntentLabel: "제외어 후보",
        actionIntentDescription: "유지할 방어 검색어가 아니면 제외어 후보로 봅니다.",
        deviceLabel: "모바일",
        seasonHint: "스승의날",
      },
    };

    expect(getRuleResultActionCandidate(result)).toEqual({
      label: "제외어 후보",
      description: "유지할 방어 검색어가 아니면 제외어 후보로 봅니다.",
    });
    expect(getRuleResultContextBadges(result)).toEqual([
      { label: "기기", value: "모바일" },
      { label: "시즌/행사", value: "스승의날" },
    ]);
  });
});
