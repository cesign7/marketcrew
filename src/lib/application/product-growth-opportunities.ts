import type {
  CharacterKey,
  CommerceAggregateSnapshot,
  DataConfidence,
  KeywordDemandSnapshot,
  ProviderSyncReport,
  ShopAggregateSnapshot,
} from "../domain";

export type ProductGrowthOpportunityKind = "KEYWORD_EXPANSION" | "MARKETING_PROPOSAL" | "PRODUCT_DISCOVERY";

export type ProductGrowthOpportunity = {
  id: string;
  kind: ProductGrowthOpportunityKind;
  owner: CharacterKey;
  title: string;
  targetName: string;
  summary: string;
  keywordCandidates: string[];
  productImageUrl?: string;
  evidenceIds: string[];
  evidenceLabels: string[];
  sourceReportIds: string[];
  confidence: DataConfidence;
  nextAction: string;
  guardrail: string;
  createdAt: string;
};

export function buildProductGrowthOpportunities(input: {
  providerSyncReports: ProviderSyncReport[];
  generatedAt: string;
}): ProductGrowthOpportunity[] {
  const searchAdReport = latestSyncedReport(input.providerSyncReports, "search_ad");
  const dataLabReport = latestSyncedReport(input.providerSyncReports, "datalab");
  const commerceReport = latestSyncedReport(input.providerSyncReports, "smartstore", "commerceAggregateSnapshot");
  const shopReport = latestSyncedReport(input.providerSyncReports, "shop", "shopAggregateSnapshot");
  const keywordSnapshots = topKeywordSnapshots(searchAdReport?.keywordDemandSnapshots ?? [], 5);
  const commerce = commerceReport?.commerceAggregateSnapshot;
  const shop = shopReport?.shopAggregateSnapshot;

  return [
    commerce && keywordSnapshots.length > 0
      ? buildKeywordExpansionOpportunity({
          commerce,
          keywordSnapshots,
          commerceReport,
          searchAdReport,
          dataLabReport,
          generatedAt: input.generatedAt,
        })
      : undefined,
    commerce && keywordSnapshots.length > 0
      ? buildMarketingProposalOpportunity({
          commerce,
          keywordSnapshots,
          commerceReport,
          searchAdReport,
          dataLabReport,
          generatedAt: input.generatedAt,
        })
      : undefined,
    commerce && shop
      ? buildProductDiscoveryOpportunity({
          commerce,
          shop,
          keywordSnapshots,
          commerceReport,
          shopReport,
          generatedAt: input.generatedAt,
        })
      : undefined,
  ].filter((opportunity): opportunity is ProductGrowthOpportunity => Boolean(opportunity));
}

