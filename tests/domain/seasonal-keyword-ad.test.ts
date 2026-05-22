import { describe, expect, it } from "vitest";
import {
  buildSeasonalKeywordAdPlan,
  evaluateKeywordDemandSnapshot,
  evaluateSeasonalKeywordAdPlan,
  summarizeKeywordDemandForPlanner,
} from "../../src/lib/domain";
import type { KeywordDemandSnapshot } from "../../src/lib/domain";

const freshDemand: KeywordDemandSnapshot = {
  id: "kw-demand-001",
  keyword: "부처님오신날 선물카드",
  provider: "sample",
  monthlyPcSearches: 420,
  monthlyMobileSearches: 1800,
  competitionIndex: "MEDIUM",
  cachedUntil: "2026-05-23T00:00:00+09:00",
  collectedAt: "2026-05-22T08:00:00+09:00",
  rateLimitState: "OK",
};

const staleDemand: KeywordDemandSnapshot = {
  id: "kw-demand-002",
  keyword: "사찰 행사 선물",
  provider: "sample",
  monthlyPcSearches: 90,
  monthlyMobileSearches: 120,
  competitionIndex: "HIGH",
  cachedUntil: "2026-05-20T00:00:00+09:00",
  collectedAt: "2026-05-19T08:00:00+09:00",
  rateLimitState: "STALE",
};

const negativeDemand: KeywordDemandSnapshot = {
  id: "kw-demand-negative",
  keyword: "부처님오신날 무료 이미지",
  provider: "sample",
  monthlyPcSearches: 40,
  monthlyMobileSearches: 90,
  competitionIndex: "HIGH",
  cachedUntil: "2026-05-23T00:00:00+09:00",
  collectedAt: "2026-05-22T08:00:00+09:00",
  rateLimitState: "OK",
};

describe("SeasonalKeywordAdPlan", () => {
  it("예산 상한 또는 중지 조건이 없는 시즌 키워드 광고안은 승인 불가다", () => {
    const plan = buildSeasonalKeywordAdPlan({
      id: "season-plan-001",
      productId: "gift-card",
      eventId: "buddha-birthday",
      keywordDemandSnapshots: [freshDemand],
      now: "2026-05-22T09:30:00+09:00",
      stopConditions: [],
      landingReadiness: "READY",
    });

    expect(evaluateSeasonalKeywordAdPlan(plan)).toEqual({
      approvable: false,
      confidence: "BUDGET_GUARD_MISSING",
      blockingReasons: ["BUDGET_GUARD_MISSING"],
    });
  });

  it("예산, 입찰, 중지 조건, 랜딩 준비, 근거가 모두 있으면 승인 가능하다", () => {
    const plan = buildSeasonalKeywordAdPlan({
      id: "season-plan-002",
      productId: "gift-card",
      eventId: "buddha-birthday",
      keywordDemandSnapshots: [freshDemand],
      now: "2026-05-22T09:30:00+09:00",
      dailyBudgetCap: 30000,
      bidCap: 900,
      stopConditions: [{ metric: "SPEND", operator: ">", value: 30000, durationDays: 1 }],
      landingReadiness: "READY",
    });

    expect(plan.keywordSet.add).toEqual(["부처님오신날 선물카드"]);
    expect(evaluateSeasonalKeywordAdPlan(plan)).toEqual({
      approvable: true,
      confidence: "READY_TO_APPROVE",
      blockingReasons: [],
    });
  });

  it("제외 후보 키워드는 승인 후 추가 키워드에 섞지 않는다", () => {
    const plan = buildSeasonalKeywordAdPlan({
      id: "season-plan-negative",
      productId: "gift-card",
      eventId: "buddha-birthday",
      keywordDemandSnapshots: [freshDemand, negativeDemand],
      now: "2026-05-22T09:30:00+09:00",
      dailyBudgetCap: 30000,
      bidCap: 900,
      stopConditions: [{ metric: "SPEND", operator: ">", value: 30000, durationDays: 1 }],
      landingReadiness: "READY",
    });

    expect(plan.keywordSet.add).toEqual(["부처님오신날 선물카드"]);
    expect(plan.keywordSet.negativeCandidates).toEqual([
      {
        keyword: "부처님오신날 무료 이미지",
        reason: "검색 수요 대비 경쟁도가 높아 초기 확장 제외 후보입니다.",
      },
    ]);
  });

  it("stale 키워드 캐시는 stale label을 반환하고 LLM 원본 확장을 막는다", () => {
    expect(evaluateKeywordDemandSnapshot(staleDemand, "2026-05-22T09:30:00+09:00")).toBe("KEYWORD_DEMAND_STALE");

    const summary = summarizeKeywordDemandForPlanner([freshDemand, staleDemand], "2026-05-22T09:30:00+09:00");

    expect(summary.confidence).toBe("KEYWORD_DEMAND_STALE");
    expect(summary.rawKeywordsIncluded).toBe(false);
    expect(summary.llmExpansionAllowed).toBe(false);
    expect(summary.topKeywords).toEqual([
      {
        keyword: "부처님오신날 선물카드",
        monthlySearches: 2220,
        competitionIndex: "MEDIUM",
        evidenceId: "kw-demand-001",
      },
      {
        keyword: "사찰 행사 선물",
        monthlySearches: 210,
        competitionIndex: "HIGH",
        evidenceId: "kw-demand-002",
      },
    ]);
  });
});
