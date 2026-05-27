import type { AdProductType, BrandKey, SearchAdRuleActionIntent } from "./types";

export type SearchAdOperationStrategyType = "standard" | "seasonal_expansion";

export type SearchAdOperationStrategy = {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  scopeLabel: string;
  strategyType: SearchAdOperationStrategyType;
  initialScheduleLabel: string;
  minimumDataDays: number;
  minimumClicks: number;
  minimumCost: number;
  narrowingRule: string;
  approvalRule: string;
};

export type ApprovalDelegationPolicy = {
  actionIntent: SearchAdRuleActionIntent;
  title: string;
  firstRunOwner: "representative";
  repeatRunOwner: "representative" | "moa";
  requiresPreview: boolean;
  guardrail: string;
};

export const DEFAULT_SEARCH_AD_OPERATION_STRATEGIES: SearchAdOperationStrategy[] = [
  {
    id: "strategy-coffeeprint-powerlink",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    scopeLabel: "커피프린트 파워링크 기본",
    strategyType: "standard",
    initialScheduleLabel: "운영시간 기준",
    minimumDataDays: 7,
    minimumClicks: 40,
    minimumCost: 30000,
    narrowingRule: "전환 기준이 확정될 때까지 회원가입, 시안완료, 주문 전환을 분리해서 봅니다.",
    approvalRule: "전환 세팅 확정 전에는 모든 축소/중지 제안을 대표 승인으로 둡니다.",
  },
  {
    id: "strategy-stickersee-season-powerlink",
    brandKey: "stickersee",
    adProductType: "powerlink",
    scopeLabel: "스티커씨 시즌 그룹",
    strategyType: "seasonal_expansion",
    initialScheduleLabel: "넓게 열고 시작",
    minimumDataDays: 7,
    minimumClicks: 50,
    minimumCost: 30000,
    narrowingRule: "시즌 초반에는 넓게 노출하고, 충분한 클릭과 비용이 쌓인 뒤 시간대, 기기, 검색어를 좁힙니다.",
    approvalRule: "처음 적용은 대표 승인, 같은 조건이 2회 이상 반복되면 모아 위임 후보로 올립니다.",
  },
  {
    id: "strategy-stickersee-shopping",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    scopeLabel: "스티커씨 쇼핑검색",
    strategyType: "seasonal_expansion",
    initialScheduleLabel: "상품 적합도 먼저 확인",
    minimumDataDays: 7,
    minimumClicks: 30,
    minimumCost: 20000,
    narrowingRule: "검색어와 상품명, 이미지, 랜딩 적합도를 먼저 확인한 뒤 시간대 축소를 판단합니다.",
    approvalRule: "상품 연결이 불명확하면 자동 축소하지 않고 랜딩 점검 카드로 올립니다.",
  },
];

export const APPROVAL_DELEGATION_POLICIES: ApprovalDelegationPolicy[] = [
  {
    actionIntent: "negative_keyword",
    title: "제외어 후보",
    firstRunOwner: "representative",
    repeatRunOwner: "moa",
    requiresPreview: true,
    guardrail: "방어 키워드, 브랜드 키워드, 시즌 준비 키워드는 자동 제외하지 않습니다.",
  },
  {
    actionIntent: "bid_adjustment",
    title: "입찰 조정",
    firstRunOwner: "representative",
    repeatRunOwner: "moa",
    requiresPreview: true,
    guardrail: "최소 비용과 클릭 기준을 넘긴 항목만 조정 후보로 올립니다.",
  },
  {
    actionIntent: "targeting_adjustment",
    title: "시간대·기기 조정",
    firstRunOwner: "representative",
    repeatRunOwner: "moa",
    requiresPreview: true,
    guardrail: "시간대 축소는 넓게 연 기간, 요일별 차이, PC/모바일 차이를 함께 본 뒤 제안합니다.",
  },
  {
    actionIntent: "keyword_expand",
    title: "키워드 추가",
    firstRunOwner: "representative",
    repeatRunOwner: "representative",
    requiresPreview: true,
    guardrail: "새 키워드 등록은 실제 광고비가 늘 수 있으므로 위임 전까지 대표 승인으로 유지합니다.",
  },
  {
    actionIntent: "shopping_expand",
    title: "상품 확장",
    firstRunOwner: "representative",
    repeatRunOwner: "representative",
    requiresPreview: true,
    guardrail: "상품명, 이미지, 랜딩 URL이 연결된 뒤에만 확장 후보로 봅니다.",
  },
];

