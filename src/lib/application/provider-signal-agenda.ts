import type {
  AgendaCandidate,
  ApprovalRequest,
  CharacterKey,
  CharacterReport,
  CommerceAggregateSnapshot,
  DataConfidence,
  ExecutionPlan,
  MeasurementPlan,
  PerformanceCheckpoint,
  ProviderSyncReport,
  RiskLevel,
  ShopAggregateSnapshot,
  Signal,
} from "../domain";
import { buildAdPerformanceDiagnoses, type AdPerformanceDiagnosis } from "./ad-performance-diagnostics";
import { buildExecutionScopeProposalForApproval } from "./execution-scope-proposal";

export type ProviderSignalAgendaArtifacts = {
  agendaCandidates: AgendaCandidate[];
  characterReports: CharacterReport[];
  approvalRequests: ApprovalRequest[];
  performanceCheckpoints: PerformanceCheckpoint[];
};

export function buildProviderSignalAgendaArtifacts(input: {
  signals: Signal[];
  providerSyncReports: ProviderSyncReport[];
  generatedAt: string;
  moaSynthesisReportId?: string;
}): ProviderSignalAgendaArtifacts {
  const generatedAt = input.generatedAt;
  const moaSynthesisReportId = input.moaSynthesisReportId ?? `moa-synthesis-provider-${generatedAt.slice(0, 10)}`;
  const signalsById = new Map(input.signals.map((signal) => [signal.id, signal]));
  const commerceReport = latestSyncedReport(input.providerSyncReports, "smartstore", "commerceAggregateSnapshot");
  const shopReport = latestSyncedReport(input.providerSyncReports, "shop", "shopAggregateSnapshot");
  const searchAdPerformanceReport =
    latestSyncedReport(input.providerSyncReports, "search_ad", "searchAdPerformanceSnapshots") ??
    latestSyncedReport(input.providerSyncReports, "search_ad", "shoppingSearchAdPerformanceSnapshots");
  const searchAdPerformanceDiagnoses = searchAdPerformanceReport
    ? buildAdPerformanceDiagnoses({
        snapshots: searchAdPerformanceReport.searchAdPerformanceSnapshots ?? [],
        shoppingSnapshots: searchAdPerformanceReport.shoppingSearchAdPerformanceSnapshots ?? [],
        generatedAt,
      })
    : [];

  const agendaCandidates = [
    commerceReport ? buildCommerceAgendaCandidate(commerceReport, signalsById, generatedAt) : undefined,
    shopReport ? buildShopAgendaCandidate(shopReport, signalsById, generatedAt) : undefined,
    ...(searchAdPerformanceReport && searchAdPerformanceDiagnoses.length > 0
      ? buildSearchAdPerformanceAgendaCandidates(searchAdPerformanceReport, searchAdPerformanceDiagnoses, generatedAt)
      : []),
  ].filter((candidate): candidate is AgendaCandidate => Boolean(candidate));
  const characterReports = buildCharacterReports(agendaCandidates, generatedAt);
  const approvalRequests = agendaCandidates.map((candidate) =>
    buildApprovalRequest({
      candidate,
      generatedAt,
      moaSynthesisReportId,
      report: candidate.id.includes("smartstore")
        ? commerceReport
        : candidate.id.includes("youngcart")
          ? shopReport
          : candidate.id.includes("search-ad-performance")
            ? searchAdPerformanceReport
            : commerceReport ?? shopReport ?? searchAdPerformanceReport,
    }),
  );
  const performanceCheckpoints = buildPerformanceCheckpoints(approvalRequests, generatedAt);

  return {
    agendaCandidates,
    characterReports,
    approvalRequests,
    performanceCheckpoints,
  };
}

function buildCommerceAgendaCandidate(
  report: ProviderSyncReport,
  signalsById: Map<string, Signal>,
  generatedAt: string,
): AgendaCandidate {
  const snapshot = requireSnapshot(report.commerceAggregateSnapshot, "commerceAggregateSnapshot");
  const signal = resolveReportSignal(report, signalsById);
  const confidence = snapshot.paidOrderCount > 0 && snapshot.grossSales > 0 ? "READY_TO_APPROVE" : "EVIDENCE_WEAK";

  return {
    id: `agenda-provider-smartstore-${slugify(snapshot.brandKey)}-${report.checkedAt.slice(0, 10)}`,
    character: "pro",
    title: "스마트스토어 상위 상품 키워드 확장 안건",
    summary: `최근 ${snapshot.windowDays}일 스마트스토어 주문 ${snapshot.paidOrderCount.toLocaleString("ko-KR")}건, 매출 ${snapshot.grossSales.toLocaleString("ko-KR")}원을 기준으로 상위 상품의 키워드/랜딩 초안을 만들 필요가 있습니다.${snapshot.topProductName ? ` 대표 상품: ${snapshot.topProductName}` : ""}`,
    severity: confidence === "READY_TO_APPROVE" ? "HIGH" : "MEDIUM",
    sourceSignalIds: signal ? [signal.id] : [],
    opportunityIds: [snapshot.id],
    dataConfidence: confidence,
    duplicateKey: `provider-agenda:smartstore:${snapshot.brandKey}:${report.checkedAt.slice(0, 10)}`,
    createdAt: generatedAt,
  };
}

