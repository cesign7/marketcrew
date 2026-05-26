import type { AdProductType, BrandKey, RuleCategory, SearchAdReportType } from "./types";

export const BRANDS: Array<{ key: BrandKey; label: string; description: string }> = [
  { key: "coffeeprint", label: "커피프린트", description: "쇼핑몰과 향후 스마트스토어까지 묶는 커피프린트 광고 운영 단위" },
  { key: "stickersee", label: "스티커씨", description: "스마트스토어 중심의 스티커씨 광고 운영 단위" },
];

export const AD_PRODUCTS: Array<{ key: AdProductType; label: string; description: string }> = [
  { key: "powerlink", label: "파워링크", description: "네이버 검색광고 키워드형 광고" },
  { key: "shopping_search", label: "쇼핑검색광고", description: "상품 노출 기반 쇼핑검색광고" },
];

export const REPORT_TYPE_LABELS: Record<SearchAdReportType, string> = {
  AD: "광고성과 보고서",
  AD_DETAIL: "광고성과 상세 보고서",
  AD_CONVERSION: "전환 보고서",
  AD_CONVERSION_DETAIL: "전환 상세 보고서",
  ADEXTENSION: "확장소재광고 성과 보고서",
  EXPKEYWORD: "파워링크 검색어 보고서",
  SHOPPINGKEYWORD_DETAIL: "쇼핑검색 검색어 상세 보고서",
  SHOPPINGKEYWORD_CONVERSION_DETAIL: "쇼핑검색 검색어 전환 상세 보고서",
  CRITERION: "타게팅 성과 보고서",
  CRITERION_CONVERSION: "타게팅 전환 보고서",
};

export const REPORT_TYPE_DESCRIPTIONS: Record<SearchAdReportType, string> = {
  AD: "캠페인, 광고그룹, 광고 단위의 기본 성과를 확인합니다.",
  AD_DETAIL: "광고 성과를 더 세밀하게 나눠 원인을 점검합니다.",
  AD_CONVERSION: "전환 유형별 구매와 행동 흐름을 확인합니다.",
  AD_CONVERSION_DETAIL: "전환을 더 자세히 나눠 구매 근거를 확인합니다.",
  ADEXTENSION: "확장소재별 클릭과 전환 흐름을 확인합니다.",
  EXPKEYWORD: "파워링크 확장 검색어 흐름을 확인합니다. 네이버 API reportTp는 EXPKEYWORD입니다.",
  SHOPPINGKEYWORD_DETAIL: "쇼핑검색광고에서 실제 유입된 검색어 성과를 확인합니다.",
  SHOPPINGKEYWORD_CONVERSION_DETAIL: "쇼핑검색광고 검색어별 전환과 매출을 확인합니다.",
  CRITERION: "기기, 시간대, 지역 같은 타게팅 성과를 확인합니다.",
  CRITERION_CONVERSION: "타게팅별 전환 흐름을 확인합니다.",
};

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  low_efficiency: "저효율",
  high_cpa: "높은 CPA",
  low_roas: "낮은 ROAS",
  no_click: "클릭 없음",
  good_performance: "우수",
  needs_review: "점검 필요",
};

export function getBrandLabel(value: BrandKey | "all") {
  if (value === "all") {
    return "전체";
  }

  return BRANDS.find((brand) => brand.key === value)?.label ?? value;
}

export function getAdProductLabel(value: AdProductType | "all") {
  if (value === "all") {
    return "전체";
  }

  return AD_PRODUCTS.find((product) => product.key === value)?.label ?? value;
}

export function getReportTypeLabel(reportType: SearchAdReportType) {
  return REPORT_TYPE_LABELS[reportType] ?? reportType;
}

export function inferAdProductFromReportType(reportType: SearchAdReportType): AdProductType {
  return reportType.startsWith("SHOPPING") ? "shopping_search" : "powerlink";
}

export function isSearchAdReportType(value: string): value is SearchAdReportType {
  return Object.prototype.hasOwnProperty.call(REPORT_TYPE_LABELS, value);
}
