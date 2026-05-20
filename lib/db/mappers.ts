import { getAgentProfile } from "@/lib/domain/agent-profiles";
import type { AgentKey, AgentReport, AgentStatus } from "@/lib/domain/agents";
import type {
  ActionProposal,
  ActionType,
  ProposalStatus,
  RiskLevel,
} from "@/lib/domain/approvals";
import type { AutomationRule } from "@/lib/domain/automation";
import type {
  BrandKey,
  KeywordRule,
  KeywordRuleType,
} from "@/lib/domain/keywords";

type JsonLike = unknown;

export interface ActionProposalRecord {
  id: string;
  agentKey: AgentKey;
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  expectedImpact: string;
  beforeJson: JsonLike;
  afterJson: JsonLike;
  status: ProposalStatus;
  createdAt: Date;
}

export interface KeywordRuleRecord {
  id: string;
  brandKey: BrandKey;
  keyword: string;
  ruleType: KeywordRuleType;
  targetPositionType: string;
  maxCpc: number | null;
  reason: string;
  confidence: number | null;
}

export interface KeywordSnapshotRecord {
  avgCpc: number | null;
  avgRank: number | null;
}

export interface AutomationRuleRecord {
  id: string;
  name: string;
  enabled: boolean;
  maxBidChangeRate: number;
  maxDailyChangesPerKeyword: number;
  maxCpc: number | null;
  monthlyBudgetLimit: number | null;
  requiresApprovalAboveRisk: RiskLevel;
}

export interface AgentReportRecord {
  id: string;
  agentKey: AgentKey;
  reportType: string;
  summary: string;
  detailJson: JsonLike;
  createdAt: Date;
}

const targetPositionLabels: Record<string, string> = {
  TOP_1: "1위 방어",
  TOP_1_TO_2: "1~2위 유지",
  TOP_2_TO_3: "2~3위 유지",
  LOW_BID: "저입찰 유지",
  EXCLUDE: "제외 후보",
  PAUSE: "중단 후보",
  TEST: "테스트",
};

const agentStatuses: AgentStatus[] = ["IDLE", "WORKING", "DONE", "NEEDS_ATTENTION"];
const moods: AgentReport["mood"][] = ["calm", "excited", "worried", "focused"];

export function actionProposalFromRecord(
  record: ActionProposalRecord,
): ActionProposal {
  return {
    id: record.id,
    agentKey: record.agentKey,
    actionType: record.actionType,
    riskLevel: record.riskLevel,
    title: record.title,
    reason: record.reason,
    expectedImpact: record.expectedImpact,
    beforeLabel: labelFromJson(record.beforeJson, "이전 상태 없음"),
    afterLabel: labelFromJson(record.afterJson, "제안 상태 없음"),
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  };
}

export function keywordRuleFromRecord(
  record: KeywordRuleRecord,
  latestSnapshot?: KeywordSnapshotRecord,
): KeywordRule {
  return {
    id: record.id,
    brandKey: record.brandKey,
    keyword: record.keyword,
    ruleType: record.ruleType,
    targetPositionLabel:
      targetPositionLabels[record.targetPositionType] ?? record.targetPositionType,
    maxCpc: record.maxCpc,
    currentAvgCpc: latestSnapshot?.avgCpc ?? 0,
    currentAvgRank: latestSnapshot?.avgRank ?? 0,
    confidence: record.confidence ?? 0,
    reason: record.reason,
  };
}

export function automationRuleFromRecord(
  record: AutomationRuleRecord,
): AutomationRule {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    maxBidChangeRate: record.maxBidChangeRate,
    maxDailyChangesPerKeyword: record.maxDailyChangesPerKeyword,
    maxCpc: record.maxCpc,
    monthlyBudgetLimit: record.monthlyBudgetLimit,
    requiresApprovalAboveRisk: record.requiresApprovalAboveRisk,
  };
}

export function agentReportFromRecord(record: AgentReportRecord): AgentReport {
  const profile = getAgentProfile(record.agentKey);
  const detail = objectFromJson(record.detailJson);

  return {
    id: record.id,
    agentKey: record.agentKey,
    characterName: stringFromJson(detail.characterName) ?? profile.characterName,
    roleName: stringFromJson(detail.roleName) ?? profile.roleName,
    status: enumFromJson(detail.status, agentStatuses) ?? profile.defaultStatus,
    summary: record.summary,
    mood: enumFromJson(detail.mood, moods) ?? profile.defaultMood,
    createdAt: record.createdAt.toISOString(),
    relatedProposalIds: stringArrayFromJson(detail.relatedProposalIds),
  };
}

function labelFromJson(value: JsonLike, fallback: string) {
  const json = objectFromJson(value);
  return stringFromJson(json.label) ?? fallback;
}

function objectFromJson(value: JsonLike): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringFromJson(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringArrayFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function enumFromJson<T extends string>(value: unknown, allowed: T[]) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}
