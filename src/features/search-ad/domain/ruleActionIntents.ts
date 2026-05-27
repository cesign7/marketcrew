import type { RuleActionIntentFilter, SearchAdRuleActionIntent, SearchAdRuleResult } from "./types";

export type RuleActionIntentOption = {
  key: SearchAdRuleActionIntent;
  label: string;
  description: string;
};

export const RULE_ACTION_INTENTS: RuleActionIntentOption[] = [
  {
    key: "data_check",
    label: "데이터 점검",
    description: "전환매출, 연결 대상, 수집 상태를 먼저 확인합니다.",
  },
  {
    key: "negative_keyword",
    label: "제외어 후보",
    description: "방어 검색어가 아니면 제외어 또는 입찰 하향을 검토합니다.",
  },
  {
    key: "landing_check",
    label: "랜딩 점검",
    description: "검색어와 상품명, 이미지, 랜딩 적합도를 확인합니다.",
  },
  {
    key: "bid_adjustment",
    label: "입찰 조정",
    description: "목표 CPA와 ROAS 기준으로 입찰과 예산을 조정합니다.",
  },
  {
    key: "keyword_expand",
    label: "키워드 추가",
    description: "성과가 확인된 검색어를 등록 키워드 후보로 봅니다.",
  },
  {
    key: "shopping_expand",
    label: "상품 확장",
    description: "성과 검색어와 맞는 상품, 이미지, 예산 확대를 검토합니다.",
  },
  {
    key: "targeting_adjustment",
    label: "타게팅 조정",
    description: "기기, 성별, 연령, 시간대별 입찰과 노출 조건을 봅니다.",
  },
  {
    key: "fit_check",
    label: "노출 점검",
    description: "노출은 있으나 클릭이 없을 때 문구, 상품명, 순위를 확인합니다.",
  },
  {
    key: "operation_check",
    label: "운영 점검",
    description: "상세 근거를 확인한 뒤 조치 방향을 정합니다.",
  },
];

const RULE_ACTION_INTENT_BY_KEY = new Map(RULE_ACTION_INTENTS.map((option) => [option.key, option]));

export function isRuleActionIntent(value: unknown): value is SearchAdRuleActionIntent {
  return typeof value === "string" && RULE_ACTION_INTENT_BY_KEY.has(value as SearchAdRuleActionIntent);
}

export function parseRuleActionIntentFilter(value: string | undefined): RuleActionIntentFilter {
  return isRuleActionIntent(value) ? value : "all";
}

export function getRuleActionIntentOption(key: SearchAdRuleActionIntent): RuleActionIntentOption {
  return RULE_ACTION_INTENT_BY_KEY.get(key) ?? RULE_ACTION_INTENTS[RULE_ACTION_INTENTS.length - 1];
}

export function getRuleActionIntentLabel(key: RuleActionIntentFilter) {
  return key === "all" ? "전체" : getRuleActionIntentOption(key).label;
}

export function getRuleResultActionIntentKey(result: SearchAdRuleResult): SearchAdRuleActionIntent {
  const evidenceIntent = result.evidencePacket.actionIntent;
  if (isRuleActionIntent(evidenceIntent)) {
    return evidenceIntent;
  }

  if (result.category === "needs_review") {
    return "data_check";
  }

  if (result.targetType === "criterion") {
    return "targeting_adjustment";
  }

  if (result.category === "low_efficiency" && result.targetType === "search_term") {
    return result.adProductType === "shopping_search" ? "landing_check" : "negative_keyword";
  }

  if (result.category === "high_cpa" || result.category === "low_roas") {
    return "bid_adjustment";
  }

  if (result.category === "good_performance" && result.targetType === "search_term") {
    return result.adProductType === "shopping_search" ? "shopping_expand" : "keyword_expand";
  }

  if (result.category === "no_click") {
    return "fit_check";
  }

  return "operation_check";
}