function buildShopAgendaCandidate(
  report: ProviderSyncReport,
  signalsById: Map<string, Signal>,
  generatedAt: string,
): AgendaCandidate {
  const snapshot = requireSnapshot(report.shopAggregateSnapshot, "shopAggregateSnapshot");
  const signal = resolveReportSignal(report, signalsById);
  const confidence = snapshot.orderCount > 0 && snapshot.repeatCustomerCount > 0 ? "READY_TO_APPROVE" : "EVIDENCE_WEAK";

  return {
    id: `agenda-provider-youngcart-${slugify(snapshot.brandKey)}-${report.checkedAt.slice(0, 10)}`,
    character: "ripi",
    title: "영카트 재구매 고객군 CRM 초안 안건",
    summary: `최근 ${snapshot.windowDays}일 자체몰 주문 ${snapshot.orderCount.toLocaleString("ko-KR")}건 중 재구매 고객 ${snapshot.repeatCustomerCount.toLocaleString("ko-KR")}명을 확인했습니다. 발송 전 단계의 재구매/감사 메시지 초안을 만들 필요가 있습니다.`,
    severity: confidence === "READY_TO_APPROVE" ? "HIGH" : "MEDIUM",
    sourceSignalIds: signal ? [signal.id] : [],
    opportunityIds: [snapshot.id],
    dataConfidence: confidence,
    duplicateKey: `provider-agenda:youngcart:${snapshot.brandKey}:${report.checkedAt.slice(0, 10)}`,
    createdAt: generatedAt,
  };
}

function buildSearchAdPerformanceAgendaCandidates(
  report: ProviderSyncReport,
  diagnoses: AdPerformanceDiagnosis[],
  generatedAt: string,
): AgendaCandidate[] {
  const diagnosesByBrand = groupBy(diagnoses, (diagnosis) => normalizeBrandKey(diagnosis.brandKey));

  return [...diagnosesByBrand.entries()]
    .sort(([leftBrand], [rightBrand]) => leftBrand.localeCompare(rightBrand))
    .map(([brandKey, brandDiagnoses]) =>
      buildSearchAdPerformanceAgendaCandidate({
        report,
        diagnoses: brandDiagnoses,
        generatedAt,
        brandKey,
      }),
    );
}

function buildSearchAdPerformanceAgendaCandidate(input: {
  report: ProviderSyncReport;
  diagnoses: AdPerformanceDiagnosis[];
  generatedAt: string;
  brandKey: string;
}): AgendaCandidate {
  const { report, diagnoses, generatedAt } = input;
  const normalizedBrandKey = normalizeBrandKey(input.brandKey);
  const brandLabel = brandLabelFromKey(normalizedBrandKey);
  const actionableDiagnoses = diagnoses.filter((diagnosis) => diagnosis.character === "gro");
  const owner = actionableDiagnoses.length > 0 ? "gro" : "day";
  const representativeDiagnoses = (actionableDiagnoses.length > 0 ? actionableDiagnoses : diagnoses).slice(0, 3);
  const highSeverityCount = actionableDiagnoses.filter((diagnosis) => diagnosis.severity === "HIGH").length;
  const evidenceIds = Array.from(new Set(representativeDiagnoses.flatMap((diagnosis) => diagnosis.evidenceIds)));
  const title =
    owner === "gro"
      ? `${brandLabel} 저성과 검색광고 키워드 조정 안건`
      : `${brandLabel} 검색광고 전환 추적 근거 확인 요청`;
  const brandSlug = slugify(normalizedBrandKey || "unknown");

  return {
    id: `agenda-provider-search-ad-performance-${brandSlug}-${report.checkedAt.slice(0, 10)}`,
    character: owner,
    title,
    summary:
      owner === "gro"
        ? `${brandLabel}의 주문 없는 키워드, 높은 CPA, 기기/시간대 성과 차이 등 검색광고 성과 이상신호 ${diagnoses.length.toLocaleString(
            "ko-KR",
          )}건을 데이터 규칙으로 확인했습니다. 그로가 입찰/예산/일시중지/제외 키워드 조정안을 상신합니다.`
        : `${brandLabel} 검색광고 클릭/비용은 확인됐지만 전환 추적 검증이 필요합니다. 데이가 주문 연결과 추적 누락 여부를 먼저 확인해야 합니다.`,
    severity: highSeverityCount > 0 ? "HIGH" : "MEDIUM",
    sourceSignalIds: report.generatedSignal ? [report.generatedSignal.id] : [],
    opportunityIds: evidenceIds,
    dataConfidence: owner === "gro" ? "READY_TO_APPROVE" : "AD_TRACKING_UNVERIFIED",
    duplicateKey: `provider-agenda:search-ad-performance:${brandSlug}:${report.checkedAt.slice(0, 10)}`,
    createdAt: generatedAt,
  };
}

