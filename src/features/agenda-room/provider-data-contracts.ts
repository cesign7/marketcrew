import type { ProviderDataContractView } from "./types";

export function buildProviderDataContracts(): ProviderDataContractView[] {
  return [
    {
      providerKey: "search_ad",
      providerLabel: "네이버 키워드광고",
      channelKey: "search-ad",
      channelLabel: "광고/검색",
      sourceUrl: "https://api.searchad.naver.com/keywordstool",
      incoming: {
        id: "search-ad-incoming",
        title: "불러오는 데이터",
        description: "키워드 도구 응답에서 후보 키워드의 월간 검색량, 경쟁도, 평균 클릭률만 읽습니다.",
        safetyNote: "API 키, 서명, 고객 ID, 응답 원문은 저장하지 않습니다.",
        columns: [
          {
            key: "relKeyword",
            label: "키워드",
            description: "네이버 키워드 도구가 반환한 실제 연관 키워드입니다.",
            sample: "부처님오신날 선물카드",
          },
          {
            key: "monthlyPcQcCnt",
            label: "PC 월간 검색수",
            description: "PC에서 조회된 월간 검색량입니다. '< 10' 같은 값은 0으로 정규화합니다.",
            sample: "420",
          },
          {
            key: "monthlyMobileQcCnt",
            label: "모바일 월간 검색수",
            description: "모바일에서 조회된 월간 검색량입니다.",
            sample: "1,800",
          },
          {
            key: "compIdx",
            label: "경쟁도",
            description: "낮음, 중간, 높음 값을 LOW, MEDIUM, HIGH로 바꿉니다.",
            sample: "중간",
          },
          {
            key: "monthlyAvePcCtr",
            label: "PC 평균 클릭률",
            description: "PC 광고 평균 클릭률 후보 값입니다.",
            sample: "1.2",
          },
          {
            key: "monthlyAveMobileCtr",
            label: "모바일 평균 클릭률",
            description: "모바일 광고 평균 클릭률 후보 값입니다.",
            sample: "1.8",
          },
        ],
        sampleRows: [
          {
            id: "search-ad-incoming-sample-1",
            values: [
              { key: "relKeyword", label: "키워드", value: "부처님오신날 선물카드" },
              { key: "monthlyPcQcCnt", label: "PC", value: "420" },
              { key: "monthlyMobileQcCnt", label: "모바일", value: "1,800" },
              { key: "compIdx", label: "경쟁도", value: "중간" },
              { key: "monthlyAvePcCtr", label: "PC CTR", value: "1.2" },
            ],
          },
        ],
        sourceFieldGroups: [
          {
            id: "search-ad-source-keyword-list",
            title: "keywordList[0]",
            description: "키워드 도구 응답에서 읽을 수 있는 대표 원천 필드입니다.",
            fields: [
              { key: "keywordList[0].relKeyword", label: "키워드", handling: "키워드 수요 요약에 사용" },
              { key: "keywordList[0].monthlyPcQcCnt", label: "PC 검색수", handling: "숫자로 정규화해 저장" },
              { key: "keywordList[0].monthlyMobileQcCnt", label: "모바일 검색수", handling: "숫자로 정규화해 저장" },
              { key: "keywordList[0].compIdx", label: "경쟁도", handling: "경쟁 수준으로 변환" },
              { key: "keywordList[0].monthlyAvePcCtr", label: "PC 클릭률", handling: "클릭률 후보로 저장" },
              { key: "keywordList[0].monthlyAveMobileCtr", label: "모바일 클릭률", handling: "클릭률 후보로 저장" },
            ],
          },
        ],
      },
      stored: {
        id: "search-ad-stored",
        title: "저장하는 데이터",
        description: "원천 응답을 그대로 두지 않고 키워드 수요 요약과 연동 실행 기록으로 저장합니다.",
        safetyNote: "AI 입력에는 키워드와 요약 지표, 근거 ID만 전달합니다.",
        columns: [
          {
            key: "KeywordDemandSnapshot.keyword",
            label: "키워드",
            description: "안건 후보와 시즌 키워드 판단에 쓰는 표준 키워드명입니다.",
            sample: "부처님오신날 선물카드",
          },
          {
            key: "monthlyPcSearches",
            label: "PC 검색수",
            description: "원천 PC 검색수를 숫자로 정규화한 값입니다.",
            sample: "420",
          },
          {
            key: "monthlyMobileSearches",
            label: "모바일 검색수",
            description: "원천 모바일 검색수를 숫자로 정규화한 값입니다.",
            sample: "1800",
          },
          {
            key: "competitionIndex",
            label: "경쟁 수준",
            description: "LOW, MEDIUM, HIGH, UNKNOWN 중 하나로 저장합니다.",
            sample: "MEDIUM",
          },
          {
            key: "cachedUntil",
            label: "캐시 만료일",
            description: "동일 키워드를 다시 불러오기 전까지 참고할 수 있는 날짜입니다.",
            sample: "2026-05-23",
          },
          {
            key: "providerSyncReportId",
            label: "연동 실행 ID",
            description: "어떤 읽기 전용 수집에서 만들어졌는지 추적하는 내부 ID입니다.",
            sample: "provider-sync-search-ad-2026-05-22",
          },
        ],
        sampleRows: [
          {
            id: "search-ad-stored-sample-1",
            values: [
              { key: "keyword", label: "키워드", value: "부처님오신날 선물카드" },
              { key: "searches", label: "검색수", value: "PC 420 / 모바일 1,800" },
              { key: "competition", label: "경쟁", value: "MEDIUM" },
              { key: "rateLimit", label: "상태", value: "OK" },
            ],
          },
        ],
      },
    },
    {
      providerKey: "datalab",
      providerLabel: "네이버 데이터랩",
      channelKey: "datalab",
      channelLabel: "광고/검색",
      sourceUrl: "https://openapi.naver.com/v1/datalab/search",
      incoming: {
        id: "datalab-incoming",
        title: "불러오는 데이터",
        description: "검색어 트렌드 응답에서 기간별 상대 비율만 읽습니다.",
        safetyNote: "DataLab ratio는 절대 검색량이 아니므로 매출·검색수처럼 해석하지 않습니다.",
        columns: [
          {
            key: "startDate",
            label: "조회 시작일",
            description: "검색 트렌드를 요청한 시작 날짜입니다.",
            sample: "2026-04-22",
          },
          {
            key: "endDate",
            label: "조회 종료일",
            description: "검색 트렌드를 요청한 종료 날짜입니다.",
            sample: "2026-05-22",
          },
          {
            key: "timeUnit",
            label: "기간 단위",
            description: "date, week, month 중 하나입니다. 현재 운영 화면은 일 단위를 기본으로 봅니다.",
            sample: "date",
          },
          {
            key: "results.title",
            label: "키워드 묶음",
            description: "대표가 보는 검색어 그룹 이름입니다.",
            sample: "부처님오신날",
          },
          {
            key: "results.data.period",
            label: "구간",
            description: "상대 비율이 기록된 날짜 또는 기간입니다.",
            sample: "2026-05-01",
          },
          {
            key: "results.data.ratio",
            label: "상대 비율",
            description: "조회 구간의 최대값을 100으로 둔 상대 지표입니다.",
            sample: "100",
          },
        ],
        sampleRows: [
          {
            id: "datalab-incoming-sample-1",
            values: [
              { key: "title", label: "묶음", value: "부처님오신날" },
              { key: "period", label: "구간", value: "2026-05-01" },
              { key: "ratio", label: "비율", value: "100" },
              { key: "timeUnit", label: "단위", value: "date" },
            ],
          },
        ],
        sourceFieldGroups: [
          {
            id: "datalab-source-search-result",
            title: "results[0].data[0]",
            description: "DataLab 검색 트렌드 응답에서 읽을 수 있는 대표 원천 필드입니다.",
            fields: [
              { key: "startDate", label: "시작일", handling: "분석 기간으로 저장" },
              { key: "endDate", label: "종료일", handling: "분석 기간으로 저장" },
              { key: "timeUnit", label: "기간 단위", handling: "추이 단위로 저장" },
              { key: "results[0].title", label: "묶음", handling: "키워드 묶음 이름으로 저장" },
              { key: "results[0].keywords", label: "검색어", handling: "요청 조건 확인용, 원문 목록은 저장 안 함" },
              { key: "results[0].data[0].ratio", label: "상대 비율", handling: "절대 검색량이 아닌 상대값으로 저장" },
            ],
          },
        ],
      },
      stored: {
        id: "datalab-stored",
        title: "저장하는 데이터",
        description: "상대 비율 시계열을 검색 추이 요약으로 저장하고, 안건 판단에는 상승·하락 흐름만 사용합니다.",
        safetyNote: "AI에는 전체 원천 응답 대신 대표 구간과 요약만 넘깁니다.",
        columns: [
          {
            key: "SearchTrendSnapshot.keywordGroupName",
            label: "키워드 묶음",
            description: "검색 추이 요약의 대표 그룹명입니다.",
            sample: "부처님오신날",
          },
          {
            key: "timeUnit",
            label: "기간 단위",
            description: "저장된 추이의 단위입니다.",
            sample: "date",
          },
          {
            key: "startDate/endDate",
            label: "분석 기간",
            description: "추이를 비교할 시작일과 종료일입니다.",
            sample: "2026-04-22 ~ 2026-05-22",
          },
          {
            key: "ratios",
            label: "상대 비율 목록",
            description: "기간별 ratio만 저장합니다.",
            sample: "2026-05-01: 100",
          },
          {
            key: "note",
            label: "해석 주석",
            description: "절대 검색량이 아니라는 내부 주석입니다.",
            sample: "relative_ratio_not_absolute_volume",
          },
        ],
        sampleRows: [
          {
            id: "datalab-stored-sample-1",
            values: [
              { key: "keywordGroupName", label: "묶음", value: "부처님오신날" },
              { key: "window", label: "기간", value: "2026-04-22 ~ 2026-05-22" },
              { key: "ratios", label: "대표 비율", value: "2026-05-01: 100" },
              { key: "note", label: "주석", value: "상대값" },
            ],
          },
        ],
      },
    },
    {
      providerKey: "smartstore",
      providerLabel: "스마트스토어(스티커씨)",
      channelKey: "smartstore-stickersee",
      channelLabel: "스마트스토어(스티커씨)",
      brandLabel: "스티커씨",
      sourceUrl: "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query",
      incoming: {
        id: "smartstore-incoming",
        title: "불러오는 데이터",
        description: "토큰 발급 후 최근 변경 주문 ID를 가져오고, 주문 상세에서 상품명과 결제 금액만 집계합니다.",
        safetyNote: "토큰, 시크릿, 주문번호 목록, 주문 원문 행은 저장하지 않습니다.",
        columns: [
          {
            key: "lastChangedFrom/lastChangedTo",
            label: "변경 조회 기간",
            description: "최근 변경 주문을 찾는 시작/종료 시각입니다.",
            sample: "2026-05-21T00:00:00Z ~ 2026-05-22T00:00:00Z",
          },
          {
            key: "productOrderId",
            label: "상품주문번호",
            description: "상세 조회에만 쓰는 주문 식별자입니다. 저장하지 않습니다.",
            sample: "po-1",
          },
          {
            key: "productOrder.productName",
            label: "상품명",
            description: "상품별 매출/주문 집계와 상위 상품 추출에 쓰는 이름입니다.",
            sample: "선물카드",
          },
          {
            key: "productOrder.totalPaymentAmount",
            label: "결제 금액",
            description: "스티커씨 매출 집계에 합산하는 금액 후보입니다.",
            sample: "7,000",
          },
          {
            key: "access_token",
            label: "접근 토큰",
            description: "요청 인증에만 쓰고 저장하지 않는 값입니다.",
            sample: "저장 안 함",
          },
        ],
        sampleRows: [
          {
            id: "smartstore-incoming-sample-1",
            values: [
              { key: "productOrderId", label: "주문", value: "po-1" },
              { key: "productName", label: "상품", value: "선물카드" },
              { key: "totalPaymentAmount", label: "금액", value: "7,000원" },
              { key: "token", label: "토큰", value: "저장 안 함" },
            ],
          },
        ],
        sourceFieldGroups: [
          {
            id: "smartstore-source-last-changed",
            title: "lastChangeStatuses[0]",
            description: "최근 변경 주문 목록에서 상세 조회에 잠깐 쓰는 원천 필드입니다.",
            fields: [
              { key: "lastChangeStatuses[0].productOrderId", label: "상품주문번호", handling: "상세 조회에만 사용, 저장 안 함" },
              { key: "lastChangeStatuses[0].lastChangedDate", label: "변경시각", handling: "조회 창 판단에 사용, 원문 저장 안 함" },
              { key: "lastChangeStatuses[0].productOrderStatus", label: "주문상태", handling: "필터 판단에 사용, 원문 저장 안 함" },
              { key: "Authorization", label: "인증 토큰", handling: "요청에만 사용, 저장 안 함" },
            ],
          },
          {
            id: "smartstore-source-product-order",
            title: "productOrders[0].productOrder",
            description: "주문 상세 응답에서 상품/금액 집계에 필요한 대표 원천 필드입니다.",
            fields: [
              { key: "productOrders[0].productOrder.productName", label: "상품명", handling: "상위 상품 집계에 사용" },
              { key: "productOrders[0].productOrder.totalPaymentAmount", label: "결제 금액", handling: "매출 합산에 사용" },
              { key: "productOrders[0].productOrder.quantity", label: "수량", handling: "주문 집계 확인용, 원문 저장 안 함" },
              { key: "productOrders[0].order.orderId", label: "주문 ID", handling: "식별자 저장 안 함" },
              { key: "productOrders[0].shippingAddress", label: "배송지", handling: "개인정보로 저장 안 함" },
            ],
          },
        ],
      },
      stored: {
        id: "smartstore-stored",
        title: "저장하는 데이터",
        description: "스티커씨 운영 판단에 필요한 주문 수, 매출, 상위 상품만 집계 스냅샷으로 저장합니다.",
        safetyNote: "고객 정보와 주문 원문은 DB에 남기지 않는 집계 전용 계약입니다.",
        columns: [
          {
            key: "CommerceAggregateSnapshot.brandKey",
            label: "브랜드",
            description: "스티커씨 스마트스토어를 구분하는 내부 키입니다.",
            sample: "STICKERSEE",
          },
          {
            key: "windowDays",
            label: "집계 기간",
            description: "며칠 치 주문을 묶었는지 나타냅니다.",
            sample: "30",
          },
          {
            key: "paidOrderCount",
            label: "결제 주문수",
            description: "조회 기간 안에서 확인된 결제 주문 건수입니다.",
            sample: "100",
          },
          {
            key: "grossSales",
            label: "매출 합계",
            description: "상품 주문 금액을 합산한 스티커씨 매출입니다.",
            sample: "600,120",
          },
          {
            key: "topProductName",
            label: "상위 상품",
            description: "집계된 주문에서 대표로 노출할 상품명입니다.",
            sample: "선물카드",
          },
          {
            key: "dataScope",
            label: "저장 범위",
            description: "원천 행이 아닌 집계만 저장한다는 표시입니다.",
            sample: "aggregate_only",
          },
        ],
        sampleRows: [
          {
            id: "smartstore-stored-sample-1",
            values: [
              { key: "brandKey", label: "브랜드", value: "STICKERSEE" },
              { key: "orders", label: "주문", value: "100건" },
              { key: "grossSales", label: "매출", value: "600,120원" },
              { key: "topProductName", label: "상위 상품", value: "선물카드" },
            ],
          },
        ],
      },
    },
    {
      providerKey: "shop",
      providerLabel: "쇼핑몰(커피프린트)",
      channelKey: "shop-coffeeprint",
      channelLabel: "쇼핑몰(커피프린트)",
      brandLabel: "커피프린트",
      sourceUrl: "integrations/youngcart-bridge/README.md",
      incoming: {
        id: "shop-incoming",
        title: "불러오는 데이터",
        description: "영카트 직접 DB가 아니라 토큰 보호 브리지에서 커피프린트 주문/재구매 집계만 읽습니다.",
        safetyNote: "연결 토큰, DB 정보, 고객/주문 원문 행은 저장하지 않습니다.",
        columns: [
          {
            key: "brandKey",
            label: "브랜드",
            description: "브리지가 반환하는 쇼핑몰 브랜드 키입니다.",
            sample: "COFFEEPRINT",
          },
          {
            key: "windowDays",
            label: "집계 기간",
            description: "브리지에서 집계한 기간입니다.",
            sample: "30",
          },
          {
            key: "orderCount",
            label: "주문수",
            description: "기간 내 주문 건수입니다.",
            sample: "28",
          },
          {
            key: "repeatCustomerCount",
            label: "재구매 고객수",
            description: "기간 내 반복 구매로 분류된 고객 수입니다.",
            sample: "4",
          },
          {
            key: "grossSales",
            label: "매출 합계",
            description: "기간 내 주문 금액 합계입니다.",
            sample: "880,000",
          },
          {
            key: "averageOrderValue",
            label: "평균 주문금액",
            description: "객단가 판단에 쓰는 평균 주문 금액입니다.",
            sample: "51,765",
          },
        ],
        sampleRows: [
          {
            id: "shop-incoming-sample-1",
            values: [
              { key: "brandKey", label: "브랜드", value: "COFFEEPRINT" },
              { key: "orderCount", label: "주문", value: "28건" },
              { key: "repeatCustomerCount", label: "재구매", value: "4명" },
              { key: "grossSales", label: "매출", value: "880,000원" },
            ],
          },
        ],
        sourceFieldGroups: [
          {
            id: "shop-source-bridge-aggregate",
            title: "bridge aggregate response",
            description: "영카트 브리지가 반환하는 원천 집계 응답 필드입니다. 고객/주문 원문 행은 브리지 밖으로 내보내지 않습니다.",
            fields: [
              { key: "brandKey", label: "브랜드", handling: "쇼핑몰 브랜드 구분에 사용" },
              { key: "windowDays", label: "집계 기간", handling: "집계 기간으로 저장" },
              { key: "orderCount", label: "주문수", handling: "주문 집계로 저장" },
              { key: "repeatCustomerCount", label: "재구매 고객수", handling: "재구매 세그먼트 크기로 저장" },
              { key: "grossSales", label: "매출", handling: "매출 집계로 저장" },
              { key: "averageOrderValue", label: "평균 주문금액", handling: "객단가로 저장" },
            ],
          },
        ],
      },
      stored: {
        id: "shop-stored",
        title: "저장하는 데이터",
        description: "커피프린트 운영 판단에 필요한 주문, 재구매, 매출, 객단가만 집계 스냅샷으로 저장합니다.",
        safetyNote: "개인정보와 주문 원문은 저장하지 않고 세그먼트 크기만 남깁니다.",
        columns: [
          {
            key: "ShopAggregateSnapshot.brandKey",
            label: "브랜드",
            description: "커피프린트 쇼핑몰을 구분하는 내부 키입니다.",
            sample: "COFFEEPRINT",
          },
          {
            key: "windowDays",
            label: "집계 기간",
            description: "며칠 치 주문/재구매를 묶었는지 나타냅니다.",
            sample: "30",
          },
          {
            key: "orderCount",
            label: "주문수",
            description: "집계 기간의 주문 건수입니다.",
            sample: "28",
          },
          {
            key: "repeatCustomerCount",
            label: "재구매 고객수",
            description: "재구매 세그먼트 크기입니다.",
            sample: "4",
          },
          {
            key: "grossSales",
            label: "매출 합계",
            description: "커피프린트 쇼핑몰 매출 합계입니다.",
            sample: "880,000",
          },
          {
            key: "averageOrderValue",
            label: "평균 주문금액",
            description: "상품/CRM 안건의 객단가 기준입니다.",
            sample: "51,765",
          },
        ],
        sampleRows: [
          {
            id: "shop-stored-sample-1",
            values: [
              { key: "brandKey", label: "브랜드", value: "COFFEEPRINT" },
              { key: "orderCount", label: "주문", value: "28건" },
              { key: "repeatCustomerCount", label: "재구매", value: "4명" },
              { key: "averageOrderValue", label: "객단가", value: "51,765원" },
            ],
          },
        ],
      },
    },
  ];
}