const APPROVAL_POLICY_BY_INTENT = new Map(APPROVAL_DELEGATION_POLICIES.map((policy) => [policy.actionIntent, policy]));

export function getApprovalDelegationPolicy(actionIntent: SearchAdRuleActionIntent): ApprovalDelegationPolicy | undefined {
  return APPROVAL_POLICY_BY_INTENT.get(actionIntent);
}

export function getOperationStrategySummary(strategy: SearchAdOperationStrategy) {
  return `${strategy.initialScheduleLabel} · 최소 ${strategy.minimumDataDays.toLocaleString("ko-KR")}일, 클릭 ${strategy.minimumClicks.toLocaleString("ko-KR")}회, 비용 ${strategy.minimumCost.toLocaleString("ko-KR")}원 뒤 판단`;
}

export function sortSearchAdOperationStrategies(strategies: SearchAdOperationStrategy[]) {
  return [...strategies].sort((left, right) => {
    const brand = left.brandKey.localeCompare(right.brandKey);
    if (brand !== 0) {
      return brand;
    }

    const adProduct = left.adProductType.localeCompare(right.adProductType);
    if (adProduct !== 0) {
      return adProduct;
    }

    return left.id.localeCompare(right.id);
  });
}

export function normalizeSearchAdOperationStrategyInput(input: Record<string, unknown>): SearchAdOperationStrategy {
  const inputId = typeof input.id === "string" && input.id.trim().length > 0 ? input.id.trim() : undefined;
  const defaultStrategy = inputId ? DEFAULT_SEARCH_AD_OPERATION_STRATEGIES.find((strategy) => strategy.id === inputId) : undefined;
  const brandKey = parseBrandKey(input.brandKey) ?? defaultStrategy?.brandKey;
  const adProductType = parseAdProductType(input.adProductType) ?? defaultStrategy?.adProductType;
  const strategyType = parseStrategyType(input.strategyType) ?? defaultStrategy?.strategyType ?? "standard";
  const minimumDataDays = parsePositiveInteger(input.minimumDataDays);
  const minimumClicks = parsePositiveInteger(input.minimumClicks);
  const minimumCost = parsePositiveNumber(input.minimumCost);

  if (!defaultStrategy && !inputId) {
    throw new Error("운영 전략 ID가 필요합니다.");
  }

  if (!brandKey || !adProductType) {
    throw new Error("브랜드와 광고유형을 확인해 주세요.");
  }

  if (minimumDataDays === undefined || minimumDataDays < 1 || minimumDataDays > 120) {
    throw new Error("최소 판단 기간은 1~120일 사이로 입력해 주세요.");
  }

  if (minimumClicks === undefined || minimumClicks < 1) {
    throw new Error("최소 클릭은 1회 이상으로 입력해 주세요.");
  }

  if (minimumCost === undefined || minimumCost < 0) {
    throw new Error("최소 비용은 0원 이상으로 입력해 주세요.");
  }

  return {
    id: inputId ?? defaultStrategy?.id ?? "",
    brandKey,
    adProductType,
    scopeLabel: stringOrDefault(input.scopeLabel, defaultStrategy?.scopeLabel ?? "운영 전략"),
    strategyType,
    initialScheduleLabel: stringOrDefault(input.initialScheduleLabel, defaultStrategy?.initialScheduleLabel ?? "기본 기준"),
    minimumDataDays,
    minimumClicks,
    minimumCost,
    narrowingRule: stringOrDefault(input.narrowingRule, defaultStrategy?.narrowingRule ?? "충분한 데이터가 쌓인 뒤 조정합니다."),
    approvalRule: stringOrDefault(input.approvalRule, defaultStrategy?.approvalRule ?? "처음 실행은 대표 승인으로 둡니다."),
  };
}

function parseBrandKey(value: unknown): BrandKey | undefined {
  return value === "coffeeprint" || value === "stickersee" ? value : undefined;
}

function parseAdProductType(value: unknown): AdProductType | undefined {
  return value === "powerlink" || value === "shopping_search" ? value : undefined;
}

function parseStrategyType(value: unknown): SearchAdOperationStrategyType | undefined {
  return value === "standard" || value === "seasonal_expansion" ? value : undefined;
}

function parsePositiveInteger(value: unknown) {
  const parsed = parsePositiveNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

function parsePositiveNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
