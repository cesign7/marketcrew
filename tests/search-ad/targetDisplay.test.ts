import { describe, expect, it } from "vitest";
import { getRuleResultDisplayTargetLabel, getRuleResultDisplayTargetTypeLabel, getRuleResultRawTargetId } from "@/features/search-ad/domain/targetDisplay";
import type { SearchAdRuleResult } from "@/features/search-ad/domain/types";

describe("rule result target display", () => {
  it("기존 저장 결과의 광고 소재 ID를 카드 제목에서 숨긴다", () => {
    const result = ruleResult({
      targetLabel: "nad-a001-02-000000203421541",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "M_감사/생일/답례 스티커",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("광고 소재");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("M_감사/생일/답례 스티커 광고 소재");
    expect(getRuleResultRawTargetId(result)).toBe("nad-a001-02-000000203421541");
  });

  it("기존 저장 결과의 타게팅 코드를 카드 제목에서 숨긴다", () => {
    const result = ruleResult({
      targetLabel: "grp-a001-02-000000029331497~GNF",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "M_감사/생일/답례 스티커",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("타게팅");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("M_감사/생일/답례 스티커 타게팅");
    expect(getRuleResultRawTargetId(result)).toBe("grp-a001-02-000000029331497~GNF");
  });

  it("실제 검색어는 그대로 보여준다", () => {
    const result = ruleResult({
      targetLabel: "초대장디자인",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "30_초대장",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("검색어");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("초대장디자인");
  });
});

function ruleResult(overrides: Partial<SearchAdRuleResult>): SearchAdRuleResult {
  return {
    id: "rule-result",
    brandKey: "stickersee",
    adProductType: "powerlink",
    category: "low_efficiency",
    targetType: "search_term",
    targetId: "target",
    targetLabel: "검색어",
    severity: "medium",
    periodDays: 30,
    reason: "점검이 필요합니다.",
    metrics: {},
    evidencePacket: {},
    createdAt: "2026-05-26T08:00:00+09:00",
    ...overrides,
  };
}
