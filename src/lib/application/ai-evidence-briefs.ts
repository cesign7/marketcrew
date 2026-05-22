import type { ProviderSyncReport } from "../domain";

export type AiEvidenceDecision =
  | "JUDGMENT_READY"
  | "NEEDS_MORE_EVIDENCE"
  | "SOURCE_REVIEW_REQUIRED"
  | "APPROVAL_BLOCKED";

export type AiEvidenceBrief = {
  id: string;
  providerKey: ProviderSyncReport["provider"] | "commerce_cross_channel";
  channelLabel: string;
  title: string;
  decision: AiEvidenceDecision;
  decisionLabel: string;
  tone: "ready" | "warning" | "blocked";
  summary: string;
  allowedUseCases: string[];
  blockedUseCases: string[];
  evidenceIds: string[];
  sourceReportIds: string[];
  checkedAt: string;
  rawDataPolicyLabel: string;
};

export function buildAiEvidenceBriefs(input: {
  providerSyncReports: ProviderSyncReport[];
  generatedAt: string;
}): AiEvidenceBrief[] {
  const searchAdReport = latestReport(input.providerSyncReports, "search_ad");
  const datalabReport = latestReport(input.providerSyncReports, "datalab");
  const smartstoreReport = latestReport(input.providerSyncReports, "smartstore");
  const shopReport = latestReport(input.providerSyncReports, "shop");
  const commerceSnapshot = smartstoreReport?.commerceAggregateSnapshot;
  const shopSnapshot = shopReport?.shopAggregateSnapshot;

  return [
    searchAdReport ? buildSearchAdBrief(searchAdReport, input.generatedAt) : undefined,
    datalabReport ? buildDataLabBrief(datalabReport) : undefined,
    smartstoreReport ? buildSmartstoreBrief(smartstoreReport) : undefined,
    shopReport ? buildShopBrief(shopReport) : undefined,
    smartstoreReport && shopReport && commerceSnapshot && shopSnapshot
      ? buildCrossChannelBrief(smartstoreReport, shopReport)
      : undefined,
  ].filter((brief): brief is AiEvidenceBrief => Boolean(brief));
}

function buildSearchAdBrief(report: ProviderSyncReport, generatedAt: string): AiEvidenceBrief {
  const snapshots = [...(report.keywordDemandSnapshots ?? [])]
    .filter((snapshot) => snapshot.rateLimitState !== "FAILED")
    .sort((left, right) => keywordSearchVolume(right) - keywordSearchVolume(left));
  const topSnapshots = snapshots.slice(0, 5);
  const staleSnapshot = topSnapshots.some(
    (snapshot) => snapshot.rateLimitState !== "OK" || snapshot.cachedUntil <= generatedAt,
  );
  const decision =
    report.status !== "SYNCED"
      ? "APPROVAL_BLOCKED"
      : staleSnapshot || topSnapshots.length < 2
        ? "NEEDS_MORE_EVIDENCE"
        : "JUDGMENT_READY";
  const strongest = topSnapshots[0];

  return buildBrief({
    id: `ai-evidence-${report.id}`,
    providerKey: "search_ad",
    channelLabel: "네이버 키워드광고",
    title: "네이버 키워드광고 AI 판독 근거",
    decision,
    summary:
      decision === "APPROVAL_BLOCKED"
        ? `키워드광고 수집이 실패해 AI 판단 근거로 사용할 수 없습니다.${report.failureReason ? ` 사유: ${report.failureReason}` : ""}`
        : `상위 키워드 ${topSnapshots.length.toLocaleString("ko-KR")}개와 최대 월검색 ${keywordSearchVolume(
            strongest,
          ).toLocaleString("ko-KR")}회를 요약 근거로 사용합니다.`,
    allowedUseCases: ["키워드 확장 후보 선별", "시즌 검색 수요 우선순위 판단", "광고 초안 검토"],
    blockedUseCases: [
      "광고비/입찰가 즉시 변경",
      ...(decision === "JUDGMENT_READY" ? ["원천 검색어 전체 재해석"] : ["결재 상신"]),
    ],
    evidenceIds: topSnapshots.map((snapshot) => snapshot.id),
    sourceReportIds: [report.id],
    checkedAt: report.checkedAt,
  });
}

