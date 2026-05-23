import type { ApprovalRequest, ExecutionResult, OutcomeState, ProviderSyncReport } from "../domain";

export type ProviderOutcomeAnalysis = {
  state: OutcomeState;
  summary: string;
  baselineSummary: string;
  checkpointSummary: string;
  evidenceIds: string[];
  evidenceLabels: string[];
  sourceReportIds: string[];
};

export function buildProviderOutcomeAnalysis(input: {
  approvalRequest: ApprovalRequest;
  executionResult: ExecutionResult;
  providerSyncReports: ProviderSyncReport[];
  draftOnly?: boolean;
}): ProviderOutcomeAnalysis | undefined {
  const reports = selectRelevantReports(input.approvalRequest, input.providerSyncReports);
  if (reports.length === 0) {
    return undefined;
  }

  const baseline = input.approvalRequest.executionPlan.measurementPlan.baselineWindow;
  const checkpointLabels = input.approvalRequest.executionPlan.measurementPlan.checkpoints
    .map((checkpoint) => `${checkpoint.label} ${checkpoint.dueDate}`)
    .join(", ");
  const evidenceLabels = reports.flatMap(buildOutcomeEvidenceLabels);
  const evidenceIds = Array.from(new Set(reports.flatMap(buildOutcomeEvidenceIds)));
  const sourceReportIds = reports.map((report) => report.id);
  const latestCheckedAt = reports
    .map((report) => report.checkedAt)
    .sort((a, b) => b.localeCompare(a))[0];

  return {
    state: outcomeStateFromExecution(input.executionResult),
    summary: buildOutcomeSummary(input.executionResult, input.draftOnly, reports.length),
    baselineSummary: `${baseline.startDate} ~ ${baseline.endDate} 기준선에 최신 읽기 전용 연동 요약 자료를 연결했습니다. ${evidenceLabels.join(
      " / ",
    )}`,
    checkpointSummary: `${checkpointLabels}. 다음 동기화부터 ${input.approvalRequest.executionPlan.measurementPlan.metrics.join(
      ", ",
    )}를 수집 기록 ${sourceReportIds.join(", ")} 기준으로 비교합니다.${latestCheckedAt ? ` 최신 수집 ${formatKoreanDateTime(latestCheckedAt)}.` : ""}`,
    evidenceIds,
    evidenceLabels,
    sourceReportIds,
  };
}

function outcomeStateFromExecution(executionResult: ExecutionResult): OutcomeState {
  if (executionResult.state === "PARTIALLY_APPLIED") {
    return "PARTIAL_SUCCESS";
  }

  if (executionResult.state === "FAILED") {
    return "FAILED";
  }

  return "INCONCLUSIVE";
}

function selectRelevantReports(
  approvalRequest: ApprovalRequest,
  reports: ProviderSyncReport[],
): ProviderSyncReport[] {
  const providers = providerPriorityForApproval(approvalRequest);
  const latestReports = new Map<ProviderSyncReport["provider"], ProviderSyncReport>();

  for (const report of [...reports].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))) {
    if (report.status !== "SYNCED" || latestReports.has(report.provider) || !hasOutcomeEvidence(report)) {
      continue;
    }

    latestReports.set(report.provider, report);
  }

  return providers
    .map((provider) => latestReports.get(provider))
    .filter((report): report is ProviderSyncReport => Boolean(report));
}

function providerPriorityForApproval(approvalRequest: ApprovalRequest): ProviderSyncReport["provider"][] {
  const { executorKey, workType } = approvalRequest.executionPlan;

  if (workType === "PRODUCT_DRAFT" || executorKey.includes("product")) {
    return ["smartstore", "search_ad", "datalab", "shop"];
  }

  if (workType === "CRM_DRAFT" || executorKey.includes("crm")) {
    return ["shop", "smartstore"];
  }

  if (workType === "SEARCH_AD_KEYWORD" || workType === "SEARCH_AD_BID_BUDGET" || executorKey.includes("search-ad")) {
    return ["search_ad", "datalab", "smartstore"];
  }

  if (workType === "CREATIVE_DRAFT") {
    return ["search_ad", "datalab", "smartstore"];
  }

  return ["smartstore", "shop", "search_ad", "datalab"];
}

