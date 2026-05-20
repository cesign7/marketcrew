import type { ActionType, RiskLevel } from "@/lib/domain/approvals";
import type { BrandKey, KeywordRuleType } from "@/lib/domain/keywords";

export type TargetPositionType =
  | "TOP_1"
  | "TOP_1_TO_2"
  | "TOP_2_TO_3"
  | "LOW_BID"
  | "EXCLUDE"
  | "PAUSE"
  | "TEST";

export type MaterializationSkipReason =
  | "UNSUPPORTED_ACTION"
  | "MISSING_RULE_FIELDS"
  | "MISSING_KEYWORD"
  | "MISSING_BRAND";

export interface ProposalRuleMaterializationInput {
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  beforeJson: unknown;
  afterJson: unknown;
}

export interface ProposalRuleMaterializationContext {
  brandKey?: BrandKey | null;
  keyword?: string | null;
  keywordId?: string | null;
}

export interface MaterializedKeywordRule {
  brandKey: BrandKey;
  keyword: string;
  keywordId: string | null;
  ruleType: KeywordRuleType;
  targetPositionType: TargetPositionType;
  maxCpc: number | null;
  status: "ACTIVE";
  reason: string;
  confidence: number;
}

export type ProposalRuleMaterializationResult =
  | {
      materialized: true;
      rule: MaterializedKeywordRule;
    }
  | {
      materialized: false;
      reason: MaterializationSkipReason;
    };

const materializableActionTypes: readonly ActionType[] = [
  "KEYWORD_RULE_CHANGE",
  "NEGATIVE_KEYWORD",
];

const keywordRuleTypes = [
  "BRAND_DEFENSE",
  "TOP_1_DEFENSE",
  "TOP_2_TO_3_OPTIMIZE",
  "SEASONAL_TOP_TEST",
  "PROFIT_BASED_BID",
  "LOW_BID_KEEP",
  "NEGATIVE_CANDIDATE",
  "PAUSE_CANDIDATE",
  "DISCOVERY_TEST",
] satisfies KeywordRuleType[];

const targetPositionTypes = [
  "TOP_1",
  "TOP_1_TO_2",
  "TOP_2_TO_3",
  "LOW_BID",
  "EXCLUDE",
  "PAUSE",
  "TEST",
] satisfies TargetPositionType[];

const brandKeys = ["COFFEEPRINT", "STICKERSEE"] satisfies BrandKey[];

export function buildKeywordRuleMaterialization(
  proposal: ProposalRuleMaterializationInput,
  context: ProposalRuleMaterializationContext = {},
): ProposalRuleMaterializationResult {
  if (!isMaterializableActionType(proposal.actionType)) {
    return { materialized: false, reason: "UNSUPPORTED_ACTION" };
  }

  const beforeJson = objectFromJson(proposal.beforeJson);
  const afterJson = objectFromJson(proposal.afterJson);
  const ruleType = enumFromJson(afterJson.ruleType, keywordRuleTypes);
  const targetPositionType = enumFromJson(
    afterJson.targetPositionType,
    targetPositionTypes,
  );

  if (!ruleType || !targetPositionType) {
    return { materialized: false, reason: "MISSING_RULE_FIELDS" };
  }

  const keyword =
    cleanString(context.keyword) ??
    stringFromJson(afterJson.keyword) ??
    stringFromJson(beforeJson.keyword) ??
    extractQuotedKeyword(proposal.title);

  if (!keyword) {
    return { materialized: false, reason: "MISSING_KEYWORD" };
  }

  const brandKey =
    enumFromJson(context.brandKey, brandKeys) ??
    enumFromJson(afterJson.brandKey, brandKeys) ??
    enumFromJson(beforeJson.brandKey, brandKeys) ??
    inferBrandKey(keyword);

  if (!brandKey) {
    return { materialized: false, reason: "MISSING_BRAND" };
  }

  return {
    materialized: true,
    rule: {
      brandKey,
      keyword,
      keywordId:
        cleanString(context.keywordId) ??
        stringFromJson(afterJson.keywordId) ??
        stringFromJson(beforeJson.keywordId),
      ruleType,
      targetPositionType,
      maxCpc: maxCpcFromProposal(proposal.actionType, afterJson),
      status: "ACTIVE",
      reason: proposal.reason,
      confidence:
        numberFromJson(afterJson.confidence) ??
        numberFromJson(beforeJson.confidence) ??
        confidenceFromRisk(proposal.riskLevel),
    },
  };
}

function isMaterializableActionType(actionType: ActionType) {
  return materializableActionTypes.includes(actionType);
}

function maxCpcFromProposal(
  actionType: ActionType,
  afterJson: Record<string, unknown>,
) {
  if (actionType === "NEGATIVE_KEYWORD") {
    return 0;
  }

  return numberFromJson(afterJson.maxCpc);
}

function confidenceFromRisk(riskLevel: RiskLevel) {
  if (riskLevel === "LOW") {
    return 0.78;
  }

  if (riskLevel === "MEDIUM") {
    return 0.66;
  }

  return 0.5;
}

function extractQuotedKeyword(title: string) {
  const match = title.match(/'([^']+)'/);
  return cleanString(match?.[1]);
}

function inferBrandKey(value: string): BrandKey | null {
  const normalized = value.toLowerCase();

  if (normalized.includes("stickersee") || normalized.includes("스티커씨")) {
    return "STICKERSEE";
  }

  if (normalized.includes("coffeeprint") || normalized.includes("커피프린트")) {
    return "COFFEEPRINT";
  }

  return null;
}

function objectFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringFromJson(value: unknown) {
  return typeof value === "string" ? cleanString(value) : null;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberFromJson(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function enumFromJson<T extends string>(
  value: unknown,
  allowed: readonly T[],
) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}
