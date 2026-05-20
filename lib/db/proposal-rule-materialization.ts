import type { ActionType, ProposalStatus, RiskLevel } from "@/lib/domain/approvals";
import type { BrandKey } from "@/lib/domain/keywords";
import {
  buildKeywordRuleMaterialization,
  type MaterializedKeywordRule,
  type ProposalRuleMaterializationContext,
  type ProposalRuleMaterializationResult,
} from "@/lib/domain/proposal-rule-materialization";
import { prisma } from "@/lib/db/prisma";

interface ApprovedProposalRecord {
  id: string;
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  beforeJson: unknown;
  afterJson: unknown;
  status: ProposalStatus;
}

export type ApprovedKeywordRuleMaterializationResult =
  | {
      materialized: true;
      operation: "created" | "updated";
      ruleId: string;
      rule: MaterializedKeywordRule;
    }
  | ProposalRuleMaterializationResult;

export async function materializeApprovedKeywordRule(
  proposal: ApprovedProposalRecord,
): Promise<ApprovedKeywordRuleMaterializationResult> {
  if (proposal.status !== "APPROVED") {
    return { materialized: false, reason: "UNSUPPORTED_ACTION" };
  }

  const context = await resolveProposalRuleContext(proposal);
  const materialization = buildKeywordRuleMaterialization(proposal, context);

  if (!materialization.materialized) {
    return materialization;
  }

  const { rule } = materialization;
  const existing = await prisma.keywordRule.findFirst({
    where: {
      brandKey: rule.brandKey,
      keyword: rule.keyword,
      ruleType: rule.ruleType,
      targetPositionType: rule.targetPositionType,
      status: { not: "ARCHIVED" },
    },
    orderBy: { updatedAt: "desc" },
  });
  const data = {
    keywordId: rule.keywordId,
    keyword: rule.keyword,
    brandKey: rule.brandKey,
    ruleType: rule.ruleType,
    targetPositionType: rule.targetPositionType,
    maxCpc: rule.maxCpc,
    status: rule.status,
    reason: rule.reason,
    confidence: rule.confidence,
  };
  const savedRule = existing
    ? await prisma.keywordRule.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.keywordRule.create({ data });

  return {
    materialized: true,
    operation: existing ? "updated" : "created",
    ruleId: savedRule.id,
    rule,
  };
}

async function resolveProposalRuleContext(
  proposal: ApprovedProposalRecord,
): Promise<ProposalRuleMaterializationContext> {
  const beforeJson = objectFromJson(proposal.beforeJson);
  const afterJson = objectFromJson(proposal.afterJson);
  const explicitContext = {
    brandKey:
      brandKeyFromJson(afterJson.brandKey) ?? brandKeyFromJson(beforeJson.brandKey),
    keyword:
      stringFromJson(afterJson.keyword) ??
      stringFromJson(beforeJson.keyword) ??
      extractQuotedKeyword(proposal.title),
    keywordId: stringFromJson(afterJson.keywordId) ?? stringFromJson(beforeJson.keywordId),
  };

  if (explicitContext.brandKey) {
    return explicitContext;
  }

  const keywordSnapshot = await findLatestKeywordSnapshot(explicitContext);

  if (!keywordSnapshot) {
    return explicitContext;
  }

  const [adgroupSnapshot, campaignSnapshot] = await Promise.all([
    prisma.adAdgroupSnapshot.findFirst({
      where: { adgroupId: keywordSnapshot.adgroupId },
      orderBy: { collectedAt: "desc" },
    }),
    prisma.adCampaignSnapshot.findFirst({
      where: { campaignId: keywordSnapshot.campaignId },
      orderBy: { collectedAt: "desc" },
    }),
  ]);

  return {
    brandKey: adgroupSnapshot?.brandKey ?? campaignSnapshot?.brandKey ?? null,
    keyword: explicitContext.keyword ?? keywordSnapshot.keyword,
    keywordId: explicitContext.keywordId ?? keywordSnapshot.keywordId,
  };
}

async function findLatestKeywordSnapshot(context: ProposalRuleMaterializationContext) {
  if (context.keywordId) {
    const snapshot = await prisma.adKeywordSnapshot.findFirst({
      where: { keywordId: context.keywordId },
      orderBy: { collectedDate: "desc" },
    });

    if (snapshot) {
      return snapshot;
    }
  }

  if (context.keyword) {
    return prisma.adKeywordSnapshot.findFirst({
      where: { keyword: context.keyword },
      orderBy: { collectedDate: "desc" },
    });
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
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function brandKeyFromJson(value: unknown): BrandKey | null {
  return value === "COFFEEPRINT" || value === "STICKERSEE" ? value : null;
}

function extractQuotedKeyword(title: string) {
  const match = title.match(/'([^']+)'/);
  return stringFromJson(match?.[1]);
}
