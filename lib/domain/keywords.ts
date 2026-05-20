export type BrandKey = "COFFEEPRINT" | "STICKERSEE";

export type KeywordRuleType =
  | "BRAND_DEFENSE"
  | "TOP_1_DEFENSE"
  | "TOP_2_TO_3_OPTIMIZE"
  | "SEASONAL_TOP_TEST"
  | "PROFIT_BASED_BID"
  | "LOW_BID_KEEP"
  | "NEGATIVE_CANDIDATE"
  | "PAUSE_CANDIDATE"
  | "DISCOVERY_TEST";

export interface KeywordRule {
  id: string;
  brandKey: BrandKey;
  keyword: string;
  ruleType: KeywordRuleType;
  targetPositionLabel: string;
  maxCpc: number | null;
  currentAvgCpc: number;
  currentAvgRank: number;
  confidence: number;
  reason: string;
}
