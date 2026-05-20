import { describe, expect, it } from "vitest";
import {
  actionProposalFromRecord,
  agentReportFromRecord,
  automationRuleFromRecord,
  keywordRuleFromRecord,
} from "./mappers";

describe("database mappers", () => {
  it("maps persisted action proposal JSON labels for the approval room", () => {
    const proposal = actionProposalFromRecord({
      id: "proposal-1",
      agentKey: "POSITION_DEFENDER",
      actionType: "KEYWORD_RULE_CHANGE",
      riskLevel: "MEDIUM",
      title: "'기업 초대장' 목표 순위 변경",
      reason: "2~3위권 효율이 더 좋습니다.",
      expectedImpact: "광고비 절감",
      beforeJson: { label: "1위 방어", bidAmount: 900 },
      afterJson: { label: "2~3위 유지", bidAmount: 720 },
      status: "NEEDS_APPROVAL",
      createdAt: new Date("2026-05-20T00:20:00.000Z"),
    });

    expect(proposal).toMatchObject({
      id: "proposal-1",
      beforeLabel: "1위 방어",
      afterLabel: "2~3위 유지",
      createdAt: "2026-05-20T00:20:00.000Z",
    });
  });

  it("maps keyword rules with the latest keyword snapshot metrics", () => {
    const rule = keywordRuleFromRecord(
      {
        id: "rule-1",
        brandKey: "COFFEEPRINT",
        keyword: "기업 초대장",
        ruleType: "TOP_2_TO_3_OPTIMIZE",
        targetPositionType: "TOP_2_TO_3",
        maxCpc: 850,
        reason: "2~3위권 효율이 더 좋습니다.",
        confidence: 0.76,
      },
      {
        avgCpc: 720,
        avgRank: 2.4,
      },
    );

    expect(rule).toEqual({
      id: "rule-1",
      brandKey: "COFFEEPRINT",
      keyword: "기업 초대장",
      ruleType: "TOP_2_TO_3_OPTIMIZE",
      targetPositionLabel: "2~3위 유지",
      maxCpc: 850,
      currentAvgCpc: 720,
      currentAvgRank: 2.4,
      confidence: 0.76,
      reason: "2~3위권 효율이 더 좋습니다.",
    });
  });

  it("maps nullable automation limits without inventing budgets", () => {
    const rule = automationRuleFromRecord({
      id: "auto-1",
      name: "저위험 입찰 조정",
      enabled: true,
      maxBidChangeRate: 0.05,
      maxDailyChangesPerKeyword: 2,
      maxCpc: null,
      monthlyBudgetLimit: null,
      requiresApprovalAboveRisk: "LOW",
    });

    expect(rule.maxCpc).toBeNull();
    expect(rule.monthlyBudgetLimit).toBeNull();
  });

  it("maps agent report fallback fields from character profiles", () => {
    const report = agentReportFromRecord({
      id: "report-1",
      agentKey: "BID_OPTIMIZER",
      reportType: "DAILY_STATUS",
      summary: "저효율 키워드 3개가 하향 조정 후보입니다.",
      detailJson: {
        status: "DONE",
        relatedProposalIds: ["proposal-2"],
      },
      createdAt: new Date("2026-05-20T00:10:00.000Z"),
    });

    expect(report).toMatchObject({
      characterName: "비디",
      roleName: "입찰 최적화 AI",
      status: "DONE",
      mood: "calm",
      relatedProposalIds: ["proposal-2"],
    });
  });
});
