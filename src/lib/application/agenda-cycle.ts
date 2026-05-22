import {
  buildEventComparisonWindow,
  buildEventYoYSignal,
  buildSeasonalKeywordAdPlan,
  evaluateSeasonalKeywordAdPlan,
  triageAgendaCandidates,
} from "../domain";
import type {
  AgendaCandidate,
  ApprovalRequest,
  CharacterKey,
  CharacterReport,
  DataConfidence,
  ExecutionPlan,
  ExecutionResult,
  MarketingCalendarEvent,
  MeasurementPlan,
  MoaSynthesisReport,
  PerformanceCheckpoint,
  RiskLevel,
  SeasonalKeywordAdPlan,
  Signal,
} from "../domain";
import { MockProviderExecutor } from "../integrations/executors/mock-provider-executor";
import { SampleProviderAdapter, type SampleMarketingInput } from "../integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "./memory-workflow-repository";
import type { MarketingWorkflowRepository } from "./workflow-repository";

export type AgendaCycleDependencies = {
  sampleProvider: { collect(): SampleMarketingInput };
  repository: MarketingWorkflowRepository;
};

export type AgendaCycleResult = {
  generatedAt: string;
  events: MarketingCalendarEvent[];
  signals: Signal[];
  seasonalKeywordAdPlans: SeasonalKeywordAdPlan[];
  agendaCandidates: AgendaCandidate[];
  promotedAgendaCandidates: AgendaCandidate[];
  characterReports: CharacterReport[];
  moaSynthesisReport: MoaSynthesisReport;
  approvalRequests: ApprovalRequest[];
  executionResults: ExecutionResult[];
  performanceCheckpoints: PerformanceCheckpoint[];
};

export function runSampleAgendaCycle(): AgendaCycleResult {
  return runAgendaCycle({
    sampleProvider: new SampleProviderAdapter(),
    repository: createMemoryMarketingWorkflowRepository(),
  });
}

// Design Ref: §2.2 + §9.4 — 샘플 입력을 deterministic 안건 루프로 고정한다.
export function runAgendaCycle({ sampleProvider, repository }: AgendaCycleDependencies): AgendaCycleResult {
  const input = sampleProvider.collect();
  const buddhaBirthday = findEvent(input.events, "buddha-birthday");
  const teacherDay = findEvent(input.events, "teacher-day");

  const signals = [
    buildEventYoYSignal({
      id: "signal-buddha-gift-card-yoy",
      event: buddhaBirthday,
      currentYear: input.currentYear,
      baselineYear: input.baselineYear,
      entityType: "keyword",
      entityId: "gift-card",
      title: "부처님오신날 선물카드 수요 증가",
      currentValue: 150,
      baselineValue: 100,
      evidenceRowIds: ["kw-demand-buddha-gift-card", "kw-demand-temple-gift"],
      createdAt: input.generatedAt,
    }),
    buildEventYoYSignal({
      id: "signal-teacher-day-stale-keyword",
      event: teacherDay,
      currentYear: input.currentYear,
      baselineYear: input.baselineYear,
      entityType: "keyword",
      entityId: "teacher-day-bundle",
      title: "스승의날 단체 선물카드 키워드 근거 보강 필요",
      currentValue: 42,
      baselineValue: 39,
      evidenceRowIds: ["kw-demand-teacher-bundle"],
      createdAt: input.generatedAt,
    }),
  ];

  const seasonalKeywordAdPlans = [
    buildSeasonalKeywordAdPlan({
      id: "season-plan-buddha-gift-card",
      productId: "gift-card",
      eventId: buddhaBirthday.id,
      keywordDemandSnapshots: input.keywordDemandSnapshots.filter((snapshot) => snapshot.id !== "kw-demand-teacher-bundle"),
      now: input.generatedAt,
      dailyBudgetCap: 30000,
      bidCap: 900,
      stopConditions: [
        { metric: "SPEND", operator: ">", value: 30000, durationDays: 1 },
        { metric: "ROAS", operator: "<", value: 2.5, durationDays: 2 },
      ],
      landingReadiness: "READY",
    }),
    buildSeasonalKeywordAdPlan({
      id: "season-plan-teacher-day-bundle",
      productId: "gift-card",
      eventId: teacherDay.id,
      keywordDemandSnapshots: input.keywordDemandSnapshots.filter((snapshot) => snapshot.id === "kw-demand-teacher-bundle"),
      now: input.generatedAt,
      stopConditions: [],
      landingReadiness: "DRAFT",
    }),
  ];

  const agendaCandidates = buildAgendaCandidates({
    generatedAt: input.generatedAt,
    signals,
    plans: seasonalKeywordAdPlans,
  });
  const promotedAgendaCandidates = triageAgendaCandidates(agendaCandidates);
  const characterReports = buildCharacterReports(promotedAgendaCandidates, input.generatedAt);
  const moaSynthesisReportId = "moa-synthesis-sample-001";
  const approvalRequests = buildApprovalRequests({
    baselineYear: input.baselineYear,
    currentYear: input.currentYear,
    events: input.events,
    generatedAt: input.generatedAt,
    moaSynthesisReportId,
    plans: seasonalKeywordAdPlans,
    promotedAgendaCandidates,
  });
  const moaSynthesisReport = buildMoaSynthesisReport({
    id: moaSynthesisReportId,
    generatedAt: input.generatedAt,
    characterReports,
    approvalRequests,
  });
  const performanceCheckpoints = buildPerformanceCheckpoints(approvalRequests, input.generatedAt);

  repository.saveSignals(signals);
  repository.saveSeasonalKeywordAdPlans(seasonalKeywordAdPlans);
  repository.saveAgendaCandidates(agendaCandidates);
  repository.saveCharacterReports(characterReports);
  repository.saveApprovalRequests(approvalRequests);
  repository.saveMoaSynthesisReport(moaSynthesisReport);
  repository.savePerformanceCheckpoints(performanceCheckpoints);

  return {
    generatedAt: input.generatedAt,
    events: input.events,
    signals,
    seasonalKeywordAdPlans,
    agendaCandidates,
    promotedAgendaCandidates,
    characterReports,
    moaSynthesisReport,
    approvalRequests,
    executionResults: repository.listExecutionResults(),
    performanceCheckpoints,
  };
}

