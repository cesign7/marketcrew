import type { AgentKey, AgentReport, AgentStatus } from "@/lib/domain/agents";

export interface AgentProfile {
  agentKey: AgentKey;
  characterName: string;
  roleName: string;
  defaultStatus: AgentStatus;
  defaultMood: AgentReport["mood"];
  uiInitial: string;
  accentClass: string;
}

export const agentProfiles: Record<AgentKey, AgentProfile> = {
  GENERAL_MANAGER: {
    agentKey: "GENERAL_MANAGER",
    characterName: "오피",
    roleName: "운영 총괄 AI",
    defaultStatus: "WORKING",
    defaultMood: "focused",
    uiInitial: "오",
    accentClass: "bg-[#ffd7a8] text-[#de6a4b]",
  },
  POSITION_DEFENDER: {
    agentKey: "POSITION_DEFENDER",
    characterName: "루키",
    roleName: "순위 방어 AI",
    defaultStatus: "NEEDS_ATTENTION",
    defaultMood: "focused",
    uiInitial: "루",
    accentClass: "bg-[#dff4ff] text-[#2476a8]",
  },
  BID_OPTIMIZER: {
    agentKey: "BID_OPTIMIZER",
    characterName: "비디",
    roleName: "입찰 최적화 AI",
    defaultStatus: "DONE",
    defaultMood: "calm",
    uiInitial: "비",
    accentClass: "bg-[#e6f7ef] text-[#14764d]",
  },
  KEYWORD_STRATEGIST: {
    agentKey: "KEYWORD_STRATEGIST",
    characterName: "키키",
    roleName: "키워드 전략 AI",
    defaultStatus: "WORKING",
    defaultMood: "excited",
    uiInitial: "키",
    accentClass: "bg-[#fff3d6] text-[#8a5b00]",
  },
  PRODUCT_STRATEGIST: {
    agentKey: "PRODUCT_STRATEGIST",
    characterName: "프로",
    roleName: "상품 전략 AI",
    defaultStatus: "IDLE",
    defaultMood: "calm",
    uiInitial: "프",
    accentClass: "bg-[#edf1f4] text-[#687481]",
  },
  TITLE_SEO: {
    agentKey: "TITLE_SEO",
    characterName: "타이",
    roleName: "상품명 최적화 AI",
    defaultStatus: "IDLE",
    defaultMood: "calm",
    uiInitial: "타",
    accentClass: "bg-[#eee7ff] text-[#6b4bb4]",
  },
  AD_COPYWRITER: {
    agentKey: "AD_COPYWRITER",
    characterName: "카피",
    roleName: "광고문안 AI",
    defaultStatus: "NEEDS_ATTENTION",
    defaultMood: "excited",
    uiInitial: "카",
    accentClass: "bg-[#ffe9e0] text-[#b34526]",
  },
  MARGIN_ANALYST: {
    agentKey: "MARGIN_ANALYST",
    characterName: "마루",
    roleName: "마진 분석 AI",
    defaultStatus: "NEEDS_ATTENTION",
    defaultMood: "worried",
    uiInitial: "마",
    accentClass: "bg-[#f0eadf] text-[#756044]",
  },
};

export function getAgentProfile(agentKey: AgentKey) {
  return agentProfiles[agentKey];
}
