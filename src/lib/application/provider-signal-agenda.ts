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

  const agendaCandidates = [
    commerceReport ? buildCommerceAgendaCandidate(commerceReport, signalsById, generatedAt) : undefined,
    shopReport ? buildShopAgendaCandidate(shopReport, signalsById, generatedAt) : undefined,
    commerceReport && shopReport ? buildCrossChannelAgendaCandidate(commerceReport, shopReport, signalsById, generatedAt) : undefined,
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
          : commerceReport ?? shopReport,
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

function buildCrossChannelAgendaCandidate(
  commerceReport: ProviderSyncReport,
  shopReport: ProviderSyncReport,
  signalsById: Map<string, Signal>,
  generatedAt: string,
): AgendaCandidate {
  const commerce = requireSnapshot(commerceReport.commerceAggregateSnapshot, "commerceAggregateSnapshot");
  const shop = requireSnapshot(shopReport.shopAggregateSnapshot, "shopAggregateSnapshot");
  const commerceSignal = resolveReportSignal(commerceReport, signalsById);
  const shopSignal = resolveReportSignal(shopReport, signalsById);
  const confidence = commerce.grossSales > 0 && shop.grossSales > 0 ? "READY_TO_APPROVE" : "EVIDENCE_WEAK";

  return {
    id: `agenda-provider-channel-balance-${slugify(commerce.brandKey)}-${slugify(shop.brandKey)}-${generatedAt.slice(0, 10)}`,
    character: "maru",
    title: "스마트스토어/자체몰 매출 균형 점검 안건",
    summary: `스마트스토어 매출 ${commerce.grossSales.toLocaleString("ko-KR")}원과 자체몰 매출 ${shop.grossSales.toLocaleString("ko-KR")}원을 함께 보니, 광고 예산과 재구매 유도 초안을 같은 안건으로 묶어 검토할 필요가 있습니다.`,
    severity: confidence === "READY_TO_APPROVE" ? "HIGH" : "MEDIUM",
    sourceSignalIds: [commerceSignal?.id, shopSignal?.id].filter((id): id is string => Boolean(id)),
    opportunityIds: [commerce.id, shop.id],
    dataConfidence: confidence,
    duplicateKey: `provider-agenda:channel-balance:${commerce.brandKey}:${shop.brandKey}:${generatedAt.slice(0, 10)}`,
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

  return {
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
    metrics: candidate.character === "ripi" ? ["SALES", "CVR"] : ["SALES", "MARGIN", "ROAS"],
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

function latestSyncedReport<K extends "commerceAggregateSnapshot" | "shopAggregateSnapshot">(
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
    pro: "internal-product-opportunity-planner",
    ripi: "internal-crm-draft-planner",
    maru: "internal-margin-channel-reviewer",
  };

  return keys[character] ?? "internal-character-task-planner";
}

function actionFromCharacter(character: CharacterKey): string {
  const actions: Partial<Record<CharacterKey, string>> = {
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
