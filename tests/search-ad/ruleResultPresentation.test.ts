import { describe, expect, it } from "vitest";
import { SAMPLE_RULE_RESULTS } from "@/features/search-ad/domain/sampleData";
import {
  getRuleResultActionCandidate,
  getRuleResultActionPlan,
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
        measurementStatusLabel: "전환 기준 확인 필요",
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
      { label: "전환 기준", value: "전환 기준 확인 필요" },
    ]);
  });

  it("전환 점검 후보는 추적 설정 확인을 먼저 안내한다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[0],
      category: "needs_review" as const,
      evidencePacket: {
        actionIntent: "conversion_check",
        actionIntentLabel: "전환 점검 후보",
        actionIntentDescription: "전환 코드와 매출 전달을 확인합니다.",
      },
    };

    expect(getRuleResultActionCandidate(result)).toEqual({
      label: "전환 점검 후보",
      description: "전환 코드와 매출 전달을 확인합니다.",
    });
    expect(getRuleResultRecommendedAction(result)).toContain("전환 코드");
  });

  it("제외어 후보는 대표 승인과 반복 위임 조건을 분리해 보여준다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[0],
      targetLabel: "소량 종이컵 제작",
      evidencePacket: {
        actionIntent: "negative_keyword",
      },
    };

    expect(getRuleResultActionPlan(result)).toMatchObject({
      title: "제외어 등록 후보",
      approvalLabel: "첫 실행은 대표 승인",
      delegationLabel: "반복 패턴은 모아 위임 후보",
    });
    expect(getRuleResultActionPlan(result).steps).toContain("방어 키워드, 브랜드 키워드, 시즌 준비 키워드인지 먼저 확인합니다.");
  });

  it("키워드 추가 후보는 실제 광고비 증가 가능성을 승인 조건으로 보여준다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[1],
      targetLabel: "답례 스티커",
      evidencePacket: {
        actionIntent: "keyword_expand",
      },
    };

    const plan = getRuleResultActionPlan(result);

    expect(plan.title).toBe("키워드 추가 후보");
    expect(plan.delegationLabel).toBe("대표 승인 유지");
    expect(plan.guardrail).toContain("실제 광고비가 늘 수");
  });
});