function buildCharacterReports(candidates: AgendaCandidate[], generatedAt: string): CharacterReport[] {
  const groupedCandidates = new Map<CharacterKey, AgendaCandidate[]>();
  for (const candidate of candidates) {
    groupedCandidates.set(candidate.character, [...(groupedCandidates.get(candidate.character) ?? []), candidate]);
  }

  return [...groupedCandidates.entries()].map(([character, characterCandidates]) => ({
    id: `report-provider-${character}-${generatedAt.slice(0, 10)}`,
    character,
    title: `${characterName(character)} 읽기 전용 데이터 보고`,
    summary: `${characterCandidates.length}개 연동 기반 안건을 모아에게 상신했습니다.`,
    agendaCandidateIds: characterCandidates.map((candidate) => candidate.id),
    evidenceIds: characterCandidates.flatMap((candidate) => candidate.sourceSignalIds),
    createdAt: generatedAt,
  }));
}

function buildApprovalRequest(input: {
  candidate: AgendaCandidate;
  generatedAt: string;
  moaSynthesisReportId: string;
  report?: ProviderSyncReport;
}): ApprovalRequest {
  const executionPlan = buildExecutionPlan(input);
  const request: ApprovalRequest = {
    id: `approval-${input.candidate.id}`,
    title: input.candidate.title,
    moaSynthesisReportId: input.moaSynthesisReportId,
    evidenceSummary: input.candidate.summary,
    evidenceIds: Array.from(new Set([...input.candidate.sourceSignalIds, ...input.candidate.opportunityIds])),
    dataConfidence: input.candidate.dataConfidence,
    riskLevel: riskFromConfidence(input.candidate.dataConfidence),
    executionPlan,
    status: input.candidate.dataConfidence === "READY_TO_APPROVE" ? "PENDING" : "NEEDS_EVIDENCE",
    createdAt: input.generatedAt,
  };

  return {
    ...request,
    executionPlan: {
      ...request.executionPlan,
      executionScopeProposal: buildExecutionScopeProposalForApproval(request),
    },
  };
}

function buildExecutionPlan(input: {
  candidate: AgendaCandidate;
  generatedAt: string;
  report?: ProviderSyncReport;
}): ExecutionPlan {
  const workType = workTypeFromCharacter(input.candidate.character);
  const measurementPlan = buildMeasurementPlan(input.candidate, input.generatedAt);

  return {
    id: `execution-${input.candidate.id}`,
    workType,
    beforeState: {
      provider: input.report?.provider ?? "연동",
      evidenceIds: input.candidate.sourceSignalIds,
      syncedAt: input.report?.checkedAt ?? input.generatedAt,
    },
    afterState: {
      assignedCharacter: input.candidate.character,
      internalDraft: input.candidate.title,
      nextAction: actionFromCharacter(input.candidate.character),
      opportunityIds: input.candidate.opportunityIds,
    },
    diffSummary: `${characterName(input.candidate.character)}가 읽기 전용 집계 근거로 ${actionFromCharacter(input.candidate.character)}를 만듭니다.`,
    rollbackPlan: "내부 초안/안건만 취소하면 되며 외부 계정에는 아직 반영하지 않습니다.",
    measurementPlan,
    executorKey: executorKeyFromCharacter(input.candidate.character),
    requiresWriteGate: false,
  };
}

