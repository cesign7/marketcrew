import type { SearchAdReportType } from "./types";

export type SearchAdReportColumn = {
  key: string;
  label: string;
  description: string;
  numeric?: boolean;
};

export const SEARCH_AD_REPORT_PARSER_VERSION = "search-ad-report-parser-v1";

const commonPerformanceColumns: SearchAdReportColumn[] = [
  { key: "campaignName", label: "캠페인명", description: "네이버 광고 캠페인 이름" },
  { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
  { key: "targetName", label: "대상명", description: "광고, 키워드, 검색어, 타게팅 등 보고서의 주요 대상" },
  { key: "impressions", label: "노출수", description: "광고가 노출된 횟수", numeric: true },
  { key: "clicks", label: "클릭수", description: "광고 클릭 횟수", numeric: true },
  { key: "cost", label: "비용", description: "광고비 합계", numeric: true },
  { key: "ctr", label: "클릭률", description: "노출 대비 클릭 비율", numeric: true },
  { key: "cpc", label: "클릭당 비용", description: "평균 클릭 비용", numeric: true },
  { key: "conversions", label: "전환수", description: "구매 등 추적된 전환 수", numeric: true },
  { key: "salesAmount", label: "전환매출", description: "전환으로 잡힌 매출 금액", numeric: true },
];

export const REPORT_COLUMN_SCHEMAS: Record<SearchAdReportType, SearchAdReportColumn[]> = {
  AD: [
    { key: "campaignId", label: "캠페인 ID", description: "네이버 캠페인 식별자" },
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupId", label: "광고그룹 ID", description: "네이버 광고그룹 식별자" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    ...commonPerformanceColumns.slice(2),
    { key: "averagePosition", label: "평균 노출 순위", description: "평균 노출 위치", numeric: true },
    { key: "status", label: "상태", description: "보고서 기준 대상 상태" },
  ],
  AD_DETAIL: [
    { key: "campaignId", label: "캠페인 ID", description: "네이버 캠페인 식별자" },
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupId", label: "광고그룹 ID", description: "네이버 광고그룹 식별자" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    { key: "adId", label: "광고 ID", description: "네이버 광고 식별자" },
    { key: "adName", label: "광고명", description: "광고 소재 또는 광고 이름" },
    ...commonPerformanceColumns.slice(3),
    { key: "pcClicks", label: "PC 클릭", description: "PC에서 발생한 클릭", numeric: true },
    { key: "mobileClicks", label: "모바일 클릭", description: "모바일에서 발생한 클릭", numeric: true },
    { key: "status", label: "상태", description: "보고서 기준 대상 상태" },
  ],
  AD_CONVERSION: [
    ...commonPerformanceColumns,
    { key: "conversionType", label: "전환 유형", description: "구매, 장바구니 등 전환 분류" },
    { key: "directConversions", label: "직접 전환", description: "직접 기여로 잡힌 전환", numeric: true },
    { key: "directSalesAmount", label: "직접 매출", description: "직접 기여 매출", numeric: true },
  ],
  AD_CONVERSION_DETAIL: [
    { key: "campaignId", label: "캠페인 ID", description: "네이버 캠페인 식별자" },
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupId", label: "광고그룹 ID", description: "네이버 광고그룹 식별자" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    ...commonPerformanceColumns.slice(2),
    { key: "conversionType", label: "전환 유형", description: "구매, 장바구니 등 전환 분류" },
    { key: "directConversions", label: "직접 전환", description: "직접 기여 전환", numeric: true },
    { key: "directSalesAmount", label: "직접 매출", description: "직접 기여 매출", numeric: true },
  ],
  ADEXTENSION: [
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    { key: "extensionType", label: "확장소재 유형", description: "확장소재의 종류" },
    { key: "extensionName", label: "확장소재명", description: "확장소재 이름" },
    ...commonPerformanceColumns.slice(3),
    { key: "directConversions", label: "직접 전환", description: "직접 기여 전환", numeric: true },
    { key: "directSalesAmount", label: "직접 매출", description: "직접 기여 매출", numeric: true },
    { key: "averagePosition", label: "평균 노출 순위", description: "평균 노출 위치", numeric: true },
    { key: "status", label: "상태", description: "확장소재 상태" },
  ],
  EXPKEYWORD: [
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    { key: "keywordText", label: "기준 키워드", description: "광고그룹에 등록된 기준 키워드" },
    { key: "searchTerm", label: "검색어", description: "실제 유입 또는 확장된 검색어" },
    { key: "impressions", label: "노출수", description: "검색어 기준 노출 수", numeric: true },
    { key: "clicks", label: "클릭수", description: "검색어 기준 클릭 수", numeric: true },
    { key: "cost", label: "비용", description: "검색어 기준 광고비", numeric: true },
    { key: "conversions", label: "전환수", description: "검색어 기준 전환 수", numeric: true },
    { key: "salesAmount", label: "전환매출", description: "검색어 기준 전환 매출", numeric: true },
    { key: "ctr", label: "클릭률", description: "검색어 기준 클릭률", numeric: true },
    { key: "cpc", label: "클릭당 비용", description: "검색어 기준 평균 클릭 비용", numeric: true },
    { key: "device", label: "기기", description: "PC 또는 모바일 구분" },
  ],
  SHOPPINGKEYWORD_DETAIL: [
    { key: "campaignName", label: "캠페인명", description: "쇼핑검색광고 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "쇼핑검색광고 광고그룹 이름" },
    { key: "productName", label: "상품명", description: "검색어와 연결된 상품명" },
    { key: "searchTerm", label: "검색어", description: "실제 유입된 쇼핑검색 검색어" },
    { key: "impressions", label: "노출수", description: "검색어 기준 노출 수", numeric: true },
    { key: "clicks", label: "클릭수", description: "검색어 기준 클릭 수", numeric: true },
    { key: "cost", label: "비용", description: "검색어 기준 광고비", numeric: true },
    { key: "ctr", label: "클릭률", description: "검색어 기준 클릭률", numeric: true },
    { key: "cpc", label: "클릭당 비용", description: "검색어 기준 평균 클릭 비용", numeric: true },
    { key: "conversions", label: "전환수", description: "검색어 기준 전환 수", numeric: true },
    { key: "salesAmount", label: "전환매출", description: "검색어 기준 전환 매출", numeric: true },
    { key: "directConversions", label: "직접 전환", description: "직접 기여 전환", numeric: true },
    { key: "directSalesAmount", label: "직접 매출", description: "직접 기여 매출", numeric: true },
    { key: "pcClicks", label: "PC 클릭", description: "PC 클릭 수", numeric: true },
    { key: "mobileClicks", label: "모바일 클릭", description: "모바일 클릭 수", numeric: true },
    { key: "status", label: "상태", description: "보고서 기준 상태" },
  ],
  SHOPPINGKEYWORD_CONVERSION_DETAIL: [
    { key: "campaignName", label: "캠페인명", description: "쇼핑검색광고 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "쇼핑검색광고 광고그룹 이름" },
    { key: "productName", label: "상품명", description: "검색어와 연결된 상품명" },
    { key: "searchTerm", label: "검색어", description: "전환이 연결된 쇼핑검색 검색어" },
    { key: "clicks", label: "클릭수", description: "검색어 기준 클릭 수", numeric: true },
    { key: "cost", label: "비용", description: "검색어 기준 광고비", numeric: true },
    { key: "conversions", label: "전환수", description: "검색어 기준 전환 수", numeric: true },
    { key: "salesAmount", label: "전환매출", description: "검색어 기준 전환 매출", numeric: true },
    { key: "directConversions", label: "직접 전환", description: "직접 기여 전환", numeric: true },
    { key: "directSalesAmount", label: "직접 매출", description: "직접 기여 매출", numeric: true },
    { key: "conversionType", label: "전환 유형", description: "구매, 장바구니 등 전환 분류" },
    { key: "pcConversions", label: "PC 전환", description: "PC 전환 수", numeric: true },
    { key: "mobileConversions", label: "모바일 전환", description: "모바일 전환 수", numeric: true },
    { key: "pcSalesAmount", label: "PC 매출", description: "PC 전환 매출", numeric: true },
    { key: "mobileSalesAmount", label: "모바일 매출", description: "모바일 전환 매출", numeric: true },
  ],
  CRITERION: [
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    { key: "criterionType", label: "타게팅 유형", description: "기기, 시간대, 지역 등 타게팅 분류" },
    { key: "criterionValue", label: "타게팅 값", description: "타게팅의 실제 값" },
    { key: "impressions", label: "노출수", description: "타게팅 기준 노출 수", numeric: true },
    { key: "clicks", label: "클릭수", description: "타게팅 기준 클릭 수", numeric: true },
    { key: "cost", label: "비용", description: "타게팅 기준 광고비", numeric: true },
  ],
  CRITERION_CONVERSION: [
    { key: "campaignName", label: "캠페인명", description: "네이버 캠페인 이름" },
    { key: "adgroupName", label: "광고그룹명", description: "네이버 광고그룹 이름" },
    { key: "criterionType", label: "타게팅 유형", description: "기기, 시간대, 지역 등 타게팅 분류" },
    { key: "criterionValue", label: "타게팅 값", description: "타게팅의 실제 값" },
    { key: "clicks", label: "클릭수", description: "타게팅 기준 클릭 수", numeric: true },
    { key: "cost", label: "비용", description: "타게팅 기준 광고비", numeric: true },
    { key: "conversions", label: "전환수", description: "타게팅 기준 전환 수", numeric: true },
    { key: "salesAmount", label: "전환매출", description: "타게팅 기준 전환 매출", numeric: true },
  ],
};

export function getReportColumns(reportType: SearchAdReportType) {
  return REPORT_COLUMN_SCHEMAS[reportType];
}
