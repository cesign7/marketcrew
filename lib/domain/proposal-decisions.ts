import type { ProposalStatus } from "@/lib/domain/approvals";

export type ProposalDecision = "approve" | "hold" | "reject";

const decisionStatuses: Record<ProposalDecision, ProposalStatus> = {
  approve: "APPROVED",
  hold: "HELD",
  reject: "REJECTED",
};

export function getProposalStatusForDecision(decision: ProposalDecision) {
  return decisionStatuses[decision];
}

export function isProposalDecision(value: unknown): value is ProposalDecision {
  return value === "approve" || value === "hold" || value === "reject";
}