export function executeApprovalWithMockGateClosed(approvalRequest: ApprovalRequest): ExecutionResult {
  const executor = new MockProviderExecutor({ externalWriteEnabled: false });
  return executor.execute(approvalRequest);
}

function buildAgendaCandidates(input: {
  generatedAt: string;
  signals: Signal[];
  plans: SeasonalKeywordAdPlan[];
}): AgendaCandidate[] {
  return input.plans.map((plan) => {
    const guard = evaluateSeasonalKeywordAdPlan(plan);
    const relatedSignal = input.signals.find((signal) => signal.evidenceRowIds.some((id) => plan.evidenceIds.includes(id)));
    const isReady = guard.approvable;

    return {
      id: `agenda-${plan.id}`,
      character: isReady ? "gro" : "day",
      title: isReady ? "부처님오신날 선물카드 키워드 테스트 승인안" : "스승의날 키워드 수요 근거 보강",
      summary: isReady
        ? "음력 이벤트 윈도우 기준으로 선물카드 키워드 수요가 확인되어 소액 테스트 캠페인을 상신합니다."
        : "키워드 수요 캐시가 오래됐고 예산/입찰/중지 조건이 없어 결재 전 근거 보강이 필요합니다.",
      severity: isReady ? "HIGH" : "MEDIUM",
      sourceSignalIds: relatedSignal ? [relatedSignal.id] : [],
      opportunityIds: [plan.id],
      dataConfidence: guard.confidence,
      duplicateKey: `seasonal-keyword:${plan.productId}:${plan.eventId}`,
      createdAt: input.generatedAt,
    };
  });
}

function buildCharacterReports(candidates: AgendaCandidate[], generatedAt: string): CharacterReport[] {
  const groupedCandidates = new Map<CharacterKey, AgendaCandidate[]>();
  for (const candidate of candidates) {
    groupedCandidates.set(candidate.character, [...(groupedCandidates.get(candidate.character) ?? []), candidate]);
  }

  return [...groupedCandidates.entries()].map(([character, characterCandidates]) => ({
    id: `report-${character}-${generatedAt.slice(0, 10)}`,
    character,
    title: `${characterName(character)} 보고`,
    summary: `${characterCandidates.length}개 안건을 모아에게 상신했습니다.`,
    agendaCandidateIds: characterCandidates.map((candidate) => candidate.id),
    evidenceIds: characterCandidates.flatMap((candidate) => candidate.sourceSignalIds),
    createdAt: generatedAt,
  }));
}