function buildDataLabBrief(report: ProviderSyncReport): AiEvidenceBrief {
  const snapshots = report.searchTrendSnapshots ?? [];
  const decision = report.status !== "SYNCED" ? "APPROVAL_BLOCKED" : "SOURCE_REVIEW_REQUIRED";

  return buildBrief({
    id: `ai-evidence-${report.id}`,
    providerKey: "datalab",
    channelLabel: "네이버 데이터랩",
    title: "데이터랩 AI 보조 근거",
    decision,
    summary:
      decision === "APPROVAL_BLOCKED"
        ? `데이터랩 수집이 실패해 시즌 추이 보조 근거를 사용할 수 없습니다.${report.failureReason ? ` 사유: ${report.failureReason}` : ""}`
        : `검색어 그룹 ${snapshots.length.toLocaleString("ko-KR")}개의 상대 추이만 사용합니다. 절대 검색량 판단에는 쓰지 않습니다.`,
    allowedUseCases: ["시즌 흐름 보조 판단", "검색 수요 변화 방향 확인"],
    blockedUseCases: ["절대 검색량 판단", "광고비/입찰가 즉시 변경", "단독 결재 상신"],
    evidenceIds: snapshots.map((snapshot) => snapshot.id),
    sourceReportIds: [report.id],
    checkedAt: report.checkedAt,
  });
}

function buildSmartstoreBrief(report: ProviderSyncReport): AiEvidenceBrief {
  const snapshot = report.commerceAggregateSnapshot;
  const decision =
    report.status !== "SYNCED"
      ? "APPROVAL_BLOCKED"
      : snapshot && snapshot.paidOrderCount > 0 && snapshot.grossSales > 0
        ? "JUDGMENT_READY"
        : "NEEDS_MORE_EVIDENCE";
  const brandLabel = snapshot ? brandDisplayLabel(snapshot.brandKey) : "스마트스토어";

  return buildBrief({
    id: `ai-evidence-${report.id}`,
    providerKey: "smartstore",
    channelLabel: "스마트스토어(스티커씨)",
    title: "스마트스토어 AI 판독 근거",
    decision,
    summary: snapshot
      ? `${brandLabel} 주문 ${snapshot.paidOrderCount.toLocaleString("ko-KR")}건, 매출 ${snapshot.grossSales.toLocaleString(
          "ko-KR",
        )}원을 ${snapshot.windowDays.toLocaleString("ko-KR")}일 집계로 사용합니다.${
          snapshot.topProductName ? ` 상위 상품: ${snapshot.topProductName}` : ""
        }`
      : `스마트스토어 집계 자료가 없어 AI 판단 근거가 부족합니다.${report.failureReason ? ` 사유: ${report.failureReason}` : ""}`,
    allowedUseCases: ["상위 상품/매출 신호 판단", "상품별 키워드 초안 근거", "채널별 매출 변화 확인"],
    blockedUseCases: ["상품 가격/옵션 즉시 변경", "재고/배송 상태 단정", "외부 계정 자동 수정"],
    evidenceIds: snapshot ? [snapshot.id] : [],
    sourceReportIds: [report.id],
    checkedAt: report.checkedAt,
  });
}

function buildShopBrief(report: ProviderSyncReport): AiEvidenceBrief {
  const snapshot = report.shopAggregateSnapshot;
  const decision =
    report.status !== "SYNCED"
      ? "APPROVAL_BLOCKED"
      : snapshot && snapshot.orderCount > 0
        ? "JUDGMENT_READY"
        : "NEEDS_MORE_EVIDENCE";
  const brandLabel = snapshot ? brandDisplayLabel(snapshot.brandKey) : "자체몰";

  return buildBrief({
    id: `ai-evidence-${report.id}`,
    providerKey: "shop",
    channelLabel: "쇼핑몰(커피프린트)",
    title: "쇼핑몰 AI 판독 근거",
    decision,
    summary: snapshot
      ? `${brandLabel} 주문 ${snapshot.orderCount.toLocaleString("ko-KR")}건, 재구매 고객 ${snapshot.repeatCustomerCount.toLocaleString(
          "ko-KR",
        )}명, 매출 ${snapshot.grossSales.toLocaleString("ko-KR")}원을 요약 근거로 사용합니다.`
      : `쇼핑몰 집계 자료가 없어 AI 판단 근거가 부족합니다.${report.failureReason ? ` 사유: ${report.failureReason}` : ""}`,
    allowedUseCases: ["재구매 고객군 초안 판단", "자체몰 매출 흐름 확인", "감사/재구매 메시지 후보 생성"],
    blockedUseCases: ["고객별 구매 내역 추론", "문자/이메일 즉시 발송", "외부 계정 자동 수정"],
    evidenceIds: snapshot ? [snapshot.id] : [],
    sourceReportIds: [report.id],
    checkedAt: report.checkedAt,
  });
}

