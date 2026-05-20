import type { AiAgentMode } from "@/lib/integrations/openai/agent-report";

export type AgentProposalSafetyMode = AiAgentMode | "llm-approved-tools";

export type SafetyFailureReason =
  | "SEARCH_AD_MUTATION_REQUIRES_APPROVED_TOOLS_MODE"
  | "BID_ADJUSTMENT_REQUIRES_BID_GUARDS"
  | "KEYWORD_RULE_CHANGE_REQUIRES_RULE_FIELDS"
  | "NEGATIVE_KEYWORD_REQUIRES_PERFORMANCE_EVIDENCE"
  | "CONTENT_CHANGE_MUST_NOT_CLAIM_ALREADY_APPLIED"
  | "SERVICE_IDEA_REQUIRES_MEASURABLE_NEXT_STEP";

export type AgentProposalSafetyResult =
  | {
      ok: true;
      safetyJson: {
        checked: true;
        mode: AgentProposalSafetyMode;
      };
    }
  | {
      ok: false;
      reason: SafetyFailureReason;
    };

export interface AgentProposalSafetyOptions {
  mode?: AgentProposalSafetyMode;
}

export interface AgentProposalLike {
  actionType?: unknown;
  title?: unknown;
  reason?: unknown;
  expectedImpact?: unknown;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export function validateAgentProposal(
  proposal: AgentProposalLike,
  options: AgentProposalSafetyOptions = {},
): AgentProposalSafetyResult {
  const mode = options.mode ?? "llm-assisted";
  const beforeJson = objectFromJson(proposal.beforeJson);
  const afterJson = objectFromJson(proposal.afterJson);

  if (mode !== "llm-approved-tools" && referencesSearchAdMutation(proposal)) {
    return {
      ok: false,
      reason: "SEARCH_AD_MUTATION_REQUIRES_APPROVED_TOOLS_MODE",
    };
  }

  if (
    proposal.actionType === "BID_ADJUSTMENT" &&
    !hasBidAdjustmentGuards(beforeJson, afterJson)
  ) {
    return {
      ok: false,
      reason: "BID_ADJUSTMENT_REQUIRES_BID_GUARDS",
    };
  }

  if (
    proposal.actionType === "KEYWORD_RULE_CHANGE" &&
    !hasKeywordRuleFields(beforeJson, afterJson)
  ) {
    return {
      ok: false,
      reason: "KEYWORD_RULE_CHANGE_REQUIRES_RULE_FIELDS",
    };
  }

  if (
    proposal.actionType === "NEGATIVE_KEYWORD" &&
    !hasNegativeKeywordEvidence(beforeJson, afterJson)
  ) {
    return {
      ok: false,
      reason: "NEGATIVE_KEYWORD_REQUIRES_PERFORMANCE_EVIDENCE",
    };
  }

  if (
    (proposal.actionType === "AD_COPY_CHANGE" ||
      proposal.actionType === "PRODUCT_TITLE_CHANGE") &&
    claimsAlreadyApplied(proposal)
  ) {
    return {
      ok: false,
      reason: "CONTENT_CHANGE_MUST_NOT_CLAIM_ALREADY_APPLIED",
    };
  }

  if (
    proposal.actionType === "REPORT_ONLY" &&
    afterJson.kind === "SERVICE_IDEA" &&
    !stringFromJson(afterJson.nextStep)
  ) {
    return {
      ok: false,
      reason: "SERVICE_IDEA_REQUIRES_MEASURABLE_NEXT_STEP",
    };
  }

  return {
    ok: true,
    safetyJson: {
      checked: true,
      mode,
    },
  };
}

function hasBidAdjustmentGuards(
  beforeJson: Record<string, unknown>,
  afterJson: Record<string, unknown>,
) {
  return Boolean(
    stringFromJson(beforeJson.keywordId) &&
      numberFromJson(beforeJson.currentBid) !== null &&
      numberFromJson(afterJson.proposedBid) !== null &&
      numberFromJson(afterJson.changeRate) !== null &&
      afterJson.budgetGuardPassed === true,
  );
}

function hasKeywordRuleFields(
  beforeJson: Record<string, unknown>,
  afterJson: Record<string, unknown>,
) {
  return Boolean(
    (stringFromJson(beforeJson.keywordId) || stringFromJson(afterJson.keywordId)) &&
      stringFromJson(afterJson.ruleType) &&
      stringFromJson(afterJson.targetPositionType),
  );
}

function hasNegativeKeywordEvidence(
  beforeJson: Record<string, unknown>,
  afterJson: Record<string, unknown>,
) {
  return Boolean(
    stringFromJson(beforeJson.keywordId) &&
      numberFromJson(beforeJson.clicks) !== null &&
      numberFromJson(beforeJson.cost) !== null &&
      numberFromJson(beforeJson.conversions) !== null &&
      stringFromJson(afterJson.ruleType) === "NEGATIVE_CANDIDATE" &&
      stringFromJson(afterJson.targetPositionType) === "EXCLUDE",
  );
}

function referencesSearchAdMutation(value: unknown) {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  const hasMutationMethod =
    text.includes('"post"') ||
    text.includes('"put"') ||
    text.includes('"patch"') ||
    text.includes('"delete"');

  return (
    hasMutationMethod &&
    (text.includes("/ncc/keywords") ||
      text.includes("/ncc/ads") ||
      text.includes("/ncc/adgroups") ||
      text.includes("/ncc/campaigns"))
  );
}

function claimsAlreadyApplied(proposal: AgentProposalLike) {
  const text = [
    proposal.title,
    proposal.reason,
    proposal.expectedImpact,
    proposal.afterJson,
  ]
    .map((value) => JSON.stringify(value ?? ""))
    .join(" ")
    .toLowerCase();

  return (
    text.includes("적용 완료") ||
    text.includes("실행 완료") ||
    text.includes("already applied")
  );
}

function objectFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringFromJson(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberFromJson(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
