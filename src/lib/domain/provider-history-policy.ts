import type { ProviderHistoryPolicy, ProviderKey } from "./types";

type SyncProviderKey = Exclude<ProviderKey, "llm">;

export const PROVIDER_HISTORY_POLICIES: Record<SyncProviderKey, ProviderHistoryPolicy> = {
  search_ad: {
    provider: "search_ad",
    apiLimitLabel: "검색어 성과 30일 중심, 세부 통계 7~90일",
    requestWindowLabel: "월검색량·클릭·경쟁도 조회",
    backfillLabel: "부족분만 일별 스냅샷 보강",
    dailySnapshotLabel: "키워드 수요와 광고 요약 매일 저장",
    seasonalityLabel: "전년도 광고 성과와 데이터랩 결합",
    storageLabel: "키워드/성과 집계와 근거 ID만 저장",
    costGuardLabel: "AI에는 후보 키워드와 요약 지표만 전달",
    baseScheduleLabel: "매일 07:05 광고/키워드 수집",
    intensiveScheduleLabel: "집행 중 07:05/15:05, 시즌 D-30 매일",
    manualRefreshLabel: "입찰·예산 변경 직후/결재 직전",
    freshnessLabel: "결재 근거 2시간 이내 권장",
    dedupeKeyLabel: "채널+날짜+키워드 묶음 최신 갱신",
    sourceUrl: "https://naver.github.io/searchad-apidoc/",
  },
  datalab: {
    provider: "datalab",
    apiLimitLabel: "2016-01-01 이후 ratio 조회, 일 1,000회",
    requestWindowLabel: "키워드 그룹 5개, 그룹당 키워드 20개까지",
    backfillLabel: "필요한 시즌 구간만 선별 저장",
    dailySnapshotLabel: "핵심 시즌 키워드만 일/주 단위 추이 요약으로 저장",
    seasonalityLabel: "음력 명절은 양력 환산 D-기간 비교",
    storageLabel: "절대 검색량으로 해석하지 않고 ratio 요약과 근거 ID만 저장",
    costGuardLabel: "AI에는 전체 시계열 대신 상승/하락 요약과 대표 구간만 전달",
    baseScheduleLabel: "매일 07:20 시즌 키워드 수집",
    intensiveScheduleLabel: "시즌 D-30부터 D-기간 매일 저장",
    manualRefreshLabel: "새 후보 결재 직전 갱신",
    freshnessLabel: "일반 24시간, 시즌은 당일 기준",
    dedupeKeyLabel: "키워드 묶음+기간 기준 최신 ratio 갱신",
    sourceUrl: "https://developers.naver.com/docs/serviceapi/datalab/search/search.md",
  },
  smartstore: {
    provider: "smartstore",
    apiLimitLabel: "변경 주문 24시간 창, 1회 최대 300건",
    requestWindowLabel: "상품주문번호 묶음 단위 조회",
    backfillLabel: "24시간 창으로 나눠 변경분 저장",
    dailySnapshotLabel: "스티커씨 주문·매출·상위 상품 집계를 매일 저장",
    seasonalityLabel: "전년도 명절은 일별 스냅샷 기준",
    storageLabel: "토큰·서명·주문번호·주문 원문 행은 저장하지 않고 집계만 저장",
    costGuardLabel: "AI에는 상품별 매출/주문 요약과 후보 키워드만 전달",
    baseScheduleLabel: "매일 07:10 주문/매출 수집",
    intensiveScheduleLabel: "D-7~D+3은 07:10/15:10 점검",
    manualRefreshLabel: "상품 변경 직후/결재 직전",
    freshnessLabel: "주문/매출 2시간 이내 권장",
    dedupeKeyLabel: "브랜드+날짜 기준 최신 집계 갱신",
    sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
  },
  shop: {
    provider: "shop",
    apiLimitLabel: "자체 쇼핑몰은 영카트 DB와 브리지 보존 정책이 기준",
    requestWindowLabel: "운영 브리지는 기본 30일 집계, 긴 백필은 일/월 단위로 분할",
    backfillLabel: "과거 데이터는 원천 DB에서 재집계",
    dailySnapshotLabel: "주문·재구매·매출·객단가 집계를 매일 저장",
    seasonalityLabel: "전년도 명절 비교는 내부 DB 재집계 또는 저장된 일별 스냅샷으로 처리",
    storageLabel: "고객 식별정보와 주문 원문 행은 저장하지 않고 최소 집계만 저장",
    costGuardLabel: "AI에는 고객 원문 대신 세그먼트 크기와 재구매 요약만 전달",
    baseScheduleLabel: "매일 07:15 주문/재구매 수집",
    intensiveScheduleLabel: "시즌·CRM 중 오전/오후 2회 허용",
    manualRefreshLabel: "랜딩·CRM 변경 직후/결재 직전",
    freshnessLabel: "CRM은 당일, 매출은 24시간 이내",
    dedupeKeyLabel: "브랜드+날짜+집계유형 최신 갱신",
    sourceUrl: "integrations/youngcart-bridge/README.md",
  },
};

export function getProviderHistoryPolicy(provider: SyncProviderKey): ProviderHistoryPolicy {
  return PROVIDER_HISTORY_POLICIES[provider];
}
