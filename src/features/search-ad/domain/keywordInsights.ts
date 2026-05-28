import { getAdProductLabel, getBrandLabel } from "./reportTypes";
import { getSearchAdDeviceLabel } from "./targetDisplay";
import type { AdProductType, BrandKey, SearchAdFilters, SearchAdKeywordInsightSegment, SearchAdKeywordInsightView, SearchAdReportType } from "./types";

export type SearchAdKeywordInsightSourceSegment = {
  brandKey: BrandKey;
  adProductType: AdProductType;
  targetLabel: string;
  targetKind: "registered_keyword" | "search_term" | "ad";
  keywordId?: string;
  keywordText?: string;
  searchTerm?: string;
  adId?: string;
  campaignId?: string;
  campaignName?: string;
  adgroupId?: string;
  adgroupName?: string;
  device?: string;
  mediaId?: string;
  mediaLabel?: string;
  mediaNetworkLabel?: string;
  hourCode?: string;
  regionCode?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  dataDays: number;
  reportStartDate?: string;
  reportEndDate?: string;
  reportsUsed: SearchAdReportType[];
};

export function buildSearchAdKeywordInsightView(input: {
  filters: SearchAdFilters;
  generatedAt?: string;
  segments: SearchAdKeywordInsightSourceSegment[];
}): SearchAdKeywordInsightView {
  const totalCost = sum(input.segments.map((segment) => segment.cost));
  const normalizedSegments = input.segments.map((segment) => normalizeSegment(segment, totalCost));
  const bestSegments = normalizedSegments
    .filter((segment) => segment.recommendation === "scale" || segment.recommendation === "keep")
    .sort((a, b) => compareBestSegment(a, b))
    .slice(0, 20);
  const wasteSegments = normalizedSegments
    .filter((segment) => segment.recommendation === "narrow")
    .sort((a, b) => compareWasteSegment(a, b))
    .slice(0, 20);
  const watchSegments = normalizedSegments
    .filter((segment) => segment.recommendation === "watch")
    .sort((a, b) => compareWatchSegment(a, b))
    .slice(0, 20);

  return {
    filters: input.filters,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    summaryCards: [
      {
        key: "segments",
        label: "분석 조합",
        value: `${normalizedSegments.length.toLocaleString("ko-KR")}개`,
        helper: "키워드, 기기, 매체, 시간대 조합",
      },
      {
        key: "best",
        label: "효율 우수",
        value: `${bestSegments.length.toLocaleString("ko-KR")}개`,
        helper: "표본 조건을 통과한 확장 후보",
      },
      {
        key: "waste",
        label: "축소 후보",
        value: `${wasteSegments.length.toLocaleString("ko-KR")}개`,
        helper: "비용이 쌓였지만 전환 효율이 낮은 조합",
      },
      {
        key: "cost",
        label: "분석 비용",
        value: formatWon(totalCost),
        helper: "현재 필터 범위의 세그먼트 합계",
      },
    ],
    bestSegments,
    wasteSegments,
    watchSegments,
    methodology: [
      {
        title: "공식 보고서 기준",
        description: "기기, 매체, 시간대/지역 세부 성과는 상세 보고서를 보조 축으로 쓰고 전환 판단은 전환 제공 보고서와 함께 봅니다.",
      },
      {
        title: "충분한 표본 우선",
        description: "클릭 20회 또는 비용 2만원 이상, 전환 3건 이상이면 신뢰도 높음으로 봅니다. 표본이 작으면 관찰 후보로 남깁니다.",
      },
      {
        title: "비용 비중 반영",
        description: "ROAS가 좋아도 비용 비중이 작으면 바로 확장하지 않고, 비용이 큰 저효율 조합부터 좁히는 순서로 봅니다.",
      },
      {
        title: "자동 실행 금지",
        description: "이 화면은 분석 전용입니다. 입찰, 시간대, 매체 조정은 별도 미리보기와 대표 승인 후에만 실행합니다.",
      },
    ],
  };
}

