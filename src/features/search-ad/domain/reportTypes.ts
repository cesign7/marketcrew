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
  ADEXTENSION: "확장소재별 노출, 클릭, 비용 흐름을 확인합니다.",
  EXPKEYWORD: "파워링크 확장 검색어 흐름을 확인합니다. 네이버 API reportTp는 EXPKEYWORD입니다.",
  SHOPPINGKEYWORD_DETAIL: "쇼핑검색광고에서 실제 유입된 검색어 성과를 확인합니다.",
  SHOPPINGKEYWORD_CONVERSION_DETAIL: "쇼핑검색광고 검색어별 전환과 매출을 확인합니다.",
  CRITERION: "기기, 시간대, 지역 같은 타게팅 성과를 확인합니다.",
  CRITERION_CONVERSION: "타게팅별 전환 흐름을 확인합니다.",
};

export type SearchAdReportTypeGuide = {
  caution: string;
  focus: string;
  includes: string;
  useFor: string;
};

export const REPORT_TYPE_GUIDES: Record<SearchAdReportType, SearchAdReportTypeGuide> = {
  AD: {
    caution: "검색어 원인은 이 보고서만으로 단정하지 않고 검색어 보고서와 함께 봅니다.",
    focus: "캠페인, 광고그룹, 소재 단위의 기본 성과를 봅니다.",
    includes: "노출, 클릭, 비용, 평균 순위, 상태",
    useFor: "캠페인이나 광고그룹 전체 예산, 입찰, 노출 상태 점검",
  },
  AD_DETAIL: {
    caution: "세부 코드가 많아 원문 ID보다 연결 대상 이름과 함께 해석해야 합니다.",
    focus: "광고 성과를 세부 구분으로 나눠 원인을 좁혀 봅니다.",
    includes: "세부 구분, 세부 코드, 매체, 기기, 비용, 클릭",
    useFor: "특정 소재, 매체, 기기 쪽에서 비용이 새는지 확인",
  },
  AD_CONVERSION: {
    caution: "전환 추적이 누락되면 실제 주문이 있어도 0으로 보일 수 있습니다.",
    focus: "광고 단위의 전환과 전환매출을 봅니다.",
    includes: "전환 방식, 전환 유형, 전환수, 전환매출",
    useFor: "ROAS, CPA, 구매 전환 기준의 유지/축소 판단",
  },
  AD_CONVERSION_DETAIL: {
    caution: "상세 구분이 많아 광고성과 상세 보고서와 함께 봐야 원인이 선명해집니다.",
    focus: "전환 성과를 더 작은 구분으로 쪼개 봅니다.",
    includes: "세부 구분, 전환 방식, 전환 유형, 전환수, 전환매출",
    useFor: "전환은 있으나 어떤 조건에서 발생했는지 확인",
  },
  ADEXTENSION: {
    caution: "쇼핑검색광고 확장소재는 이 보고서만으로 비효율을 판단하지 않고 확장소재 전환 보고서가 연결된 뒤 봅니다.",
    focus: "전화, 추가 링크 같은 확장소재의 노출, 클릭, 비용 흐름을 봅니다.",
    includes: "확장소재, 노출, 클릭, 비용, 평균 순위",
    useFor: "파워링크 확장소재 점검, 쇼핑검색광고 확장소재는 참고 지표 확인",
  },
  EXPKEYWORD: {
    caution: "파워링크 검색어 보고서입니다. 쇼핑검색광고 검색어와 섞어 판단하지 않습니다.",
    focus: "파워링크에서 실제 유입된 검색어를 봅니다.",
    includes: "검색어, 기기, 클릭, 비용, 전환, 전환매출",
    useFor: "제외어 후보, 키워드 확장, 클릭은 있는데 주문 없는 검색어 점검",
  },
  SHOPPINGKEYWORD_DETAIL: {
    caution: "상품명, 이미지, 랜딩 적합도와 함께 봐야 합니다.",
    focus: "쇼핑검색광고에서 실제 유입된 검색어 성과를 봅니다.",
    includes: "쇼핑 검색어, 상품 광고 ID, 노출, 클릭, 비용",
    useFor: "상품 노출 검색어 점검, 랜딩/상품명 적합도 확인",
  },
  SHOPPINGKEYWORD_CONVERSION_DETAIL: {
    caution: "전환 금액이 비어 있으면 쇼핑검색 추적 설정을 함께 점검합니다.",
    focus: "쇼핑검색광고 검색어별 전환과 매출을 봅니다.",
    includes: "쇼핑 검색어, 전환 방식, 전환 유형, 전환수, 전환매출",
    useFor: "쇼핑검색광고 ROAS와 전환 검색어 확장 판단",
  },
  CRITERION: {
    caution: "GNF, AG3539 같은 코드는 여성, 연령대, 시간대 같은 타게팅 의미로 번역해 봐야 합니다.",
    focus: "기기, 성별, 연령, 시간대 같은 타게팅 성과를 봅니다.",
    includes: "타게팅 ID, 기기, 노출, 클릭, 비용",
    useFor: "PC/모바일, 성별, 연령대, 시간대별 비용 낭비 점검",
  },
  CRITERION_CONVERSION: {
    caution: "성과 보고서와 전환 보고서를 같이 봐야 클릭 대비 전환 차이가 보입니다.",
    focus: "타게팅별 전환과 매출을 봅니다.",
    includes: "타게팅 ID, 전환 방식, 전환 유형, 전환수, 전환매출",
    useFor: "기기/시간대/연령대별 전환 차이와 입찰 조정 판단",
  },
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

export function getReportTypeGuide(reportType: SearchAdReportType) {
  return REPORT_TYPE_GUIDES[reportType];
}

export function inferAdProductFromReportType(reportType: SearchAdReportType): AdProductType {
  return reportType.startsWith("SHOPPING") ? "shopping_search" : "powerlink";
}

export function isSearchAdReportType(value: string): value is SearchAdReportType {
  return Object.prototype.hasOwnProperty.call(REPORT_TYPE_LABELS, value);
}