function buildKeywordExpansionOpportunity(input: {
  commerce: CommerceAggregateSnapshot;
  keywordSnapshots: KeywordDemandSnapshot[];
  commerceReport?: ProviderSyncReport;
  searchAdReport?: ProviderSyncReport;
  dataLabReport?: ProviderSyncReport;
  generatedAt: string;
}): ProductGrowthOpportunity {
  const targetName = input.commerce.topProductName ?? input.commerce.brandKey;
  const topKeywords = input.keywordSnapshots.slice(0, 4);
  const strongestKeyword = topKeywords[0];

  return {
    id: `product-growth-keyword-${slugify(targetName)}-${input.generatedAt.slice(0, 10)}`,
    kind: "KEYWORD_EXPANSION",
    owner: "gro",
    title: `${targetName} 상품 키워드 확장 후보`,
    targetName,
    productImageUrl: input.commerce.topProductImageUrl,
    summary: `스마트스토어 최근 ${input.commerce.windowDays}일 주문 ${input.commerce.paidOrderCount.toLocaleString(
      "ko-KR",
    )}건과 네이버 키워드 수요 상위 후보를 묶어 검색광고/랜딩 초안을 만들 수 있습니다.`,
    keywordCandidates: topKeywords.map((snapshot) => snapshot.keyword),
    evidenceIds: [
      input.commerce.id,
      ...topKeywords.map((snapshot) => snapshot.id),
      ...(input.dataLabReport?.searchTrendSnapshots ?? []).map((snapshot) => snapshot.id),
    ],
    evidenceLabels: [
      `스마트스토어 매출 ${input.commerce.grossSales.toLocaleString("ko-KR")}원`,
      `키워드 후보 ${topKeywords.length.toLocaleString("ko-KR")}개`,
      strongestKeyword ? `최대 월검색 ${keywordSearchVolume(strongestKeyword).toLocaleString("ko-KR")}회` : "월검색 요약 없음",
      input.dataLabReport?.searchTrendSnapshots?.length
        ? `데이터랩 상대 추이 ${input.dataLabReport.searchTrendSnapshots.length.toLocaleString("ko-KR")}개`
        : "데이터랩 상대 추이 없음",
    ],
    sourceReportIds: [input.commerceReport?.id, input.searchAdReport?.id, input.dataLabReport?.id].filter(
      (id): id is string => Boolean(id),
    ),
    confidence: topKeywords.length >= 2 && input.commerce.paidOrderCount > 0 ? "READY_TO_APPROVE" : "EVIDENCE_WEAK",
    nextAction: "그로가 검색광고 키워드 초안과 랜딩 연결안을 작성",
    guardrail: "광고 키워드 추가, 입찰, 예산 변경은 외부 반영 잠금 전까지 차단",
    createdAt: input.generatedAt,
  };
}

function buildMarketingProposalOpportunity(input: {
  commerce: CommerceAggregateSnapshot;
  keywordSnapshots: KeywordDemandSnapshot[];
  commerceReport?: ProviderSyncReport;
  searchAdReport?: ProviderSyncReport;
  dataLabReport?: ProviderSyncReport;
  generatedAt: string;
}): ProductGrowthOpportunity {
  const targetName = input.commerce.topProductName ?? input.commerce.brandKey;
  const giftKeywords = input.keywordSnapshots.filter((snapshot) => /선물|명절|추석|설|부처님|스승/.test(snapshot.keyword));
  const selectedKeywords = (giftKeywords.length > 0 ? giftKeywords : input.keywordSnapshots).slice(0, 4);

  return {
    id: `product-growth-marketing-${slugify(targetName)}-${input.generatedAt.slice(0, 10)}`,
    kind: "MARKETING_PROPOSAL",
    owner: "copy",
    title: `${targetName} 시즌 메시지/기획전 초안 후보`,
    targetName,
    productImageUrl: input.commerce.topProductImageUrl,
    summary: `상위 판매 상품을 시즌 검색어와 연결해 상세페이지 문구, 배너, 기획전 카피 초안을 만들 후보입니다.`,
    keywordCandidates: selectedKeywords.map((snapshot) => snapshot.keyword),
    evidenceIds: [input.commerce.id, ...selectedKeywords.map((snapshot) => snapshot.id)],
    evidenceLabels: [
      `대표 상품 ${targetName}`,
      `주문 ${input.commerce.paidOrderCount.toLocaleString("ko-KR")}건`,
      `시즌성 키워드 ${selectedKeywords.length.toLocaleString("ko-KR")}개`,
      input.dataLabReport?.searchTrendSnapshots?.length
        ? "데이터랩은 상대 추이 근거로만 사용"
        : "검색광고 키워드 수요 중심",
    ],
    sourceReportIds: [input.commerceReport?.id, input.searchAdReport?.id, input.dataLabReport?.id].filter(
      (id): id is string => Boolean(id),
    ),
    confidence: selectedKeywords.length >= 2 ? "READY_TO_APPROVE" : "SEASONAL_CONTEXT_REQUIRED",
    nextAction: "카피가 광고문구와 상품 메시지 초안을 작성",
    guardrail: "문구 초안만 만들고 게시/발송은 외부 반영 잠금 전까지 차단",
    createdAt: input.generatedAt,
  };
}

