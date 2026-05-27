import type { RuleCategory } from "./types";

export type SearchAdRuleCategoryGuide = {
  category: RuleCategory;
  title: string;
  when: string;
  requiredData: string;
  firstAction: string;
  caution: string;
};

export const RULE_CATEGORY_GUIDES: SearchAdRuleCategoryGuide[] = [
  {
    category: "low_efficiency",
    title: "저효율",
    when: "충분한 클릭과 비용이 있는데 전환이 0건일 때",
    requiredData: "클릭, 비용, 전환수, 검색어 또는 광고 소재 연결 대상",
    firstAction: "입찰 하향, 제외어 후보, 랜딩 적합도 점검",
    caution: "전환 추적이 빠진 브랜드는 실제 주문 연결 여부를 먼저 확인합니다.",
  },
  {
    category: "high_cpa",
    title: "높은 구매비용",
    when: "전환은 있지만 1건당 광고비가 목표보다 높을 때",
    requiredData: "비용, 전환수, 브랜드별 목표 구매비용",
    firstAction: "입찰 하향, 예산 축소, 더 잘 맞는 검색어로 분리",
    caution: "객단가가 높은 상품은 목표 구매비용을 별도로 둘 수 있습니다.",
  },
  {
    category: "low_roas",
    title: "낮은 광고수익률",
    when: "광고비 대비 전환매출 비율이 목표보다 낮을 때",
    requiredData: "비용, 전환매출, 브랜드별 목표 광고수익률",
    firstAction: "예산 유지 여부 점검, 상품/랜딩/입찰 조정",
    caution: "전환매출이 들어오지 않는 계정은 낮은 광고수익률로 단정하지 않습니다.",
  },
  {
    category: "no_click",
    title: "클릭 없음",
    when: "노출은 충분하지만 클릭이 0회일 때",
    requiredData: "노출수, 클릭수, 캠페인/광고그룹/검색어 연결 대상",
    firstAction: "문구, 상품명, 대표 이미지, 입찰 순위 점검",
    caution: "노출이 적은 항목은 판단하지 않고 더 쌓일 때까지 둡니다.",
  },
  {
    category: "good_performance",
    title: "우수",
    when: "충분한 클릭 뒤 전환이 있고 구매비용 또는 광고수익률 기준을 통과할 때",
    requiredData: "클릭, 비용, 전환수, 전환매출",
    firstAction: "예산 확대 후보, 키워드 확장, 유사 상품 연결 검토",
    caution: "클릭 1~2건의 우연한 전환은 우수 후보로 보지 않습니다.",
  },
  {
    category: "needs_review",
    title: "점검 필요",
    when: "전환은 있는데 전환매출이 없거나 필수 연결 대상이 불명확할 때",
    requiredData: "원문 보고서 행, 광고그룹/소재/검색어 연결 정보, 전환매출",
    firstAction: "전환매출 연동, 수집 상태, 매핑 상태, 전환 추적 상태 확인",
    caution: "ROAS가 0%로 보여도 전환매출 누락이면 광고 성과가 아니라 데이터 문제일 수 있습니다.",
  },
];

export const RULE_PERIOD_GUIDE_ITEMS = [
  {
    title: "기준 기간",
    value: "기본 30일",
    description: "같은 브랜드, 광고유형, 연결 대상을 기간 안에서 합산해 판단합니다.",
  },
  {
    title: "실제 수집 일수",
    value: "카드에 별도 표시",
    description: "백필이 덜 끝났으면 30일 규칙이라도 실제 1일치 또는 일부 기간 판단으로 표시합니다.",
  },
  {
    title: "중복 저장",
    value: "최신 스냅샷 갱신",
    description: "같은 보고서 기준일과 종류는 중복 판단하지 않고 저장된 원천 행과 규칙 결과를 갱신합니다.",
  },
  {
    title: "LLM 연결",
    value: "규칙 이후",
    description: "숫자 규칙으로 후보를 먼저 만들고, 나중에 LLM은 이유 설명과 조치 제안에 붙입니다.",
  },
  {
    title: "조치 후보",
    value: "카드에 별도 표시",
    description: "제외어, 입찰 조정, 키워드 추가, 랜딩 점검, 타게팅 조정처럼 실제 다음 행동 기준으로 나눕니다.",
  },
];

export const RULE_EXECUTION_GUIDE_ITEMS = [
  {
    title: "1단계",
    value: "규칙 결과",
    description: "저효율, 클릭 없음, 낮은 광고수익률 같은 후보를 숫자로 먼저 만듭니다.",
  },
  {
    title: "2단계",
    value: "실행 미리보기",
    description: "캠페인이나 광고그룹을 켜고 끌 때 예상 영향과 현재 상태를 먼저 저장합니다.",
  },
  {
    title: "3단계",
    value: "실제 변경 게이트",
    description: "서버 환경변수로 권한이 열려 있을 때만 네이버 광고에 반영하고, 닫혀 있으면 차단 이력만 남깁니다.",
  },
  {
    title: "4단계",
    value: "실행 이력",
    description: "반영, 차단, 실패 결과를 별도로 남겨 나중에 성과와 함께 확인합니다.",
  },
];
