import { describe, expect, it } from "vitest";
import {
  getRuleResultDisplayTargetLabel,
  getRuleResultDisplayTargetTypeLabel,
  getRuleResultPeriodLabel,
  getRuleResultRawTargetId,
  getRuleResultTargetDetailLabel,
} from "@/features/search-ad/domain/targetDisplay";
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
    expect(getRuleResultDisplayTargetLabel(result)).toBe("M_감사/생일/답례 스티커 여성 타게팅");
    expect(getRuleResultTargetDetailLabel(result)).toBe("여성");
    expect(getRuleResultRawTargetId(result)).toBe("grp-a001-02-000000029331497~GNF");
  });

  it("타게팅 코드의 연령과 시간대를 한글로 보여준다", () => {
    const ageResult = ruleResult({
      targetLabel: "grp-a001-02-000000029331497~AG3539",
      evidencePacket: { adgroupName: "M_감사/생일/답례 스티커" },
    });
    const scheduleResult = ruleResult({
      targetLabel: "grp-m001-01-000001408384958~SDMON0820",
      evidencePacket: { adgroupName: "30_초대장" },
    });

    expect(getRuleResultTargetDetailLabel(ageResult)).toBe("35~39세");
    expect(getRuleResultDisplayTargetLabel(ageResult)).toBe("M_감사/생일/답례 스티커 35~39세 타게팅");
    expect(getRuleResultTargetDetailLabel(scheduleResult)).toBe("월요일 8:00~20:00");
  });

  it("실제 수집 기간과 규칙 기간을 함께 보여준다", () => {
    const result = ruleResult({
      periodDays: 30,
      evidencePacket: {
        dataCoverageLabel: "수집 기준일 2026-05-25 · 실제 1일치 / 규칙 30일",
      },
    });

    expect(getRuleResultPeriodLabel(result)).toBe("수집 기준일 2026-05-25 · 실제 1일치 / 규칙 30일");
  });

  it("수집 기간이 저장되지 않은 기존 결과는 원천 기준일로 보완한다", () => {
    const result = ruleResult({
      periodDays: 30,
      evidencePacket: {
        sourceDate: "2026-05-25",
      },
    });

    expect(getRuleResultPeriodLabel(result)).toBe("수집 기준일 2026-05-25 · 실제 1일치 / 규칙 30일");
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
