import type { DataConfidence, KeywordDemandSnapshot } from "../types";

export type KeywordDemandPlannerSummary = {
  confidence: DataConfidence;
  rawKeywordsIncluded: false;
  llmExpansionAllowed: boolean;
  topKeywords: Array<{
    keyword: string;
    monthlySearches: number;
    competitionIndex: KeywordDemandSnapshot["competitionIndex"];
    evidenceId: string;
  }>;
};

export function evaluateKeywordDemandSnapshot(
  snapshot: KeywordDemandSnapshot,
  now: string,
): DataConfidence {
  if (snapshot.rateLimitState === "FAILED") {
    return "API_PARTIAL_FAILURE";
  }

  if (snapshot.rateLimitState === "BACKOFF" || snapshot.rateLimitState === "STALE") {
    return "KEYWORD_DEMAND_STALE";
  }

  if (isExpired(snapshot.cachedUntil, now)) {
    return "KEYWORD_DEMAND_STALE";
  }

  return "READY_TO_APPROVE";
}

export function summarizeKeywordDemandForPlanner(
  snapshots: KeywordDemandSnapshot[],
  now: string,
  maxKeywords = 5,
): KeywordDemandPlannerSummary {
  const hasStaleSnapshot = snapshots.some(
    (snapshot) => evaluateKeywordDemandSnapshot(snapshot, now) !== "READY_TO_APPROVE",
  );

  const topKeywords = snapshots
    .map((snapshot) => ({
      keyword: snapshot.keyword,
      monthlySearches: (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0),
      competitionIndex: snapshot.competitionIndex ?? "UNKNOWN",
      evidenceId: snapshot.id,
    }))
    .sort((left, right) => right.monthlySearches - left.monthlySearches)
    .slice(0, maxKeywords);

  return {
    confidence: hasStaleSnapshot ? "KEYWORD_DEMAND_STALE" : "READY_TO_APPROVE",
    rawKeywordsIncluded: false,
    llmExpansionAllowed: !hasStaleSnapshot,
    topKeywords,
  };
}

function isExpired(cachedUntil: string, now: string): boolean {
  return new Date(cachedUntil).getTime() < new Date(now).getTime();
}