function buildMeasurementPlan(candidate: AgendaCandidate, generatedAt: string): MeasurementPlan {
  const baselineDate = generatedAt.slice(0, 10);

  return {
    baselineWindow: {
      startDate: addDays(baselineDate, -30),
      endDate: baselineDate,
      anchorDate: baselineDate,
    },
    checkpoints: [
      { label: "D+1", dueDate: addDays(baselineDate, 1) },
      { label: "D+3", dueDate: addDays(baselineDate, 3) },
      { label: "D+7", dueDate: addDays(baselineDate, 7) },
      { label: "D+14", dueDate: addDays(baselineDate, 14) },
      { label: "D+30", dueDate: addDays(baselineDate, 30) },
    ],
    metrics:
      candidate.character === "ripi"
        ? ["SALES", "CVR"]
        : candidate.character === "gro"
          ? ["CTR", "CVR", "CPA", "ROAS", "SPEND", "SALES"]
          : ["SALES", "MARGIN", "ROAS"],
  };
}

function buildPerformanceCheckpoints(
  approvalRequests: ApprovalRequest[],
  generatedAt: string,
): PerformanceCheckpoint[] {
  return approvalRequests
    .filter((request) => request.status === "PENDING")
    .flatMap((request) =>
      request.executionPlan.measurementPlan.checkpoints.map((checkpoint) => ({
        id: `checkpoint-${request.id}-${checkpoint.label.toLowerCase().replace("+", "plus")}`,
        approvalRequestId: request.id,
        title: `${request.title} ${checkpoint.label} 성과 확인`,
        dueDate: checkpoint.dueDate,
        metrics: request.executionPlan.measurementPlan.metrics,
        status: "PENDING" as const,
        createdAt: generatedAt,
      })),
    );
}

function latestSyncedReport<
  K extends
    | "commerceAggregateSnapshot"
    | "shopAggregateSnapshot"
    | "searchAdPerformanceSnapshots"
    | "shoppingSearchAdPerformanceSnapshots",
>(
  reports: ProviderSyncReport[],
  provider: ProviderSyncReport["provider"],
  snapshotKey: K,
): ProviderSyncReport | undefined {
  return reports
    .filter((report) => report.provider === provider && report.status === "SYNCED" && Boolean(report[snapshotKey]))
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
}

function resolveReportSignal(report: ProviderSyncReport, signalsById: Map<string, Signal>): Signal | undefined {
  if (report.generatedSignal) {
    return signalsById.get(report.generatedSignal.id) ?? report.generatedSignal;
  }

  return undefined;
}

function requireSnapshot<TSnapshot extends CommerceAggregateSnapshot | ShopAggregateSnapshot | undefined>(
  snapshot: TSnapshot,
  key: string,
): Exclude<TSnapshot, undefined> {
  if (!snapshot) {
    throw new Error(`${key} is required for provider signal agenda`);
  }

  return snapshot as Exclude<TSnapshot, undefined>;
}

function workTypeFromCharacter(character: CharacterKey): ExecutionPlan["workType"] {
  if (character === "gro") {
    return "SEARCH_AD_BID_BUDGET";
  }

  if (character === "pro") {
    return "PRODUCT_DRAFT";
  }

  if (character === "ripi") {
    return "CRM_DRAFT";
  }

  return "INTERNAL_TASK";
}

function executorKeyFromCharacter(character: CharacterKey): string {
  const keys: Partial<Record<CharacterKey, string>> = {
    gro: "internal-search-ad-performance-planner",
    pro: "internal-product-opportunity-planner",
    ripi: "internal-crm-draft-planner",
    maru: "internal-margin-channel-reviewer",
  };

  return keys[character] ?? "internal-character-task-planner";
}

function actionFromCharacter(character: CharacterKey): string {
  const actions: Partial<Record<CharacterKey, string>> = {
    gro: "검색광고 저성과 키워드 조정 초안",
    pro: "상품별 키워드/랜딩 초안",
    ripi: "재구매 고객군 CRM 초안",
    maru: "채널 손익/예산 점검안",
  };

  return actions[character] ?? "내부 검토안";
}

function riskFromConfidence(confidence: DataConfidence): RiskLevel {
  return confidence === "READY_TO_APPROVE" ? "LOW" : "MEDIUM";
}

function characterName(character: CharacterKey): string {
  const names: Record<CharacterKey, string> = {
    moa: "모아",
    gro: "그로",
    maru: "마루",
    day: "데이",
    copy: "카피",
    ripi: "리피",
    pro: "프로",
  };

  return names[character];
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBrandKey(value: string | undefined): string {
  return (value ?? "unknown").trim().toLowerCase();
}

function brandLabelFromKey(value: string): string {
  const normalized = normalizeBrandKey(value);
  if (normalized === "stickersee") {
    return "스티커씨";
  }

  if (normalized === "coffeeprint") {
    return "커피프린트";
  }

  return "브랜드 미분류";
}

function groupBy<TItem, TKey>(items: TItem[], keyFn: (item: TItem) => TKey): Map<TKey, TItem[]> {
  const grouped = new Map<TKey, TItem[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  return grouped;
}
