import type { SearchAdRuleResult } from "./types";

export type RuleResultMetricBadge = {
  label: string;
  value: string;
};

export type RuleResultActionCandidate = {
  label: string;
  description: string;
};

export type RuleResultContextBadge = {
  label: string;
  value: string;
};

export function getRuleResultDiagnosis(result: SearchAdRuleResult) {
  const clicks = metricNumber(result, "clicks");
  const cost = metricNumber(result, "cost");
  const conversions = metricNumber(result, "conversions");
  const impressions = metricNumber(result, "impressions");
  const salesAmount = metricNumber(result, "salesAmount");
  const cpa = metricNumber(result, "cpa");
  const roas = metricNumber(result, "roas");

  switch (result.category) {
    case "low_efficiency":
      return `${formatCount(clicks, "클릭")}과 ${formatWonText(cost)} 비용이 있으나 전환이 없습니다.`;
    case "high_cpa":
      return `전환은 있으나 구매비용이 ${formatWonText(cpa)}로 높습니다.`;
    case "low_roas":
      return `매출 ${formatWonText(salesAmount)} 대비 광고수익률이 ${formatPercentText(roas)}로 낮습니다.`;
    case "no_click":
      return `${formatCount(impressions, "노출")}이 있으나 클릭이 없습니다.`;
    case "good_performance":
      return `${formatCount(conversions, "전환")}과 매출 ${formatWonText(salesAmount)}가 확인된 확장 후보입니다.`;
    case "needs_review":
      return result.reason || "필수 데이터 또는 연결 대상이 부족해 점검이 먼저 필요합니다.";
    default:
      return result.reason;
  }
}

export function getRuleResultActionCandidate(result: SearchAdRuleResult): RuleResultActionCandidate {
  const label = stringFromEvidence(result.evidencePacket.actionIntentLabel);
  const description = stringFromEvidence(result.evidencePacket.actionIntentDescription);
  if (label && description) {
    return { label, description };
  }

  return {
    label: fallbackActionCandidateLabel(result),
    description: getRuleResultRecommendedAction(result),
  };
}

export function getRuleResultContextBadges(result: SearchAdRuleResult): RuleResultContextBadge[] {
  const badges: RuleResultContextBadge[] = [];
  const deviceLabel = stringFromEvidence(result.evidencePacket.deviceLabel);
  const seasonHint = stringFromEvidence(result.evidencePacket.seasonHint);
  const measurementStatusLabel = stringFromEvidence(result.evidencePacket.measurementStatusLabel);

  if (deviceLabel) {
    badges.push({ label: "기기", value: deviceLabel });
  }

  if (seasonHint) {
    badges.push({ label: "시즌/행사", value: seasonHint });
  }

  if (measurementStatusLabel && measurementStatusLabel !== "전환 기준 사용 가능") {
    badges.push({ label: "전환 기준", value: measurementStatusLabel });
  }

  return badges;
}

export function getRuleResultMetricBadges(result: SearchAdRuleResult): RuleResultMetricBadge[] {
  const base = [
    { label: "비용", value: formatWonText(metricNumber(result, "cost")) },
    { label: "클릭", value: formatCount(metricNumber(result, "clicks"), "회") },
    { label: "전환", value: formatCount(metricNumber(result, "conversions"), "건") },
  ];

  if (result.category === "no_click") {
    return [{ label: "노출", value: formatCount(metricNumber(result, "impressions"), "회") }, ...base.slice(1, 2)];
  }

  if (result.category === "high_cpa") {
    return [...base, { label: "CPA", value: formatWonText(metricNumber(result, "cpa")) }];
  }

  if (result.category === "low_roas" || result.category === "good_performance") {
    return [
      ...base,
      { label: "매출", value: formatWonText(metricNumber(result, "salesAmount")) },
      { label: "ROAS", value: formatPercentText(metricNumber(result, "roas")) },
    ];
  }

  return base;
}

export function getRuleResultRecommendedAction(result: SearchAdRuleResult) {
  const actionIntent = stringFromEvidence(result.evidencePacket.actionIntent);
  if (actionIntent === "negative_keyword") {
    return "제외어 등록 후보인지 확인하고, 유지해야 할 검색어면 입찰만 낮춥니다.";
  }
  if (actionIntent === "landing_check") {
    return "광고 문구, 상품명, 대표 이미지, 랜딩 상품이 검색 의도와 맞는지 확인합니다.";
  }
  if (actionIntent === "keyword_expand") {
    return "등록 키워드와 유사 키워드로 확장하되 예산은 소액부터 시작합니다.";
  }
  if (actionIntent === "targeting_adjustment") {
    return "기기, 성별, 연령, 시간대별 성과 차이를 보고 입찰 조정을 검토합니다.";
  }
  if (actionIntent === "data_check") {
    return "전환매출, 주문 금액 전달, 보고서 수집 상태를 먼저 점검합니다.";
  }
  if (actionIntent === "conversion_check") {
    return "전환 코드, 전환 유형, 전환매출 전달이 정상인지 먼저 확인합니다.";
  }

  switch (result.category) {
    case "low_efficiency":
      return "입찰 하향, 제외어 후보, 랜딩 적합도 순서로 점검";
    case "high_cpa":
      return "입찰 하향 또는 예산 축소 후 전환 단가 재확인";
    case "low_roas":
      return "매출 추적 정상 여부 확인 후 예산 유지 여부 판단";
    case "no_click":
      return "문구, 상품명, 대표 이미지, 입찰 순위 점검";
    case "good_performance":
      return "예산 확대, 유사 키워드 확장, 상품 연결 검토";
    case "needs_review":
      return "수집 상태와 광고그룹/소재/검색어 연결부터 확인";
    default:
      return "상세 근거를 확인한 뒤 조치";
  }
}

export function getRuleResultPreApplyChecks(result: SearchAdRuleResult) {
  const checks = ["전환 추적 코드가 정상인지 확인", "같은 브랜드 안에서만 판단", "최근 수집 일수와 기준 기간 차이 확인"];

  if (result.category === "low_efficiency") {
    return ["주문이 늦게 잡히는 상품인지 확인", "유지해야 하는 방어 키워드인지 확인", ...checks];
  }

  if (result.category === "low_roas" || result.category === "high_cpa") {
    return ["전환금액 누락 여부 확인", "객단가가 높은 상품군인지 확인", ...checks];
  }

  if (result.category === "good_performance") {
    return ["재고와 마진을 확인", "예산 확대 시 CPA가 유지되는지 확인", ...checks];
  }

  return checks;
}

export function metricNumber(result: SearchAdRuleResult, key: string) {
  const value = result.metrics[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function formatWonText(value: number | undefined) {
  return value === undefined || value === null ? "-" : `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatCount(value: number | undefined, suffix: string) {
  return value === undefined ? "-" : `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function formatPercentText(value: number | undefined) {
  return value === undefined ? "-" : `${Math.round(value * 10) / 10}%`;
}

function fallbackActionCandidateLabel(result: SearchAdRuleResult) {
  switch (result.category) {
    case "low_efficiency":
      return result.adProductType === "shopping_search" ? "랜딩 점검 후보" : "제외어 후보";
    case "high_cpa":
    case "low_roas":
      return "입찰 조정 후보";
    case "no_click":
      return "노출 적합도 점검";
    case "good_performance":
      return result.adProductType === "shopping_search" ? "상품 확장 후보" : "키워드 추가 후보";
    case "needs_review":
      return "전환 점검 후보";
    default:
      return "운영 점검 후보";
  }
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
