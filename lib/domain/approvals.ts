import type { AgentKey } from "@/lib/domain/agents";

export type ActionType =
  | "BID_ADJUSTMENT"
  | "KEYWORD_RULE_CHANGE"
  | "NEGATIVE_KEYWORD"
  | "AD_COPY_CHANGE"
  | "PRODUCT_TITLE_CHANGE"
  | "REPORT_ONLY";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ProposalStatus =
  | "AUTO_EXECUTED"
  | "NEEDS_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "HELD"
  | "FAILED";

export interface ActionProposal {
  id: string;
  agentKey: AgentKey;
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  expectedImpact: string;
  beforeLabel: string;
  afterLabel: string;
  status: ProposalStatus;
  createdAt: string;
}
