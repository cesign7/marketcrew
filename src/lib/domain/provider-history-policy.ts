import type { ProviderHistoryPolicy, ProviderKey } from "./types";

type SyncProviderKey = Exclude<ProviderKey, "llm">;

export const PROVIDER_HISTORY_POLICIES: Record<SyncProviderKey, ProviderHistoryPolicy> = {
  search_ad: {
    provider: "search_ad",
    apiLimitLabel: "쇼핑 검색어 성과는 최근 30일 중심, 세부 breakdown은 유형별 7~90일 제약",
    requestWindowLabel: "키워드 도구는 현재 월검색량/클릭/경쟁도 후보를 조회",
    backfillLabel: "광고 성과 백필은 저장된 일별 스냅샷을 우선하고 부족분만 분할 조회",
    dailySnapshotLabel: "주요 키워드 수요와 광고 성과 요약을 매일 저장",
    seasonalityLabel: "전년도 시즌 비교는 저장된 일별 광고 성과와 데이터랩 추이를 함께 사용",
    storageLabel: "원천 응답 제외, 키워드/성과 집계와 근거 ID만 저장",
    costGuardLabel: "AI에는 후보 키워드와 요약 지표만 전달",
    baseScheduleLabel: "매일 07:05 전체 광고/키워드 요약 수집",
    intensiveScheduleLabel: "광고 집행 중 07:05, 15:05 2회 수집, 시즌 D-30부터 시즌 키워드 묶음 매일 점검",
    manualRefreshLabel: "입찰/예산/소재 변경 직후 또는 결재 직전 즉시 갱신",
    freshnessLabel: "결재 근거는 2시간 이내 권장, 12시간 초과 시 수동 갱신 필요로 표시",
    dedupeKeyLabel: "provider+channel+date+keywordGroup+windowKind 기준 최신 스냅샷으로 갱신",
    sourceUrl: "https://naver.github.io/searchad-apidoc/",
  },
  datalab: {
    provider: "datalab",
    apiLimitLabel: "2016-01-01 이후 검색 추이를 상대 비율로 조회, 하루 1,000회 한도",
    requestWindowLabel: "키워드 그룹 5개, 그룹당 키워드 20개까지",
    backfillLabel: "시즌 키워드는 필요한 연도와 이벤트 윈도우만 선별 저장",
    dailySnapshotLabel: "핵심 시즌 키워드만 일/주 단위 추이 요약으로 저장",
    seasonalityLabel: "설날·추석 같은 음력 명절은 연도별 양력 날짜로 변환해 같은 D-기간을 비교",
    storageLabel: "절대 검색량으로 해석하지 않고 ratio 요약과 근거 ID만 저장",
    costGuardLabel: "AI에는 전체 시계열 대신 상승/하락 요약과 대표 구간만 전달",
    baseScheduleLabel: "매일 07:20 시즌 감시 키워드 그룹만 수집",
    intensiveScheduleLabel: "시즌 D-30부터 이벤트별 D-기간 검색 추이를 매일 저장, 키워드 묶음 변경 시만 추가 호출",
    manualRefreshLabel: "새 시즌 키워드나 상품 후보를 결재에 올리기 직전 1회 즉시 갱신",
    freshnessLabel: "일반 안건은 24시간 이내, 시즌 결재는 당일 수집분을 우선",
    dedupeKeyLabel: "provider+keywordGroup+timeUnit+startDate+endDate+segment 기준 최신 ratio로 갱신",
    sourceUrl: "https://developers.naver.com/docs/serviceapi/datalab/search/search.md",
  },
  smartstore: {
    provider: "smartstore",
    apiLimitLabel: "변경 주문은 24시간 창 기준, 1회 최대 300건과 more 페이징을 사용",
    requestWindowLabel: "주문 상세 조회는 상품주문번호 묶음 단위로 제한해 호출",
    backfillLabel: "초기 백필은 24시간 창으로 나누고 이후 변경분을 매일 저장",
    dailySnapshotLabel: "스티커씨 주문·매출·상위 상품 집계를 매일 저장",
    seasonalityLabel: "전년도 명절 비교는 API 재조회보다 자체 일별 스냅샷을 기준으로 사용",
    storageLabel: "토큰·서명·주문번호·주문 원문 행은 저장하지 않고 집계만 저장",
    costGuardLabel: "AI에는 상품별 매출/주문 요약과 후보 키워드만 전달",
    baseScheduleLabel: "매일 07:10 스티커씨 변경 주문과 상품/매출 집계 수집",
    intensiveScheduleLabel: "시즌 D-30부터 매일 강화, D-7~D+3은 07:10, 15:10 2회 점검",
    manualRefreshLabel: "상품/가격/프로모션 변경 직후 또는 결재 직전 즉시 갱신",
    freshnessLabel: "주문/매출 결재 근거는 2시간 이내 권장, 24시간 초과 시 최신성 부족",
    dedupeKeyLabel: "provider+brand+date+windowDays+sourceKind 기준 최신 집계(일별)로 갱신, 수집 이력은 별도 보관",
    sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
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
    baseScheduleLabel: "매일 07:15 커피프린트 30일 주문/재구매 집계 수집",
    intensiveScheduleLabel: "시즌 D-30부터 매일 강화, CRM/랜딩 캠페인 중에는 오전/오후 2회까지 허용",
    manualRefreshLabel: "랜딩/쿠폰/CRM 변경 직후 또는 결재 직전 즉시 갱신",
    freshnessLabel: "CRM·재구매 결재 근거는 당일 수집분, 매출 균형 판단은 24시간 이내 권장",
    dedupeKeyLabel: "provider+brand+date+windowDays+aggregateType 기준 최신 집계로 갱신",
    sourceUrl: "integrations/youngcart-bridge/README.md",
  },
};

export function getProviderHistoryPolicy(provider: SyncProviderKey): ProviderHistoryPolicy {
  return PROVIDER_HISTORY_POLICIES[provider];
}