function buildCrossChannelBrief(smartstoreReport: ProviderSyncReport, shopReport: ProviderSyncReport): AiEvidenceBrief {
  const commerce = smartstoreReport.commerceAggregateSnapshot!;
  const shop = shopReport.shopAggregateSnapshot!;
  const decision =
    smartstoreReport.status === "SYNCED" && shopReport.status === "SYNCED" && commerce.grossSales > 0 && shop.grossSales > 0
      ? "JUDGMENT_READY"
      : "NEEDS_MORE_EVIDENCE";

  return buildBrief({
    id: `ai-evidence-cross-channel-${smartstoreReport.id}-${shopReport.id}`,
    providerKey: "commerce_cross_channel",
    channelLabel: "채널 통합",
    title: "스마트스토어/쇼핑몰 통합 AI 판독 근거",
    decision,
    summary: `스티커씨 매출 ${commerce.grossSales.toLocaleString("ko-KR")}원과 커피프린트 매출 ${shop.grossSales.toLocaleString(
      "ko-KR",
    )}원을 함께 보며 광고, 상품, 재구매 안건을 분리합니다.`,
    allowedUseCases: ["채널별 우선순위 조정", "상품 발굴 후보 선별", "광고와 재구매 업무 분리"],
    blockedUseCases: ["채널 간 예산 자동 이동", "가격/쿠폰 즉시 변경", "고객별 행동 추론"],
    evidenceIds: [commerce.id, shop.id],
    sourceReportIds: [smartstoreReport.id, shopReport.id],
    checkedAt: [smartstoreReport.checkedAt, shopReport.checkedAt].sort().at(-1) ?? smartstoreReport.checkedAt,
  });
}

function buildBrief(input: Omit<AiEvidenceBrief, "decisionLabel" | "tone" | "rawDataPolicyLabel">): AiEvidenceBrief {
  return {
    ...input,
    decisionLabel: decisionLabel(input.decision),
    tone: decisionTone(input.decision),
    rawDataPolicyLabel: "원천 행 제외, 요약 근거와 근거 ID만 사용",
  };
}

function latestReport(
  reports: ProviderSyncReport[],
  provider: ProviderSyncReport["provider"],
): ProviderSyncReport | undefined {
  return reports.filter((report) => report.provider === provider).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
}

function keywordSearchVolume(snapshot: NonNullable<ProviderSyncReport["keywordDemandSnapshots"]>[number] | undefined): number {
  if (!snapshot) {
    return 0;
  }

  return (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0);
}

function decisionLabel(decision: AiEvidenceDecision): string {
  const labels: Record<AiEvidenceDecision, string> = {
    JUDGMENT_READY: "판단 가능",
    NEEDS_MORE_EVIDENCE: "보강 필요",
    SOURCE_REVIEW_REQUIRED: "원천 확인 필요",
    APPROVAL_BLOCKED: "결재 금지",
  };

  return labels[decision];
}

function decisionTone(decision: AiEvidenceDecision): AiEvidenceBrief["tone"] {
  if (decision === "JUDGMENT_READY") {
    return "ready";
  }

  if (decision === "APPROVAL_BLOCKED") {
    return "blocked";
  }

  return "warning";
}

function brandDisplayLabel(brandKey: string): string {
  const labels: Record<string, string> = {
    STICKERSEE: "스티커씨",
    COFFEEPRINT: "커피프린트",
  };

  return labels[brandKey.toUpperCase()] ?? brandKey;
}