function normalizeSegment(segment: SearchAdKeywordInsightSourceSegment, totalCost: number): SearchAdKeywordInsightSegment {
  const cpa = segment.conversions > 0 ? segment.cost / segment.conversions : null;
  const ctr = segment.impressions > 0 ? (segment.clicks / segment.impressions) * 100 : null;
  const conversionRate = segment.clicks > 0 ? (segment.conversions / segment.clicks) * 100 : null;
  const roas = segment.cost > 0 ? (segment.salesAmount / segment.cost) * 100 : null;
  const costShare = totalCost > 0 ? (segment.cost / totalCost) * 100 : 0;
  const reliability = getReliability(segment);
  const recommendation = getRecommendation(segment, roas, reliability);

  return {
    ...segment,
    id: [
      segment.brandKey,
      segment.adProductType,
      segment.targetKind,
      segment.searchTerm ?? segment.keywordId ?? segment.keywordText ?? segment.adId ?? segment.targetLabel,
      segment.device ?? "all-device",
      segment.mediaId ?? "all-media",
      segment.hourCode ?? "all-hour",
      segment.regionCode ?? "all-region",
    ].join("|"),
    deviceLabel: getSearchAdDeviceLabel(segment.device) ?? "전체 기기",
    mediaLabel: segment.mediaLabel ?? (segment.mediaId ? `매체 ID ${segment.mediaId}` : "전체 매체"),
    hourLabel: getHourLabel(segment.hourCode),
    regionLabel: getRegionLabel(segment.regionCode),
    cpa,
    ctr,
    conversionRate,
    roas,
    costShare,
    reliability,
    recommendation,
    recommendationLabel: getRecommendationLabel(recommendation),
    reason: getReason(segment, recommendation, roas, costShare),
  };
}

function getReliability(segment: SearchAdKeywordInsightSourceSegment) {
  if ((segment.clicks >= 20 || segment.cost >= 20_000) && segment.conversions >= 3) {
    return "high" as const;
  }
  if (segment.clicks >= 10 || segment.cost >= 10_000) {
    return "medium" as const;
  }
  return "low" as const;
}

function getRecommendation(segment: SearchAdKeywordInsightSourceSegment, roas: number | null, reliability: "high" | "medium" | "low") {
  if (segment.conversions === 0 && (segment.clicks >= 20 || segment.cost >= 20_000)) {
    return "narrow" as const;
  }
  if (roas !== null && roas >= 350 && reliability === "high") {
    return "scale" as const;
  }
  if (roas !== null && roas >= 250 && reliability !== "low") {
    return "keep" as const;
  }
  if (segment.cost >= 20_000 && (roas === null || roas < 180)) {
    return "narrow" as const;
  }
  return "watch" as const;
}

function getRecommendationLabel(recommendation: SearchAdKeywordInsightSegment["recommendation"]) {
  const labels = {
    keep: "유지",
    narrow: "축소 검토",
    scale: "확장 검토",
    watch: "관찰",
  } satisfies Record<SearchAdKeywordInsightSegment["recommendation"], string>;
  return labels[recommendation];
}

function getReason(segment: SearchAdKeywordInsightSourceSegment, recommendation: SearchAdKeywordInsightSegment["recommendation"], roas: number | null, costShare: number) {
  const base = `${segment.targetLabel} · ${getBrandLabel(segment.brandKey)} · ${getAdProductLabel(segment.adProductType)}`;
  if (recommendation === "scale") {
    return `${base} 조합은 전환 ${segment.conversions.toLocaleString("ko-KR")}건, ROAS ${formatPercent(roas)}로 확장 후보입니다. 비용 비중은 ${formatPercent(costShare)}입니다.`;
  }
  if (recommendation === "keep") {
    return `${base} 조합은 목표 이상 성과가 있어 유지 후보입니다. 표본이 더 쌓이면 확장 여부를 다시 봅니다.`;
  }
  if (recommendation === "narrow") {
    return `${base} 조합은 비용 ${formatWon(segment.cost)} 대비 전환 효율이 낮아 입찰, 시간대, 매체 축소를 검토합니다.`;
  }
  return `${base} 조합은 표본이 아직 작아 바로 조정하지 않고 관찰합니다.`;
}

function getHourLabel(hourCode: string | undefined) {
  if (!hourCode) {
    return "전체 시간대";
  }
  const parsed = Number(hourCode);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 23) {
    return `${String(parsed).padStart(2, "0")}시~${String((parsed + 1) % 24).padStart(2, "0")}시`;
  }
  return `시간대 코드 ${hourCode}`;
}

function getRegionLabel(regionCode: string | undefined) {
  return regionCode ? `지역 코드 ${regionCode}` : "전체 지역";
}

function compareBestSegment(a: SearchAdKeywordInsightSegment, b: SearchAdKeywordInsightSegment) {
  return compareReliability(a, b) || (b.roas ?? -1) - (a.roas ?? -1) || b.conversions - a.conversions || b.cost - a.cost;
}

function compareWasteSegment(a: SearchAdKeywordInsightSegment, b: SearchAdKeywordInsightSegment) {
  return b.cost - a.cost || b.clicks - a.clicks || (a.roas ?? 0) - (b.roas ?? 0);
}

function compareWatchSegment(a: SearchAdKeywordInsightSegment, b: SearchAdKeywordInsightSegment) {
  return b.cost - a.cost || b.clicks - a.clicks || b.impressions - a.impressions;
}

function compareReliability(a: SearchAdKeywordInsightSegment, b: SearchAdKeywordInsightSegment) {
  const score = { high: 3, medium: 2, low: 1 } as const;
  return score[b.reliability] - score[a.reliability];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 10) / 10}%`;
}