function buildProductDiscoveryOpportunity(input: {
  commerce: CommerceAggregateSnapshot;
  shop: ShopAggregateSnapshot;
  keywordSnapshots: KeywordDemandSnapshot[];
  commerceReport?: ProviderSyncReport;
  shopReport?: ProviderSyncReport;
  generatedAt: string;
}): ProductGrowthOpportunity {
  const commerceTarget = input.commerce.topProductName ?? input.commerce.brandKey;
  const selectedKeywords = input.keywordSnapshots.slice(0, 3);
  const targetName = `${commerceTarget} / ${input.shop.brandKey}`;

  return {
    id: `product-growth-discovery-${slugify(input.commerce.brandKey)}-${slugify(input.shop.brandKey)}-${input.generatedAt.slice(0, 10)}`,
    kind: "PRODUCT_DISCOVERY",
    owner: "pro",
    title: "시즌 선물형 상품/묶음 발굴 후보",
    targetName,
    productImageUrl: input.commerce.topProductImageUrl,
    summary: `스마트스토어 판매 상품과 자체몰 재구매 고객 ${input.shop.repeatCustomerCount.toLocaleString(
      "ko-KR",
    )}명을 함께 보면 시즌 선물형 묶음, 감사 카드, 재구매 제안을 검토할 수 있습니다.`,
    keywordCandidates: selectedKeywords.map((snapshot) => snapshot.keyword),
    evidenceIds: [input.commerce.id, input.shop.id, ...selectedKeywords.map((snapshot) => snapshot.id)],
    evidenceLabels: [
      `스마트스토어 ${input.commerce.grossSales.toLocaleString("ko-KR")}원`,
      `자체몰 ${input.shop.grossSales.toLocaleString("ko-KR")}원`,
      `재구매 고객 ${input.shop.repeatCustomerCount.toLocaleString("ko-KR")}명`,
      selectedKeywords.length > 0 ? `연결 키워드 ${selectedKeywords.length.toLocaleString("ko-KR")}개` : "키워드 추가 수집 필요",
    ],
    sourceReportIds: [input.commerceReport?.id, input.shopReport?.id].filter((id): id is string => Boolean(id)),
    confidence:
      input.commerce.grossSales > 0 && input.shop.repeatCustomerCount > 0 ? "READY_TO_APPROVE" : "INSUFFICIENT_HISTORY",
    nextAction: "프로가 상품 발굴/묶음 구성 초안을 만들고 리피가 재구매 고객군을 검토",
    guardrail: "상품 가격, 옵션, 쿠폰, CRM 발송은 외부 반영 잠금 전까지 차단",
    createdAt: input.generatedAt,
  };
}

function latestSyncedReport<K extends "commerceAggregateSnapshot" | "shopAggregateSnapshot">(
  reports: ProviderSyncReport[],
  provider: ProviderSyncReport["provider"],
  snapshotKey?: K,
): ProviderSyncReport | undefined {
  return reports
    .filter(
      (report) =>
        report.provider === provider &&
        report.status === "SYNCED" &&
        (snapshotKey ? Boolean(report[snapshotKey]) : true),
    )
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
}

function topKeywordSnapshots(snapshots: KeywordDemandSnapshot[], limit: number): KeywordDemandSnapshot[] {
  return snapshots
    .filter((snapshot) => snapshot.rateLimitState !== "FAILED")
    .sort((a, b) => {
      const volumeDiff = keywordSearchVolume(b) - keywordSearchVolume(a);

      return volumeDiff === 0 ? a.keyword.localeCompare(b.keyword, "ko-KR") : volumeDiff;
    })
    .slice(0, limit);
}

function keywordSearchVolume(snapshot: KeywordDemandSnapshot): number {
  return (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
