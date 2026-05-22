import type { ProviderHistoryPolicy, ProviderKey } from "./types";

type SyncProviderKey = Exclude<ProviderKey, "llm">;

export const PROVIDER_HISTORY_POLICIES: Record<SyncProviderKey, ProviderHistoryPolicy> = {
  search_ad: {
    provider: "search_ad",
    apiLimitLabel: "광고 성과 일반 리포트는 최대 2년까지 확인",
    requestWindowLabel: "성과 백필은 92일 단위로 분할",
    backfillLabel: "초기 광고 성과는 2년을 나눠 가져오고, 키워드 도구는 현재 월검색량만 캐시",
    dailySnapshotLabel: "주요 키워드 수요와 광고 성과 요약을 매일 저장",
    seasonalityLabel: "전년도 시즌 비교는 저장된 일별 광고 성과와 데이터랩 추이를 함께 사용",
    storageLabel: "원천 응답 제외, 키워드/성과 집계와 근거 ID만 저장",
    costGuardLabel: "AI에는 후보 키워드와 요약 지표만 전달",
    sourceUrl: "https://github.com/naver/searchad-apidoc/wiki/FAQ-stat",
  },
  datalab: {
    provider: "datalab",
    apiLimitLabel: "2016-01-01 이후 검색 추이를 상대 비율로 조회",
    requestWindowLabel: "키워드 그룹 5개, 그룹당 키워드 20개까지",
    backfillLabel: "시즌 키워드는 필요한 연도와 이벤트 윈도우만 선별 저장",
    dailySnapshotLabel: "핵심 시즌 키워드만 일/주 단위 추이 요약으로 저장",
    seasonalityLabel: "설날·추석 같은 음력 명절은 연도별 양력 날짜로 변환해 같은 D-기간을 비교",
    storageLabel: "절대 검색량으로 해석하지 않고 ratio 요약과 근거 ID만 저장",
    costGuardLabel: "AI에는 전체 시계열 대신 상승/하락 요약과 대표 구간만 전달",
    sourceUrl: "https://developers.naver.com/docs/serviceapi/datalab/search/search.md",
  },
  smartstore: {
    provider: "smartstore",
    apiLimitLabel: "주문 조건 조회는 시작일 기준 180일 이내 주문, 데이터솔루션 통계는 구독 시 최대 18개월",
    requestWindowLabel: "주문 조회는 1회 최대 24시간 범위로 분할",
    backfillLabel: "초기 주문 백필은 180일을 24시간 단위로 나누고 이후 변경분을 매일 저장",
    dailySnapshotLabel: "스티커씨 주문·매출·상위 상품 집계를 매일 저장",
    seasonalityLabel: "전년도 명절 비교는 API 재조회보다 자체 일별 스냅샷을 기준으로 사용",
    storageLabel: "토큰·서명·주문번호·주문 원문 행은 저장하지 않고 집계만 저장",
    costGuardLabel: "AI에는 상품별 매출/주문 요약과 후보 키워드만 전달",
    sourceUrl: "https://github.com/commerce-api-naver/commerce-api/discussions/1875",
  },
  shop: {
    provider: "shop",
    apiLimitLabel: "자체 쇼핑몰은 영카트 DB와 브리지 보존 정책이 기준",
    requestWindowLabel: "운영 브리지는 기본 30일 집계, 긴 백필은 일/월 단위로 분할",
    backfillLabel: "커피프린트 과거 데이터는 원천 DB에서 재집계하되 워크플로에는 집계만 가져옴",
    dailySnapshotLabel: "주문·재구매·매출·객단가 집계를 매일 저장",
    seasonalityLabel: "전년도 명절 비교는 내부 DB 재집계 또는 저장된 일별 스냅샷으로 처리",
    storageLabel: "고객 식별정보와 주문 원문 행은 저장하지 않고 최소 집계만 저장",
    costGuardLabel: "AI에는 고객 원문 대신 세그먼트 크기와 재구매 요약만 전달",
    sourceUrl: "integrations/youngcart-bridge/README.md",
  },
};

export function getProviderHistoryPolicy(provider: SyncProviderKey): ProviderHistoryPolicy {
  return PROVIDER_HISTORY_POLICIES[provider];
}
