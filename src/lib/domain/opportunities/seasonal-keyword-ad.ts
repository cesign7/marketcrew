import { evaluateKeywordDemandSnapshot } from "./keyword-demand";
import type { DataConfidence, KeywordDemandSnapshot, SeasonalKeywordAdPlan } from "../types";

export type SeasonalKeywordGuardResult = {
  approvable: boolean;
  confidence: DataConfidence;
  blockingReasons: DataConfidence[];
};

export type BuildSeasonalKeywordAdPlanInput = {
  id: string;
  productId: string;
  eventId: string;
  keywordDemandSnapshots: KeywordDemandSnapshot[];
  now: string;
  dailyBudgetCap?: number;
  bidCap?: number;
  stopConditions: SeasonalKeywordAdPlan["stopConditions"];
  landingReadiness: SeasonalKeywordAdPlan["landingReadiness"];
};

export function buildSeasonalKeywordAdPlan(input: BuildSeasonalKeywordAdPlanInput): SeasonalKeywordAdPlan {
  const keywordSet = buildKeywordSet(input.keywordDemandSnapshots);
  const evidenceIds = input.keywordDemandSnapshots.map((snapshot) => snapshot.id);
  const confidence = input.keywordDemandSnapshots.some(
    (snapshot) => evaluateKeywordDemandSnapshot(snapshot, input.now) !== "READY_TO_APPROVE",
  )
    ? "KEYWORD_DEMAND_STALE"
    : "READY_TO_APPROVE";

  return {
    id: input.id,
    productId: input.productId,
    eventId: input.eventId,
    owner: "gro",
    seasonStage: "VALIDATE",
    keywordSet,
    dailyBudgetCap: input.dailyBudgetCap,
    bidCap: input.bidCap,
    stopConditions: input.stopConditions,
    landingReadiness: input.landingReadiness,
    confidence,
    evidenceIds,
  };
}

export function evaluateSeasonalKeywordAdPlan(plan: SeasonalKeywordAdPlan): SeasonalKeywordGuardResult {
  const blockingReasons: DataConfidence[] = [];

  if (!plan.dailyBudgetCap || !plan.bidCap || plan.stopConditions.length === 0) {
    blockingReasons.push("BUDGET_GUARD_MISSING");
  }

  if (plan.confidence === "KEYWORD_DEMAND_STALE") {
    blockingReasons.push("KEYWORD_DEMAND_STALE");
  }

  if (plan.evidenceIds.length === 0) {
    blockingReasons.push("EVIDENCE_WEAK");
  }

  if (plan.landingReadiness !== "READY") {
    blockingReasons.push("SEASONAL_CONTEXT_REQUIRED");
  }

  return {
    approvable: blockingReasons.length === 0,
    confidence: blockingReasons[0] ?? "READY_TO_APPROVE",
    blockingReasons: unique(blockingReasons),
  };
}

function buildKeywordSet(
  snapshots: KeywordDemandSnapshot[],
): SeasonalKeywordAdPlan["keywordSet"] {
  const sortedByDemand = [...snapshots].sort((left, right) => totalSearches(right) - totalSearches(left));
  const negativeCandidateKeywords = new Set(
    snapshots.filter(isNegativeCandidate).map((snapshot) => snapshot.keyword),
  );

  return {
    add: sortedByDemand
      .filter((snapshot) => snapshot.rateLimitState === "OK" && !negativeCandidateKeywords.has(snapshot.keyword))
      .slice(0, 5)
      .map((snapshot) => snapshot.keyword),
    expand: sortedByDemand
      .filter((snapshot) => totalSearches(snapshot) >= 1000 && !negativeCandidateKeywords.has(snapshot.keyword))
      .map((snapshot) => snapshot.keyword),
    pause: [],
    negativeCandidates: snapshots
      .filter(isNegativeCandidate)
      .map((snapshot) => ({
        keyword: snapshot.keyword,
        reason: "검색 수요 대비 경쟁도가 높아 초기 확장 제외 후보입니다.",
      })),
  };
}

function isNegativeCandidate(snapshot: KeywordDemandSnapshot): boolean {
  return snapshot.competitionIndex === "HIGH" && totalSearches(snapshot) < 300;
}

function totalSearches(snapshot: KeywordDemandSnapshot): number {
  return (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