function hasOutcomeEvidence(report: ProviderSyncReport): boolean {
  return Boolean(
    report.commerceAggregateSnapshot ||
      report.shopAggregateSnapshot ||
      report.keywordDemandSnapshots?.length ||
      report.searchTrendSnapshots?.length,
  );
}

function buildOutcomeSummary(executionResult: ExecutionResult, draftOnly: boolean | undefined, reportCount: number): string {
  const reportCountLabel = reportCount.toLocaleString("ko-KR");

  if (draftOnly) {
    return `초안 확정만 기록했습니다. 최신 읽기 전용 연동 수집 기록 ${reportCountLabel}개를 다음 재상신 기준선으로 보관했습니다.`;
  }

  if (executionResult.state === "NEEDS_MANUAL_ACTION") {
    return `외부 반영 잠금이 닫혀 성과 변화로 확정하지 않았습니다. 대신 최신 읽기 전용 연동 수집 기록 ${reportCountLabel}개를 기준선과 체크포인트에 연결했습니다.`;
  }

  if (executionResult.state === "APPLIED") {
    return `내부 초안 실행을 기록했고, 최신 읽기 전용 연동 수집 기록 ${reportCountLabel}개로 성과 관찰 기준선을 만들었습니다.`;
  }

  return `실행 결과는 ${executionResult.state}입니다. 최신 읽기 전용 연동 수집 기록 ${reportCountLabel}개를 근거로 후속 점검합니다.`;
}

function buildOutcomeEvidenceLabels(report: ProviderSyncReport): string[] {
  const labels: string[] = [];

  if (report.commerceAggregateSnapshot) {
    const snapshot = report.commerceAggregateSnapshot;
    labels.push(
      `스마트스토어 ${snapshot.windowDays}일 주문 ${snapshot.paidOrderCount.toLocaleString("ko-KR")}건`,
      `스마트스토어 매출 ${snapshot.grossSales.toLocaleString("ko-KR")}원`,
    );
    if (snapshot.topProductName) {
      labels.push(`상위 상품 ${snapshot.topProductName}`);
    }
  }

  if (report.shopAggregateSnapshot) {
    const snapshot = report.shopAggregateSnapshot;
    labels.push(
      `자체몰 ${snapshot.windowDays}일 주문 ${snapshot.orderCount.toLocaleString("ko-KR")}건`,
      `재구매 고객 ${snapshot.repeatCustomerCount.toLocaleString("ko-KR")}명`,
      `자체몰 매출 ${snapshot.grossSales.toLocaleString("ko-KR")}원`,
    );
  }

  if (report.keywordDemandSnapshots?.length) {
    const maxVolume = Math.max(...report.keywordDemandSnapshots.map(keywordSearchVolume));
    labels.push(
      `키워드광고 수요 ${report.keywordDemandSnapshots.length.toLocaleString("ko-KR")}건`,
      `키워드광고 월검색 최대 ${maxVolume.toLocaleString("ko-KR")}회`,
    );
  }

  if (report.searchTrendSnapshots?.length) {
    labels.push(`데이터랩 상대 추이 ${report.searchTrendSnapshots.length.toLocaleString("ko-KR")}건`);
  }

  return labels;
}

function buildOutcomeEvidenceIds(report: ProviderSyncReport): string[] {
  return [
    report.commerceAggregateSnapshot?.id,
    report.shopAggregateSnapshot?.id,
    ...(report.keywordDemandSnapshots ?? []).map((snapshot) => snapshot.id),
    ...(report.searchTrendSnapshots ?? []).map((snapshot) => snapshot.id),
    report.generatedSignal?.id,
  ].filter((id): id is string => Boolean(id));
}

function keywordSearchVolume(snapshot: NonNullable<ProviderSyncReport["keywordDemandSnapshots"]>[number]): number {
  return (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0);
}

function formatKoreanDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}
