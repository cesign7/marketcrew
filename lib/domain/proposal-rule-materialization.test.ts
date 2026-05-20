import { describe, expect, it } from "vitest";
import { buildKeywordRuleMaterialization } from "./proposal-rule-materialization";

describe("buildKeywordRuleMaterialization", () => {
  it("creates an active keyword rule from an approved rule-change proposal", () => {
    const result = buildKeywordRuleMaterialization(
      {
        actionType: "KEYWORD_RULE_CHANGE",
        riskLevel: "LOW",
        title: "'기업 초대장' 2~3위 유지 후보",
        reason: "전환 효율이 확인된 구간입니다.",
        beforeJson: {
          label: "2.4위 / ROAS 800%",
          keywordId: "kw-invite",
        },
        afterJson: {
          label: "2~3위 유지",
          ruleType: "TOP_2_TO_3_OPTIMIZE",
          targetPositionType: "TOP_2_TO_3",
        },
      },
      { brandKey: "COFFEEPRINT" },
    );

    expect(result).toEqual({
      materialized: true,
      rule: {
        brandKey: "COFFEEPRINT",
        confidence: 0.78,
        keyword: "기업 초대장",
        keywordId: "kw-invite",
        maxCpc: null,
        reason: "전환 효율이 확인된 구간입니다.",
        ruleType: "TOP_2_TO_3_OPTIMIZE",
        status: "ACTIVE",
        targetPositionType: "TOP_2_TO_3",
      },
    });
  });

  it("creates a negative keyword rule from a negative keyword proposal", () => {
    const result = buildKeywordRuleMaterialization(
      {
        actionType: "NEGATIVE_KEYWORD",
        riskLevel: "MEDIUM",
        title: "'무료 초대장 양식' 제외 키워드 후보",
        reason: "비용은 발생하지만 전환이 없습니다.",
        beforeJson: {
          label: "비용 35,000원 / 전환 0건",
          keywordId: "kw-free",
        },
        afterJson: {
          label: "제외 후보",
          ruleType: "NEGATIVE_CANDIDATE",
          targetPositionType: "EXCLUDE",
        },
      },
      { brandKey: "COFFEEPRINT" },
    );

    expect(result).toMatchObject({
      materialized: true,
      rule: {
        keyword: "무료 초대장 양식",
        keywordId: "kw-free",
        ruleType: "NEGATIVE_CANDIDATE",
        targetPositionType: "EXCLUDE",
        maxCpc: 0,
        status: "ACTIVE",
      },
    });
  });

  it("skips unsupported approval action types", () => {
    const result = buildKeywordRuleMaterialization(
      {
        actionType: "AD_COPY_CHANGE",
        riskLevel: "MEDIUM",
        title: "커피프린트 연하장 광고문안 A/B 테스트",
        reason: "문안 테스트입니다.",
        beforeJson: { label: "기존 문안" },
        afterJson: { label: "새 문안" },
      },
      { brandKey: "COFFEEPRINT" },
    );

    expect(result).toEqual({
      materialized: false,
      reason: "UNSUPPORTED_ACTION",
    });
  });

  it("requires brand context when the proposal does not identify a brand", () => {
    const result = buildKeywordRuleMaterialization({
      actionType: "KEYWORD_RULE_CHANGE",
      riskLevel: "LOW",
      title: "'기업 초대장' 2~3위 유지 후보",
      reason: "브랜드를 특정할 수 없습니다.",
      beforeJson: { label: "2.4위" },
      afterJson: {
        label: "2~3위 유지",
        ruleType: "TOP_2_TO_3_OPTIMIZE",
        targetPositionType: "TOP_2_TO_3",
      },
    });

    expect(result).toEqual({
      materialized: false,
      reason: "MISSING_BRAND",
    });
  });
});
