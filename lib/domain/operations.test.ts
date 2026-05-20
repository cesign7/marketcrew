import { describe, expect, it } from "vitest";
import {
  getApprovalSummary,
  getKeywordRuleSummary,
  getReportsNeedingAttention,
} from "./operations";
import {
  mockActionProposals,
  mockAgentReports,
  mockKeywordRules,
} from "@/lib/mock/marketingOperationsMock";

describe("marketing operations summaries", () => {
  it("counts proposal statuses for the approval room", () => {
    expect(getApprovalSummary(mockActionProposals)).toEqual({
      autoExecuted: 1,
      needsApproval: 2,
      held: 1,
      highRisk: 1,
    });
  });

  it("returns agent reports that need attention first", () => {
    const reports = getReportsNeedingAttention(mockAgentReports);

    expect(reports.map((report) => report.agentKey)).toEqual([
      "POSITION_DEFENDER",
      "MARGIN_ANALYST",
    ]);
  });

  it("summarizes keyword rule strategy buckets", () => {
    expect(getKeywordRuleSummary(mockKeywordRules)).toEqual({
      brandDefense: 1,
      topDefense: 1,
      topTwoToThree: 1,
      seasonalTests: 1,
      negativeCandidates: 1,
    });
  });
});
