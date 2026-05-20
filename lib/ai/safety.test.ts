import { describe, expect, it } from "vitest";
import { validateAgentProposal } from "./safety";

describe("validateAgentProposal", () => {
  it("rejects bid adjustments without bid guard fields", () => {
    expect(
      validateAgentProposal({ actionType: "BID_ADJUSTMENT", afterJson: {} }),
    ).toMatchObject({
      ok: false,
      reason: "BID_ADJUSTMENT_REQUIRES_BID_GUARDS",
    });
  });

  it("accepts report-only service ideas with a measurable next step", () => {
    expect(
      validateAgentProposal({
        actionType: "REPORT_ONLY",
        afterJson: {
          kind: "SERVICE_IDEA",
          nextStep: "Test a seasonal sticker bundle landing page",
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects Search Ad mutation endpoints before approved-tools mode", () => {
    expect(
      validateAgentProposal(
        {
          actionType: "KEYWORD_RULE_CHANGE",
          beforeJson: { keywordId: "kw-1" },
          afterJson: {
            method: "POST",
            endpoint: "/ncc/keywords",
            ruleType: "TOP_1_DEFENSE",
            targetPositionType: "TOP_1",
          },
        },
        { mode: "llm-assisted" },
      ),
    ).toMatchObject({
      ok: false,
      reason: "SEARCH_AD_MUTATION_REQUIRES_APPROVED_TOOLS_MODE",
    });
  });

  it("rejects negative keywords without cost and conversion evidence", () => {
    expect(
      validateAgentProposal({
        actionType: "NEGATIVE_KEYWORD",
        beforeJson: { keywordId: "kw-free", clicks: 12 },
        afterJson: {
          ruleType: "NEGATIVE_CANDIDATE",
          targetPositionType: "EXCLUDE",
        },
      }),
    ).toMatchObject({
      ok: false,
      reason: "NEGATIVE_KEYWORD_REQUIRES_PERFORMANCE_EVIDENCE",
    });
  });

  it("rejects copy and title proposals that claim changes were already applied", () => {
    expect(
      validateAgentProposal({
        actionType: "AD_COPY_CHANGE",
        afterJson: { label: "문안 적용 완료" },
      }),
    ).toMatchObject({
      ok: false,
      reason: "CONTENT_CHANGE_MUST_NOT_CLAIM_ALREADY_APPLIED",
    });
  });
});
