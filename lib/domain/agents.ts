export type AgentKey =
  | "GENERAL_MANAGER"
  | "POSITION_DEFENDER"
  | "BID_OPTIMIZER"
  | "KEYWORD_STRATEGIST"
  | "PRODUCT_STRATEGIST"
  | "TITLE_SEO"
  | "AD_COPYWRITER"
  | "MARGIN_ANALYST";

export type AgentStatus = "IDLE" | "WORKING" | "DONE" | "NEEDS_ATTENTION";

export interface AgentReport {
  id: string;
  agentKey: AgentKey;
  characterName: string;
  roleName: string;
  status: AgentStatus;
  summary: string;
  mood: "calm" | "excited" | "worried" | "focused";
  createdAt: string;
  relatedProposalIds: string[];
}
