import type {
  AdProductType,
  BrandKey,
  SearchAdDuplicateKeywordGroup,
  SearchAdFilters,
  SearchAdKeywordCleanupCandidate,
  SearchAdKeywordCleanupRecommendation,
  SearchAdKeywordCleanupView,
} from "./types";

export type SearchAdKeywordStateForCleanup = {
  keywordId: string;
  keywordText: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  campaignId?: string;
  campaignName?: string;
  adgroupId?: string;
  adgroupName?: string;
  userLock: boolean | null;
  status?: string;
  statusReason?: string;
  bidAmount?: number | null;
  collectedAt: string;
};

export type SearchAdKeywordPerformanceForCleanup = {
  brandKey: BrandKey;
  adProductType: AdProductType;
  keywordId?: string;
  keywordText?: string;
  adgroupId?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  dataDays: number;
  startDate?: string;
  endDate?: string;
};

export type SearchAdKeywordCoverageForCleanup = {
  brandKey: BrandKey;
  adProductType: AdProductType;
  startDate?: string;
  endDate?: string;
  actualDays: number;
};

type BuildKeywordCleanupInput = {
  filters: SearchAdFilters;
  generatedAt?: string;
  keywords: SearchAdKeywordStateForCleanup[];
  performanceRows: SearchAdKeywordPerformanceForCleanup[];
  coverageRows: SearchAdKeywordCoverageForCleanup[];
};

const RECOMMENDATION_LABELS: Record<SearchAdKeywordCleanupRecommendation, string> = {
  keep: "유지",
  pause_candidate: "끄기 후보",
  delete_candidate: "삭제 후보",
  review: "검토",
};

export function buildSearchAdKeywordCleanupView(input: BuildKeywordCleanupInput): SearchAdKeywordCleanupView {
  const performanceByKeywordId = new Map<string, SearchAdKeywordPerformanceForCleanup>();
  const performanceByScope = new Map<string, SearchAdKeywordPerformanceForCleanup>();
  for (const performance of input.performanceRows) {
    if (performance.keywordId) {
      performanceByKeywordId.set(performance.keywordId, mergePerformance(performanceByKeywordId.get(performance.keywordId), performance));
    }

    const normalizedKeyword = normalizeKeywordText(performance.keywordText);
    if (normalizedKeyword) {
      const key = scopePerformanceKey(performance.brandKey, performance.adProductType, performance.adgroupId, normalizedKeyword);
      performanceByScope.set(key, mergePerformance(performanceByScope.get(key), performance));
    }
  }

  const coverageByScope = new Map(input.coverageRows.map((coverage) => [coverageKey(coverage.brandKey, coverage.adProductType), coverage]));
  const candidates = input.keywords.map((keyword) => {
    const normalizedKeyword = normalizeKeywordText(keyword.keywordText);
    const performance =
      performanceByKeywordId.get(keyword.keywordId) ??
      performanceByScope.get(scopePerformanceKey(keyword.brandKey, keyword.adProductType, keyword.adgroupId, normalizedKeyword));
    const coverage = coverageByScope.get(coverageKey(keyword.brandKey, keyword.adProductType));
    const dataDays = performance?.dataDays ?? coverage?.actualDays ?? 0;
    const recommendation = getInitialRecommendation(keyword, performance, dataDays);
    return toCleanupCandidate(keyword, normalizedKeyword, performance, coverage, recommendation);
  });

  const duplicateGroups = buildDuplicateGroups(candidates);
  const duplicateKeywordIds = new Set(duplicateGroups.flatMap((group) => group.candidates.map((candidate) => candidate.keywordId)));
  const noClickCandidates = candidates
    .filter((candidate) => candidate.clicks365 === 0 && candidate.dataDays > 0)
    .map((candidate) => {
      if (duplicateKeywordIds.has(candidate.keywordId)) {
        return candidate;
      }

      const recommendation: SearchAdKeywordCleanupRecommendation =
        candidate.userLock === true ? "review" : candidate.dataDays >= 90 ? "pause_candidate" : "review";
      return {
        ...candidate,
        recommendation,
        recommendationLabel: RECOMMENDATION_LABELS[recommendation],
        reason:
          recommendation === "pause_candidate"
            ? `${candidate.dataDays.toLocaleString("ko-KR")}일치 저장 데이터에서 클릭이 없어 끄기 후보입니다.`
            : `${candidate.dataDays.toLocaleString("ko-KR")}일치 저장 데이터에서 클릭이 없습니다. 신규/시즌 키워드인지 먼저 확인합니다.`,
      };
    })
    .sort(compareCleanupCandidates)
    .slice(0, 100);

  return {
    filters: input.filters,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    summaryCards: [
      {
        key: "duplicate",
        label: "중복 묶음",
        value: `${duplicateGroups.length.toLocaleString("ko-KR")}건`,
        helper: "브랜드와 광고유형 안에서 같은 키워드가 여러 운영 위치에 들어간 경우",
      },
      {
        key: "duplicateKeywords",
        label: "중복 키워드",
        value: `${duplicateKeywordIds.size.toLocaleString("ko-KR")}개`,
        helper: "중복 묶음에 포함된 현재 등록 키워드 수",
      },
      {
        key: "noClick",
        label: "클릭 없음",
        value: `${noClickCandidates.length.toLocaleString("ko-KR")}개`,
        helper: "저장된 최근 성과 범위에서 클릭이 없는 키워드",
      },
      {
        key: "coverage",
        label: "성과 범위",
        value: getCoverageSummaryValue(input.coverageRows),
        helper: "백필이 쌓일수록 1년 기준 판단에 가까워집니다.",
      },
    ],
    duplicateGroups,
    noClickCandidates,
    coverageSummaries: input.coverageRows.map((coverage) => ({
      ...coverage,
      label: getCoverageLabel(coverage),
    })),
  };
}

