import type { AgentReport } from "@/lib/domain/agents";
import type { ActionProposal } from "@/lib/domain/approvals";
import type { KeywordRule } from "@/lib/domain/keywords";

export function getApprovalSummary(proposals: ActionProposal[]) {
  return {
    autoExecuted: proposals.filter(
      (proposal) => proposal.status === "AUTO_EXECUTED",
    ).length,
    needsApproval: proposals.filter(
      (proposal) => proposal.status === "NEEDS_APPROVAL",
    ).length,
    held: proposals.filter((proposal) => proposal.status === "HELD").length,
    highRisk: proposals.filter((proposal) => proposal.riskLevel === "HIGH")
      .length,
  };
}

export function getReportsNeedingAttention(reports: AgentReport[]) {
  return reports
    .filter((report) => report.status === "NEEDS_ATTENTION")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getKeywordRuleSummary(rules: KeywordRule[]) {
  return {
    brandDefense: rules.filter((rule) => rule.ruleType === "BRAND_DEFENSE")
      .length,
    topDefense: rules.filter((rule) => rule.ruleType === "TOP_1_DEFENSE")
      .length,
    topTwoToThree: rules.filter(
      (rule) => rule.ruleType === "TOP_2_TO_3_OPTIMIZE",
    ).length,
    seasonalTests: rules.filter(
      (rule) => rule.ruleType === "SEASONAL_TOP_TEST",
    ).length,
    negativeCandidates: rules.filter(
      (rule) => rule.ruleType === "NEGATIVE_CANDIDATE",
    ).length,
  };
}