function buildApprovalRequests(input: {
  baselineYear: number;
  currentYear: number;
  events: MarketingCalendarEvent[];
  generatedAt: string;
  moaSynthesisReportId: string;
  plans: SeasonalKeywordAdPlan[];
  promotedAgendaCandidates: AgendaCandidate[];
}): ApprovalRequest[] {
  return input.promotedAgendaCandidates.map((candidate) => {
    const plan = input.plans.find((item) => candidate.opportunityIds.includes(item.id));
    if (!plan) {
      throw new Error(`${candidate.id}에 연결된 시즌 키워드 광고안이 없습니다.`);
    }

    const event = findEvent(input.events, plan.eventId);
    const executionPlan = buildExecutionPlan({
      event,
      baselineYear: input.baselineYear,
      currentYear: input.currentYear,
      generatedAt: input.generatedAt,
      plan,
      confidence: candidate.dataConfidence,
    });

    return {
      id: `approval-${candidate.id}`,
      title: candidate.title,
      moaSynthesisReportId: input.moaSynthesisReportId,
      evidenceSummary: candidate.summary,
      evidenceIds: Array.from(new Set([...candidate.sourceSignalIds, ...plan.evidenceIds])),
      dataConfidence: candidate.dataConfidence,
      riskLevel: riskFromConfidence(candidate.dataConfidence),
      executionPlan,
      status: candidate.dataConfidence === "READY_TO_APPROVE" ? "PENDING" : "NEEDS_EVIDENCE",
      createdAt: input.generatedAt,
    };
  });
}

function buildExecutionPlan(input: {
  baselineYear: number;
  currentYear: number;
  event: MarketingCalendarEvent;
  generatedAt: string;
  plan: SeasonalKeywordAdPlan;
  confidence: DataConfidence;
}): ExecutionPlan {
  const comparison = buildEventComparisonWindow(input.event, input.currentYear, input.baselineYear);
  const measurementPlan: MeasurementPlan = {
    baselineWindow: comparison.baseline,
    checkpoints: [
      { label: "D+1", dueDate: addDays(input.generatedAt.slice(0, 10), 1) },
      { label: "D+3", dueDate: addDays(input.generatedAt.slice(0, 10), 3) },
      { label: "D+7", dueDate: addDays(input.generatedAt.slice(0, 10), 7) },
    ],
    metrics: ["CTR", "CPA", "ROAS", "SPEND", "SALES"],
  };

  return {
    id: `execution-${input.plan.id}`,
    workType: "SEARCH_AD_KEYWORD",
    beforeState: {
      keywords: [],
      dailyBudgetCap: 0,
    },
    afterState: {
      keywords: input.plan.keywordSet.add,
      negativeCandidates: input.plan.keywordSet.negativeCandidates,
      dailyBudgetCap: input.plan.dailyBudgetCap,
      bidCap: input.plan.bidCap,
    },
    diffSummary:
      input.confidence === "READY_TO_APPROVE"
        ? `${input.event.name} 이벤트용 키워드 ${input.plan.keywordSet.add.length}개를 소액 테스트 캠페인 초안으로 생성합니다.`
        : `${input.event.name} 이벤트용 키워드 안건은 근거 보강 후 다시 상신해야 합니다.`,
    rollbackPlan: input.confidence === "READY_TO_APPROVE" ? "캠페인 초안 삭제 또는 키워드 일괄 pause로 되돌립니다." : undefined,
    measurementPlan,
    executorKey: "mock-search-ad-keyword-executor",
    requiresWriteGate: true,
  };
}

function buildMoaSynthesisReport(input: {
  id: string;
  generatedAt: string;
  characterReports: CharacterReport[];
  approvalRequests: ApprovalRequest[];
}): MoaSynthesisReport {
  const pendingCount = input.approvalRequests.filter((request) => request.status === "PENDING").length;
  const waitingEvidenceCount = input.approvalRequests.filter((request) => request.status === "NEEDS_EVIDENCE").length;

  return {
    id: input.id,
    title: "모아 종합 보고",
    summary: `대표 결재 대기 ${pendingCount}건, 추가 근거 대기 ${waitingEvidenceCount}건으로 정리했습니다.`,
    characterReportIds: input.characterReports.map((report) => report.id),
    approvalRequestIds: input.approvalRequests.map((request) => request.id),
    createdAt: input.generatedAt,
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

function findEvent(events: MarketingCalendarEvent[], eventId: string): MarketingCalendarEvent {
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    throw new Error(`${eventId} 이벤트를 찾을 수 없습니다.`);
  }

  return event;
}

function riskFromConfidence(confidence: DataConfidence): RiskLevel {
  return confidence === "READY_TO_APPROVE" ? "MEDIUM" : "LOW";
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