export function normalizeKeywordText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function buildDuplicateGroups(candidates: SearchAdKeywordCleanupCandidate[]): SearchAdDuplicateKeywordGroup[] {
  const groups = new Map<string, SearchAdKeywordCleanupCandidate[]>();
  for (const candidate of candidates) {
    if (!candidate.normalizedKeyword) {
      continue;
    }
    const key = duplicateGroupKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  return Array.from(groups.entries())
    .flatMap(([key, groupCandidates]) => {
      if (groupCandidates.length < 2) {
        return [];
      }

      const sorted = [...groupCandidates].sort(compareBestKeywordFirst);
      const best = sorted[0];
      const adjusted = sorted.map((candidate) => adjustDuplicateRecommendation(candidate, best?.keywordId));
      return [
        {
          id: key,
          brandKey: adjusted[0].brandKey,
          adProductType: adjusted[0].adProductType,
          keywordText: adjusted[0].keywordText,
          normalizedKeyword: adjusted[0].normalizedKeyword,
          duplicateCount: adjusted.length,
          activeCount: adjusted.filter((candidate) => candidate.userLock !== true).length,
          totalClicks365: adjusted.reduce((sum, candidate) => sum + candidate.clicks365, 0),
          totalCost365: adjusted.reduce((sum, candidate) => sum + candidate.cost365, 0),
          bestKeywordId: best?.keywordId,
          recommendationSummary: getDuplicateRecommendationSummary(adjusted),
          candidates: adjusted.sort(compareCleanupCandidates),
        },
      ];
    })
    .sort((a, b) => b.duplicateCount - a.duplicateCount || b.totalCost365 - a.totalCost365 || a.keywordText.localeCompare(b.keywordText, "ko-KR"))
    .slice(0, 50);
}

function adjustDuplicateRecommendation(candidate: SearchAdKeywordCleanupCandidate, bestKeywordId: string | undefined): SearchAdKeywordCleanupCandidate {
  if (candidate.keywordId === bestKeywordId) {
    return {
      ...candidate,
      recommendation: "keep",
      recommendationLabel: RECOMMENDATION_LABELS.keep,
      reason: "같은 키워드 묶음에서 최근 성과가 가장 좋아 우선 유지 후보입니다.",
    };
  }

  const recommendation: SearchAdKeywordCleanupRecommendation =
    candidate.userLock === true ? "delete_candidate" : candidate.clicks365 === 0 && candidate.dataDays >= 90 ? "delete_candidate" : "pause_candidate";
  return {
    ...candidate,
    recommendation,
    recommendationLabel: RECOMMENDATION_LABELS[recommendation],
    reason:
      recommendation === "delete_candidate"
        ? "같은 키워드가 다른 위치에 있고 저장된 성과가 약해 삭제 후보입니다. 실제 삭제 전 시즌/랜딩 목적을 확인합니다."
        : "같은 키워드가 다른 위치에 있어 우선 끄기 후보입니다. 성과가 있는 경우 바로 삭제하지 않습니다.",
  };
}

function toCleanupCandidate(
  keyword: SearchAdKeywordStateForCleanup,
  normalizedKeyword: string,
  performance: SearchAdKeywordPerformanceForCleanup | undefined,
  coverage: SearchAdKeywordCoverageForCleanup | undefined,
  recommendation: SearchAdKeywordCleanupRecommendation,
): SearchAdKeywordCleanupCandidate {
  return {
    id: keyword.keywordId,
    brandKey: keyword.brandKey,
    adProductType: keyword.adProductType,
    keywordId: keyword.keywordId,
    keywordText: keyword.keywordText,
    normalizedKeyword,
    campaignId: keyword.campaignId,
    campaignName: keyword.campaignName,
    adgroupId: keyword.adgroupId,
    adgroupName: keyword.adgroupName,
    userLock: keyword.userLock,
    status: keyword.status,
    statusReason: keyword.statusReason,
    bidAmount: keyword.bidAmount,
    collectedAt: keyword.collectedAt,
    impressions365: performance?.impressions ?? 0,
    clicks365: performance?.clicks ?? 0,
    cost365: performance?.cost ?? 0,
    conversions365: performance?.conversions ?? 0,
    salesAmount365: performance?.salesAmount ?? 0,
    dataDays: performance?.dataDays ?? coverage?.actualDays ?? 0,
    reportStartDate: performance?.startDate ?? coverage?.startDate,
    reportEndDate: performance?.endDate ?? coverage?.endDate,
    recommendation,
    recommendationLabel: RECOMMENDATION_LABELS[recommendation],
    reason: getInitialReason(recommendation, performance?.dataDays ?? coverage?.actualDays ?? 0),
  };
}

function getInitialRecommendation(
  keyword: SearchAdKeywordStateForCleanup,
  performance: SearchAdKeywordPerformanceForCleanup | undefined,
  dataDays: number,
): SearchAdKeywordCleanupRecommendation {
  if (keyword.userLock === true) {
    return "review";
  }

  if (!performance || performance.clicks === 0) {
    return dataDays >= 90 ? "pause_candidate" : "review";
  }

  return "review";
}

function getInitialReason(recommendation: SearchAdKeywordCleanupRecommendation, dataDays: number) {
  if (recommendation === "pause_candidate") {
    return `${dataDays.toLocaleString("ko-KR")}일치 저장 데이터에서 클릭이 없어 끄기 후보입니다.`;
  }

  return "중복 여부, 시즌성, 랜딩 목적을 함께 확인합니다.";
}

function getDuplicateRecommendationSummary(candidates: SearchAdKeywordCleanupCandidate[]) {
  const removable = candidates.filter((candidate) => candidate.recommendation === "delete_candidate").length;
  const pause = candidates.filter((candidate) => candidate.recommendation === "pause_candidate").length;
  if (removable > 0) {
    return `${removable.toLocaleString("ko-KR")}개는 삭제 후보, ${pause.toLocaleString("ko-KR")}개는 끄기 후보입니다.`;
  }

  return `${pause.toLocaleString("ko-KR")}개는 우선 끄기 후보입니다. 성과가 있으면 바로 삭제하지 않습니다.`;
}

function compareBestKeywordFirst(a: SearchAdKeywordCleanupCandidate, b: SearchAdKeywordCleanupCandidate) {
  return (
    b.conversions365 - a.conversions365 ||
    b.salesAmount365 - a.salesAmount365 ||
    b.clicks365 - a.clicks365 ||
    a.cost365 - b.cost365 ||
    Number(a.userLock === true) - Number(b.userLock === true) ||
    a.keywordId.localeCompare(b.keywordId, "ko-KR")
  );
}

function compareCleanupCandidates(a: SearchAdKeywordCleanupCandidate, b: SearchAdKeywordCleanupCandidate) {
  const recommendationRank: Record<SearchAdKeywordCleanupRecommendation, number> = {
    delete_candidate: 0,
    pause_candidate: 1,
    review: 2,
    keep: 3,
  };
  return (
    recommendationRank[a.recommendation] - recommendationRank[b.recommendation] ||
    b.cost365 - a.cost365 ||
    b.impressions365 - a.impressions365 ||
    a.keywordText.localeCompare(b.keywordText, "ko-KR")
  );
}

function mergePerformance(
  current: SearchAdKeywordPerformanceForCleanup | undefined,
  next: SearchAdKeywordPerformanceForCleanup,
): SearchAdKeywordPerformanceForCleanup {
  if (!current) {
    return next;
  }

  return {
    ...current,
    impressions: current.impressions + next.impressions,
    clicks: current.clicks + next.clicks,
    cost: current.cost + next.cost,
    conversions: current.conversions + next.conversions,
    salesAmount: current.salesAmount + next.salesAmount,
    dataDays: Math.max(current.dataDays, next.dataDays),
    startDate: minDate(current.startDate, next.startDate),
    endDate: maxDate(current.endDate, next.endDate),
  };
}

function getCoverageSummaryValue(coverageRows: SearchAdKeywordCoverageForCleanup[]) {
  const maxDays = Math.max(0, ...coverageRows.map((coverage) => coverage.actualDays));
  if (maxDays >= 365) {
    return "1년";
  }
  if (maxDays > 0) {
    return `${maxDays.toLocaleString("ko-KR")}일`;
  }
  return "대기";
}

function getCoverageLabel(coverage: SearchAdKeywordCoverageForCleanup) {
  if (!coverage.startDate || !coverage.endDate) {
    return "성과 데이터 대기";
  }

  return `${coverage.startDate}~${coverage.endDate} · ${coverage.actualDays.toLocaleString("ko-KR")}일`;
}

function duplicateGroupKey(candidate: SearchAdKeywordCleanupCandidate) {
  return [candidate.brandKey, candidate.adProductType, candidate.normalizedKeyword].join(":");
}

function scopePerformanceKey(brandKey: BrandKey, adProductType: AdProductType, adgroupId: string | undefined, normalizedKeyword: string) {
  return [brandKey, adProductType, adgroupId ?? "", normalizedKeyword].join(":");
}

function coverageKey(brandKey: BrandKey, adProductType: AdProductType) {
  return `${brandKey}:${adProductType}`;
}

function minDate(a: string | undefined, b: string | undefined) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a <= b ? a : b;
}

function maxDate(a: string | undefined, b: string | undefined) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a >= b ? a : b;
}
