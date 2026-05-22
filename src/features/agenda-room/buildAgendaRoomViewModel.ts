import { runSampleAgendaCycle } from "@/lib/application/agenda-cycle";
import { processOwnerDecision } from "@/lib/application/approval-workflow";
import {
  buildProductGrowthOpportunities,
  type ProductGrowthOpportunity,
} from "@/lib/application/product-growth-opportunities";
import { buildProviderSignalAgendaArtifacts } from "@/lib/application/provider-signal-agenda";
import {
  getProviderHistoryPolicy,
  type AgendaCandidate,
  type AgentRun,
  type ApprovalRequest,
  type CharacterKey,
  type CharacterReport,
  type LlmPlannerAuditRun,
  type LlmPlannerResult,
  type MarketingCalendarEvent,
  type OwnerDecisionType,
  type ProviderReadinessReport,
  type ProviderSyncReport,
  type SeasonalKeywordAdPlan,
} from "@/lib/domain";
import { recordPlannerAgentRun } from "@/lib/application/agent-run-recorder";
import { buildProviderReadinessReports } from "@/lib/integrations/providers/readiness";
import { buildDeterministicPlannerResult, buildPlannerAuditRun, buildPlannerInputFromApprovals } from "@/lib/llm/planner";
import type { MarketingWorkflowRepository } from "@/lib/persistence/repositories";
import { buildLlmCostGovernanceView } from "./buildLlmCostGovernanceView";
import { buildProviderDataContracts } from "./provider-data-contracts";
import type {
  AgendaRoomViewModel,
  ApprovalPreviewView,
  InboxBucketView,
  OwnerDecisionFlowView,
  SeasonalKeywordPlanView,
} from "./types";

export type BuildAgendaRoomViewModelInput = {
  env?: Record<string, string | undefined>;
  repository?: MarketingWorkflowRepository;
};

// Design Ref: §2.2 + §9.4 — 샘플 workflow 결과를 대표 업무실 view model로 변환한다.
export function buildAgendaRoomViewModel(input: BuildAgendaRoomViewModelInput = {}): AgendaRoomViewModel {
  const agendaCycle = runSampleAgendaCycle();
  const providerSyncReports = input.repository?.listProviderSyncReports() ?? [];
  const providerArtifacts = input.repository
    ? buildProviderSignalAgendaArtifacts({
        signals: input.repository.listSignals(),
        providerSyncReports,
        generatedAt: agendaCycle.generatedAt,
        moaSynthesisReportId: agendaCycle.moaSynthesisReport.id,
      })
    : {
        agendaCandidates: [],
        characterReports: [],
        approvalRequests: [],
        performanceCheckpoints: [],
      };
  const productGrowthOpportunities = buildProductGrowthOpportunities({
    providerSyncReports,
    generatedAt: agendaCycle.generatedAt,
  });
  const persistedProviderApprovalById = new Map(
    (input.repository?.listApprovalRequests() ?? [])
      .filter(isProviderApprovalRequest)
      .map((approval) => [approval.id, approval]),
  );
  const providerApprovalRequests = providerArtifacts.approvalRequests.map(
    (request) => persistedProviderApprovalById.get(request.id) ?? request,
  );
  const allApprovalRequests = [...agendaCycle.approvalRequests, ...providerApprovalRequests];
  const allAgendaCandidates = [...agendaCycle.agendaCandidates, ...providerArtifacts.agendaCandidates];
  const allCharacterReports = [...agendaCycle.characterReports, ...providerArtifacts.characterReports];
  const allPerformanceCheckpoints = [...agendaCycle.performanceCheckpoints, ...providerArtifacts.performanceCheckpoints];
  const candidateByApprovalId = new Map(allAgendaCandidates.map((candidate) => [`approval-${candidate.id}`, candidate]));
  const eventsById = new Map(agendaCycle.events.map((event) => [event.id, event]));
  const plansById = new Map(agendaCycle.seasonalKeywordAdPlans.map((plan) => [plan.id, plan]));
  const providerReadiness = buildProviderReadinessReports(input.env ?? process.env, agendaCycle.generatedAt);
  const plannerInput = buildPlannerInputFromApprovals(allApprovalRequests, agendaCycle.generatedAt);
  const plannerResult = buildDeterministicPlannerResult(plannerInput);
  const plannerAudit = buildPlannerAuditRun(plannerInput, plannerResult, {
    env: input.env ?? process.env,
    providerEvidenceNoteCount:
      providerReadiness.flatMap((provider) => provider.evidenceNotes).length +
      providerSyncReports.flatMap((report) => report.evidenceNotes).length,
  });
  if (input.repository) {
    recordPlannerAgentRun(input.repository, plannerInput, plannerResult, plannerAudit);
  }
  const agentRuns = input.repository?.listAgentRuns() ?? [];
  const pendingApprovals = allApprovalRequests.filter((request) => request.status === "PENDING");
  const waitingEvidence = allApprovalRequests.filter((request) => request.status === "NEEDS_EVIDENCE");
  const ownerDecisionFlows = pendingApprovals
    .slice(0, providerSyncReports.length > 0 ? 2 : 1)
    .map((request) => buildOwnerDecisionFlowView(request, agendaCycle.generatedAt, providerSyncReports));
  const failedExecutionCount =
    agendaCycle.executionResults.filter((result) => result.state !== "APPLIED").length +
    ownerDecisionFlows.filter((flow) => flow.executionStateLabel !== "실행됨").length;

  return {
    generatedAt: formatKoreanDateTime(agendaCycle.generatedAt),
    moaReport: {
      title: agendaCycle.moaSynthesisReport.title,
      summary: buildMoaSummary(allApprovalRequests, providerArtifacts.agendaCandidates.length),
      reportCount: allCharacterReports.length,
    },
    summary: {
      waitingApproval: pendingApprovals.length,
      waitingEvidence: waitingEvidence.length,
      readyToApply: allApprovalRequests.filter((request) => request.dataConfidence === "READY_TO_APPROVE").length,
      failedExecutions: failedExecutionCount,
    },
    inboxBuckets: buildInboxBuckets({
      approvalCount: pendingApprovals.length,
      seasonalKeywordCount: agendaCycle.seasonalKeywordAdPlans.length,
      trackingCount: allPerformanceCheckpoints.length,
      waitingEvidenceCount: waitingEvidence.length,
      autoHoldCount: allAgendaCandidates.length - agendaCycle.promotedAgendaCandidates.length - providerArtifacts.agendaCandidates.length,
      failedExecutionCount,
    }),
    characters: buildCharacterStatuses(allCharacterReports),
    agendaCards: allApprovalRequests.map((request) =>
      buildAgendaCardView(
        request,
        plansById.get(planIdFromExecutionId(request.executionPlan.id)),
        candidateByApprovalId.get(request.id)?.character,
      ),
    ),
    seasonalKeywordPlans: agendaCycle.seasonalKeywordAdPlans.map((plan) =>
      buildSeasonalKeywordPlanView(plan, eventsById.get(plan.eventId)),
    ),
    approvalPreviews: allApprovalRequests.map((request) =>
      buildApprovalPreviewView(
        request,
        plansById.get(planIdFromExecutionId(request.executionPlan.id)),
        input.repository,
        providerSyncReports,
      ),
    ),
    ownerDecisionFlows,
    providerDataContracts: buildProviderDataContracts(),
    providerReadiness: providerReadiness.map(buildProviderReadinessView),
    providerSyncEvidence: buildProviderSyncEvidenceViews(providerSyncReports),
    plannerPreview: buildPlannerPreviewView(plannerResult, plannerAudit),
    llmCostGovernance: buildLlmCostGovernanceView({
      env: input.env ?? process.env,
      generatedAt: agendaCycle.generatedAt,
      plannerAudit,
      agentRuns,
      providerReadiness,
    }),
    agentRunSummary: buildAgentRunSummaryView(agentRuns),
    productGrowthOpportunities: productGrowthOpportunities.map(buildProductGrowthOpportunityView),
    executionResults: [
      ...ownerDecisionFlows.map((flow) => ({
        id: `decision-flow-${flow.id}`,
        title: flow.title,
        state: flow.executionStateLabel === "실행됨" ? ("실행됨" as const) : ("차단됨" as const),
        note: flow.executionNote,
      })),
      ...allApprovalRequests
        .filter((request) => request.status !== "PENDING")
        .map((request) => ({
          id: `preview-${request.executionPlan.id}`,
          title: toOperatorKorean(request.executionPlan.diffSummary),
          state: "차단됨" as const,
          note: "데이터 신뢰도와 예산 안전장치가 보강되어야 합니다.",
        })),
    ],
    outcomeCheckpoints: allPerformanceCheckpoints.map((checkpoint) => ({
      id: checkpoint.id,
      title: checkpoint.title,
      metric: checkpoint.metrics.map(metricLabel).join(", "),
      status: "준비",
    })),
  };
}

function buildAgentRunSummaryView(agentRuns: AgentRun[]): AgendaRoomViewModel["agentRunSummary"] {
  const recentRuns = [...agentRuns]
    .sort((left, right) => (right.finishedAt ?? right.startedAt).localeCompare(left.finishedAt ?? left.startedAt))
    .slice(0, 5);
  const totalTokens = agentRuns.reduce((sum, run) => sum + run.tokenUsage.totalTokens, 0);
  const estimatedCostKrw = agentRuns.reduce((sum, run) => sum + run.tokenUsage.estimatedCostKrw, 0);
  const statusCounts = countBy(agentRuns, (run) => run.status);

  return {
    totalRuns: agentRuns.length,
    totalTokensLabel: `${totalTokens.toLocaleString("ko-KR")}토큰`,
    estimatedCostLabel: `${estimatedCostKrw.toLocaleString("ko-KR")}원`,
    statusCountLabels: [
      `성공 ${(statusCounts.get("SUCCEEDED") ?? 0).toLocaleString("ko-KR")}건`,
      `실패 ${(statusCounts.get("FAILED") ?? 0).toLocaleString("ko-KR")}건`,
      `건너뜀 ${(statusCounts.get("SKIPPED") ?? 0).toLocaleString("ko-KR")}건`,
    ],
    recentRuns: recentRuns.map((run, index) => ({
      id: `최근 실행 ${index + 1} · ${agentRunTypeLabel(run.runType)}`,
      runnerLabel: agentRunTypeLabel(run.runType),
      statusLabel: agentRunStatusLabel(run.status),
      modelLabel: `연동 ${agentRunProviderLabel(run.provider)} · 모델 ${agentRunModelLabel(run.model)}`,
      tokenLabel: `${run.tokenUsage.totalTokens.toLocaleString("ko-KR")}토큰${run.tokenUsage.estimated ? " 추정" : ""}`,
      costLabel: `${run.tokenUsage.estimatedCostKrw.toLocaleString("ko-KR")}원`,
      evidenceLabel: `근거 ${run.evidenceIds.length.toLocaleString("ko-KR")}개`,
      finishedAt: formatKoreanDateTime(run.finishedAt ?? run.startedAt),
    })),
  };
}

function countBy<TItem, TKey>(items: TItem[], keyFn: (item: TItem) => TKey): Map<TKey, number> {
  const counts = new Map<TKey, number>();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function agentRunTypeLabel(runType: AgentRun["runType"]): string {
  const labels: Record<AgentRun["runType"], string> = {
    moa_planner: "모아 계획",
    provider_sync: "연동 수집",
    provider_signal_agenda: "연동 안건 생성",
    owner_decision: "대표 결정",
    mock_execution: "모의 실행",
    outcome_analysis: "성과 분석",
  };

  return labels[runType];
}

function agentRunProviderLabel(provider: AgentRun["provider"]): string {
  const labels: Record<AgentRun["provider"], string> = {
    deterministic: "규칙 기반",
    openai: "OpenAI",
    gemini: "Gemini",
    naver: "네이버",
    youngcart: "영카트",
    sample: "샘플",
    local: "로컬",
  };

  return labels[provider];
}

function agentRunModelLabel(model: string): string {
  const labels: Record<string, string> = {
    "deterministic-fallback": "규칙 기반 대체",
    "read-only-adapter": "읽기 전용 어댑터",
    "owner-decision-workflow": "대표 결정 기록기",
  };

  return labels[model] ?? model;
}

function plannerProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    deterministic: "규칙 기반",
    openai: "OpenAI",
    gemini: "Gemini",
    naver: "네이버",
    youngcart: "영카트",
    sample: "샘플",
    local: "로컬",
  };

  return labels[provider] ?? provider;
}

function agentRunStatusLabel(status: AgentRun["status"]): string {
  const labels: Record<AgentRun["status"], string> = {
    SUCCEEDED: "성공",
    FAILED: "실패",
    SKIPPED: "건너뜀",
  };

  return labels[status];
}

function buildInboxBuckets(input: {
  approvalCount: number;
  seasonalKeywordCount: number;
  trackingCount: number;
  waitingEvidenceCount: number;
  autoHoldCount: number;
  failedExecutionCount: number;
}): InboxBucketView[] {
  return [
    {
      id: "TODAY_APPROVAL",
      label: "오늘 결재",
      description: "대표 판단을 기다리는 실행 가능 안건",
      count: input.approvalCount,
      tone: "approval",
    },
    {
      id: "SEASONAL_KEYWORD_REVIEW",
      label: "시즌 키워드",
      description: "음력/양력 이벤트 기준 광고 운영안",
      count: input.seasonalKeywordCount,
      tone: "season",
    },
    {
      id: "TRACKING_OUTCOME",
      label: "성과 추적",
      description: "승인 후 확인할 체크포인트",
      count: input.trackingCount,
      tone: "tracking",
    },
    {
      id: "WAITING_EVIDENCE",
      label: "근거 대기",
      description: "데이 또는 담당자가 보강할 안건",
      count: input.waitingEvidenceCount,
      tone: "evidence",
    },
    {
      id: "AUTO_HOLD",
      label: "자동 보류",
      description: "중복/근거 부족으로 올라오지 않은 후보",
      count: input.autoHoldCount,
      tone: "hold",
    },
    {
      id: "FAILED_EXECUTION",
      label: "실패 실행",
      description: "부분 실패나 수동 처리가 필요한 작업",
      count: input.failedExecutionCount,
      tone: "failure",
    },
  ];
}

function buildAgendaCardView(
  request: ApprovalRequest,
  plan?: SeasonalKeywordAdPlan,
  ownerCharacter?: CharacterKey,
): AgendaRoomViewModel["agendaCards"][number] {
  const providerWork = isProviderApprovalRequest(request);

  return {
    id: request.id,
    owner: ownerNameFromRequest(request, ownerCharacter),
    status: request.status === "PENDING" ? "승인 대기" : "근거 보강",
    title: request.title,
    source: providerWork ? "읽기 전용 연동 수집 + 캐릭터 안건 루프" : "샘플 어댑터 + 도메인 안건 루프",
    signal: toOperatorKorean(request.evidenceSummary),
    decision: toOperatorKorean(request.executionPlan.diffSummary),
    expectedImpact:
      providerWork
        ? "상품/CRM/손익 초안을 만들고 대표 결재 이력에 남김"
        : request.dataConfidence === "READY_TO_APPROVE"
          ? "시즌 수요 선점, 예산 상한 내 소액 테스트"
          : "최신 키워드 수요와 안전장치 보강 후 재상신",
    risk: request.executionPlan.requiresWriteGate
      ? request.riskLevel === "MEDIUM"
        ? "외부 반영 전 잠금과 되돌리기 확인 필요"
        : "대표 결재 전 추가 근거 필요"
      : "내부 초안 작업이라 외부 계정에는 바로 쓰지 않음",
    applyScope:
      providerWork
        ? "승인 시 담당 캐릭터 내부 초안과 성과 체크포인트로 기록"
        : request.status === "PENDING"
          ? "승인 시 모의 실행기 또는 연동 잠금으로 전달"
          : "외부 반영 없이 추가 근거 대기",
    evidenceCount: plan?.evidenceIds.length ?? request.evidenceIds.length,
    createdAt: formatKoreanDateTime(request.createdAt),
  };
}

function buildMoaSummary(approvalRequests: ApprovalRequest[], providerAgendaCount: number): string {
  const pendingCount = approvalRequests.filter((request) => request.status === "PENDING").length;
  const waitingEvidenceCount = approvalRequests.filter((request) => request.status === "NEEDS_EVIDENCE").length;

  if (providerAgendaCount > 0) {
    return `대표 결재 대기 ${pendingCount}건, 추가 근거 대기 ${waitingEvidenceCount}건입니다. 그중 ${providerAgendaCount}건은 실제 읽기 전용 연동 집계에서 담당 캐릭터가 올린 안건입니다.`;
  }

  return `대표 결재 대기 ${pendingCount}건, 추가 근거 대기 ${waitingEvidenceCount}건으로 정리했습니다.`;
}

function isProviderApprovalRequest(request: ApprovalRequest): boolean {
  return request.id.startsWith("approval-agenda-provider-");
}

function ownerNameFromRequest(request: ApprovalRequest, ownerCharacter?: CharacterKey): string {
  if (ownerCharacter) {
    return characterName(ownerCharacter);
  }

  if (request.executionPlan.executorKey.includes("product")) {
    return "프로";
  }

  if (request.executionPlan.executorKey.includes("crm")) {
    return "리피";
  }

  if (request.executionPlan.executorKey.includes("margin")) {
    return "마루";
  }

  return request.status === "PENDING" ? "그로" : "데이";
}

function buildSeasonalKeywordPlanView(plan: SeasonalKeywordAdPlan, event?: MarketingCalendarEvent): SeasonalKeywordPlanView {
  const calendarBasis: SeasonalKeywordPlanView["calendarBasis"] = event?.eventType === "solar" ? "양력" : "음력";
  const startOffset = event ? formatOffset(event.windowStartOffsetDays) : "D-n";
  const endOffset = event ? formatOffset(event.windowEndOffsetDays) : "D+n";

  return {
    id: plan.id,
    eventName: event?.name ?? plan.eventId,
    calendarBasis,
    comparisonWindow: `${calendarBasis} 행사일 기준 ${startOffset} ~ ${endOffset}, 전년도 같은 상대일 비교`,
    keywords: [...plan.keywordSet.add, ...plan.keywordSet.negativeCandidates.map((candidate) => candidate.keyword)],
    proposal:
      plan.confidence === "READY_TO_APPROVE"
        ? "소액 테스트 캠페인 초안으로 올리고 승인 후 쓰기 잠금을 확인하는 안건입니다."
        : "최신 키워드 수요와 예산 안전장치를 보강한 뒤 다시 올리는 안건입니다.",
    budgetGuardrail:
      plan.dailyBudgetCap && plan.bidCap
        ? `일예산 ${plan.dailyBudgetCap.toLocaleString("ko-KR")}원, 입찰 상한 ${plan.bidCap.toLocaleString("ko-KR")}원`
        : "예산/입찰/중지 조건 보강 필요",
    nextAction: plan.confidence === "READY_TO_APPROVE" ? "대표 승인 필요" : "데이 근거 보강",
  };
}

function buildApprovalPreviewView(
  request: ApprovalRequest,
  plan?: SeasonalKeywordAdPlan,
  repository?: MarketingWorkflowRepository,
  providerSyncReports: ProviderSyncReport[] = [],
): ApprovalPreviewView {
  const canApply = request.status === "PENDING" && request.dataConfidence === "READY_TO_APPROVE";
  const measurementLabels = request.executionPlan.measurementPlan.checkpoints.map(
    (checkpoint) => `${checkpoint.label} ${checkpoint.dueDate}`,
  );

  return {
    id: request.id,
    title: request.title,
    statusLabel: request.status === "PENDING" ? "대표 승인 대기" : "추가 근거 요청",
    confidenceLabel: confidenceLabel(request.dataConfidence),
    riskLabel: riskLabel(request.riskLevel),
    evidenceSummary: `${toOperatorKorean(request.evidenceSummary)} 근거 ${plan?.evidenceIds.length ?? request.evidenceIds.length}개.`,
    diffSummary: toOperatorKorean(request.executionPlan.diffSummary),
    beforeItems: describeExecutionState(request.executionPlan.beforeState),
    afterItems: describeExecutionState(request.executionPlan.afterState),
    rollbackPlan: request.executionPlan.rollbackPlan ?? "되돌리기 정보가 없어 즉시 반영할 수 없습니다.",
    measurementLabels,
    executorLabel: executorLabel(request.executionPlan.executorKey),
    writeGateLabel: request.executionPlan.requiresWriteGate ? "외부 반영 잠금 확인 필요" : "내부 작업만 실행",
    primaryActionLabel: "승인 후 바로 반영",
    secondaryActions: ["초안만 승인", "수정 요청", "추가 근거 요청", "보류", "반려"],
    disabledReason: canApply ? undefined : disabledReason(request),
    provenance: buildApprovalProvenanceView(request, plan, repository, providerSyncReports),
  };
}

function buildApprovalProvenanceView(
  request: ApprovalRequest,
  plan?: SeasonalKeywordAdPlan,
  repository?: MarketingWorkflowRepository,
  providerSyncReports: ProviderSyncReport[] = [],
): ApprovalPreviewView["provenance"] {
  const evidenceIds = Array.from(new Set([...request.evidenceIds, ...(plan?.evidenceIds ?? [])]));
  const relatedRuns = repository
    ? repository
        .listAgentRunsForWorkflowObject({ objectType: "approval_request", objectId: request.id })
        .sort((left, right) => (right.finishedAt ?? right.startedAt).localeCompare(left.finishedAt ?? left.startedAt))
    : [];
  const relatedReports = providerSyncReports.filter((report) => hasSharedEvidence(providerEvidenceIds(report), evidenceIds));
  const providerEvidenceGroups = compactProviderEvidenceReports(relatedReports);
  const checkpointLabels = request.executionPlan.measurementPlan.checkpoints.map(
    (checkpoint) =>
      `${checkpoint.label} ${checkpoint.dueDate} · ${request.executionPlan.measurementPlan.metrics.map(metricLabel).join(", ")}`,
  );

  return {
    summaryLabel: `근거 ${evidenceIds.length.toLocaleString("ko-KR")}개 · 실행 이력 ${relatedRuns.length.toLocaleString(
      "ko-KR",
    )}개 · 연동 수집 ${providerEvidenceGroups.length.toLocaleString("ko-KR")}개${
      relatedReports.length > providerEvidenceGroups.length ? ` (누적 ${relatedReports.length.toLocaleString("ko-KR")}회)` : ""
    }`,
    evidenceLabels: buildEvidenceCategoryLabels(evidenceIds),
    agentRunLabels:
      relatedRuns.length > 0
        ? relatedRuns
            .slice(0, 3)
            .map(
              (run) =>
                `${agentRunTypeLabel(run.runType)} · ${agentRunStatusLabel(run.status)} · ${run.tokenUsage.totalTokens.toLocaleString(
                  "ko-KR",
                )}토큰${run.tokenUsage.estimated ? " 추정" : ""}`,
            )
        : ["연결된 AI 실행 이력 없음"],
    providerEvidenceLabels:
      providerEvidenceGroups.length > 0
        ? providerEvidenceGroups.map((group) => buildProviderEvidenceGroupLabel(group.latestReport, group.reportCount))
        : ["직접 연결된 연동 수집 기록 없음"],
    checkpointLabels,
    safetyLabels: [
      `데이터 ${confidenceLabel(request.dataConfidence)}`,
      `위험 ${riskLabel(request.riskLevel)}`,
      request.executionPlan.requiresWriteGate ? "외부 반영 잠금 확인 필요" : "내부 작업만 실행",
      "원천 행 제외",
    ],
  };
}

function buildEvidenceCategoryLabels(evidenceIds: string[]): string[] {
  if (evidenceIds.length === 0) {
    return ["근거 없음"];
  }

  const categoryCounts = countBy(evidenceIds, evidenceCategoryLabel);

  return [...categoryCounts.entries()].map(([category, count]) => `${category} ${count.toLocaleString("ko-KR")}개`);
}

function evidenceCategoryLabel(evidenceId: string): string {
  if (evidenceId.includes("kw-demand") || evidenceId.includes("keyword")) {
    return "키워드 수요";
  }

  if (evidenceId.includes("search-trend") || evidenceId.includes("trend")) {
    return "검색 추이";
  }

  if (evidenceId.includes("commerce") || evidenceId.includes("smartstore")) {
    return "스마트스토어 집계";
  }

  if (evidenceId.includes("shop") || evidenceId.includes("youngcart")) {
    return "쇼핑몰 집계";
  }

  if (evidenceId.includes("signal")) {
    return "데이터 시그널";
  }

  return "근거";
}

function providerEvidenceIds(report: ProviderSyncReport): string[] {
  return [
    report.id,
    report.generatedSignal?.id,
    ...(report.generatedSignal?.evidenceRowIds ?? []),
    ...(report.keywordDemandSnapshots ?? []).map((snapshot) => snapshot.id),
    ...(report.searchTrendSnapshots ?? []).map((snapshot) => snapshot.id),
    report.commerceAggregateSnapshot?.id,
    report.shopAggregateSnapshot?.id,
  ].filter((id): id is string => Boolean(id));
}

function hasSharedEvidence(leftIds: string[], rightIds: string[]): boolean {
  const rightSet = new Set(rightIds);

  return leftIds.some((id) => rightSet.has(id));
}

type ProviderEvidenceGroup = {
  provider: ProviderSyncReport["provider"];
  latestReport: ProviderSyncReport;
  reportCount: number;
};

function compactProviderEvidenceReports(reports: ProviderSyncReport[]): ProviderEvidenceGroup[] {
  const reportsByProvider = new Map<ProviderSyncReport["provider"], ProviderSyncReport[]>();

  for (const report of reports) {
    const providerReports = reportsByProvider.get(report.provider) ?? [];
    providerReports.push(report);
    reportsByProvider.set(report.provider, providerReports);
  }

  const providerOrder: ProviderSyncReport["provider"][] = ["search_ad", "datalab", "smartstore", "shop"];

  return providerOrder
    .map((provider) => {
      const providerReports = reportsByProvider.get(provider);
      if (!providerReports?.length) {
        return undefined;
      }

      const latestReport = [...providerReports].sort((left, right) => right.checkedAt.localeCompare(left.checkedAt))[0];
      return {
        provider,
        latestReport,
        reportCount: providerReports.length,
      };
    })
    .filter((group): group is ProviderEvidenceGroup => Boolean(group));
}

function buildProviderEvidenceGroupLabel(report: ProviderSyncReport, reportCount: number): string {
  const snapshotLabels = buildProviderSnapshotLabels(report).slice(0, 2);
  const historyLabel = reportCount > 1 ? ` · 누적 ${reportCount.toLocaleString("ko-KR")}회` : "";

  return `${providerKeyLabel(report.provider)} · 최신 ${providerSyncStatusLabel(report.status)}${
    snapshotLabels.length > 0 ? ` · ${snapshotLabels.join(", ")}` : ""
  }${historyLabel}`;
}

function buildOwnerDecisionFlowView(
  request: ApprovalRequest,
  now: string,
  providerSyncReports: ProviderSyncReport[] = [],
): OwnerDecisionFlowView {
  const result = processOwnerDecision({
    approvalRequest: request,
    decision: "APPROVE_AND_APPLY",
    memo: "샘플 기준으로 소액 테스트를 승인하되 실제 외부 반영은 닫아둡니다.",
    now,
    externalWriteEnabled: false,
    providerSyncReports,
  });
  const executionState = result.executionResult?.state ?? "FAILED";

  return {
    id: result.ownerDecision.id,
    title: request.title,
    decisionLabel: decisionLabel(result.ownerDecision.decision),
    memo: result.ownerDecision.memo,
    preflightStatusLabel: result.preflightCheck?.status === "PASSED" ? "실행 전 점검 통과" : "실행 전 점검 차단",
    preflightChecks:
      result.preflightCheck?.checks.map((check) => ({
        label: check.label,
        status: preflightStatusLabel(check.status),
        message: check.message,
      })) ?? [],
    executionStateLabel: executionStateLabel(executionState),
    executionNote:
      executionState === "NEEDS_MANUAL_ACTION"
        ? "대표 승인은 기록됐지만 실제 외부 반영 잠금이 닫혀 외부 계정에는 쓰지 않았습니다."
        : "모의 실행이 기록되었습니다.",
    outcomeStateLabel: outcomeStateLabel(result.outcomeReport?.state ?? "INCONCLUSIVE"),
    outcomeSummary: result.outcomeReport?.summary ?? "성과 판단은 체크포인트 도래 후 진행합니다.",
    outcomeEvidenceLabels: result.outcomeReport?.evidenceLabels ?? [],
    followUpTasks: result.followUpTasks.map((task) => `${characterName(task.assignedCharacter)}: ${task.title}`),
  };
}

function buildProviderSyncEvidenceViews(reports: ProviderSyncReport[]): AgendaRoomViewModel["providerSyncEvidence"] {
  const latestReports = new Map<ProviderSyncReport["provider"], ProviderSyncReport>();
  for (const report of [...reports].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))) {
    if (!latestReports.has(report.provider)) {
      latestReports.set(report.provider, report);
    }
  }

  return (["search_ad", "datalab", "smartstore", "shop"] satisfies ProviderSyncReport["provider"][])
    .map((provider) => latestReports.get(provider))
    .filter((report): report is ProviderSyncReport => Boolean(report))
    .map(buildProviderSyncEvidenceView);
}

function buildProviderSyncEvidenceView(report: ProviderSyncReport): AgendaRoomViewModel["providerSyncEvidence"][number] {
  const providerDisplay = buildProviderDisplayInfo(report);
  const snapshotLabels = buildProviderSnapshotLabels(report);
  const historyPolicy = report.historyPolicy ?? getProviderHistoryPolicy(report.provider);
  const evidenceCount =
    snapshotLabels.length +
    (report.keywordDemandSnapshots?.length ?? 0) +
    (report.searchTrendSnapshots?.length ?? 0) +
    (report.generatedSignal ? 1 : 0);

  return {
    id: report.id,
    label: toOperatorKorean(report.label),
    providerKey: report.provider,
    ...providerDisplay,
    statusLabel: providerSyncStatusLabel(report.status),
    tone: providerSyncTone(report),
    checkedAt: formatKoreanDateTime(report.checkedAt),
    endpointLabel: report.endpoint,
    httpStatusLabel: report.httpStatus ? `응답 ${report.httpStatus}` : "응답 기록 없음",
    readOnlyLabel: report.readOnly ? "읽기 전용" : "쓰기 가능",
    networkLabel: report.networkAttempted ? "실제 조회" : "로컬 판정",
    writeLabel: report.writeAttempted ? "외부 쓰기 시도 있음" : "쓰기 시도 없음",
    evidenceCountLabel: `근거 ${evidenceCount.toLocaleString("ko-KR")}개`,
    snapshotLabels,
    missingEnvKeys: report.missingEnvKeys,
    notes: report.evidenceNotes.slice(0, 3).map(toOperatorKorean),
    failureReason: report.failureReason ? toOperatorKorean(report.failureReason) : undefined,
    sourceUrl: report.sourceUrl,
    historyPolicy: {
      apiLimitLabel: historyPolicy.apiLimitLabel,
      requestWindowLabel: historyPolicy.requestWindowLabel,
      backfillLabel: historyPolicy.backfillLabel,
      dailySnapshotLabel: historyPolicy.dailySnapshotLabel,
      seasonalityLabel: historyPolicy.seasonalityLabel,
      storageLabel: historyPolicy.storageLabel,
      costGuardLabel: historyPolicy.costGuardLabel,
      sourceUrl: historyPolicy.sourceUrl,
    },
  };
}

function buildProductGrowthOpportunityView(opportunity: ProductGrowthOpportunity): AgendaRoomViewModel["productGrowthOpportunities"][number] {
  return {
    id: opportunity.id,
    owner: characterName(opportunity.owner),
    kindLabel: opportunityKindLabel(opportunity.kind),
    confidenceLabel: confidenceLabel(opportunity.confidence),
    title: toOperatorKorean(opportunity.title),
    targetLabel: toOperatorKorean(opportunity.targetName),
    summary: toOperatorKorean(opportunity.summary),
    keywords: opportunity.keywordCandidates,
    evidenceLabels: opportunity.evidenceLabels.map(toOperatorKorean),
    nextAction: toOperatorKorean(opportunity.nextAction),
    guardrail: toOperatorKorean(opportunity.guardrail),
    sourceReportIds: opportunity.sourceReportIds.map((_, index) => `연동 수집 기록 ${index + 1}`),
  };
}

function buildProviderReadinessView(report: ProviderReadinessReport): AgendaRoomViewModel["providerReadiness"][number] {
  return {
    id: report.provider,
    label: report.label,
    statusLabel: providerStatusLabel(report),
    tone: providerTone(report),
    canReadLabel: report.canRead ? "읽기 가능" : "읽기 대기",
    canWriteLabel: report.canWrite ? "쓰기 가능" : "쓰기 차단",
    readScope: toOperatorKorean(report.readScope),
    writeScope: toOperatorKorean(report.writeScope),
    missingEnvKeys: report.missingEnvKeys,
    notes: report.evidenceNotes.map(toOperatorKorean),
    sourceUrl: report.sourceUrl,
  };
}

function buildPlannerPreviewView(
  result: LlmPlannerResult,
  audit: LlmPlannerAuditRun,
): AgendaRoomViewModel["plannerPreview"] {
  return {
    title: result.title,
    modeLabel: result.mode === "deterministic_fallback" ? "규칙 기반 대체" : "AI 호출 준비",
    summary: result.summary,
    selectedAgendaIds: result.recommendedApprovalIds,
    evidenceIds: result.evidenceIds,
    tokenEstimateLabel: `예상 ${result.tokenEstimate.toLocaleString("ko-KR")}토큰`,
    rawRowsLabel: result.rawRowsIncluded ? "원천 행 포함" : "원천 행 제외",
    constraints: ["집계 요약만 사용", "근거 ID 유지", "외부 반영 불가", "고객 식별 정보 제외"],
    audit: {
      runId: "모아 계획 실행 기록",
      inputId: "입력 요약",
      resultId: "결과 요약",
      providerLabel: `연동 ${plannerProviderLabel(audit.provider)}`,
      modelLabel: `모델 ${agentRunModelLabel(audit.model)}`,
      tokenUsageLabel: `${audit.tokenUsage.totalEstimate.toLocaleString("ko-KR")}토큰 추정`,
      billingLabel:
        audit.billing.state === "NOT_BILLED_FALLBACK"
          ? "과금 없음"
          : `약 ${audit.billing.estimatedCostKrw.toLocaleString("ko-KR")}원`,
      sourceCountLabels: [
        `후보 ${audit.sourceCounts.candidateSummaries.toLocaleString("ko-KR")}건`,
        `선택 ${audit.sourceCounts.selectedApprovals.toLocaleString("ko-KR")}건`,
        `근거 ${audit.sourceCounts.evidenceIds.toLocaleString("ko-KR")}개`,
        `연동 메모 ${audit.sourceCounts.providerEvidenceNotes.toLocaleString("ko-KR")}개`,
      ],
      evidenceTraceLabel: `근거 ${audit.evidenceIds.length.toLocaleString("ko-KR")}개 연결`,
    },
  };
}

function buildCharacterStatuses(characterReports: CharacterReport[]): AgendaRoomViewModel["characters"] {
  const queueCounts = new Map<CharacterKey, number>();
  for (const report of characterReports) {
    queueCounts.set(report.character, (queueCounts.get(report.character) ?? 0) + report.agendaCandidateIds.length);
  }
  const activeSet = new Set(queueCounts.keys());

  return [
    {
      id: "moa",
      name: "모아",
      role: "업무실장",
      tone: "coordinator",
      status: "하위 보고를 대표 결재 요청으로 묶는 중",
      workload: 72,
      queueCount: characterReports.length,
    },
    {
      id: "gro",
      name: "그로",
      role: "성장 담당",
      tone: "growth",
      status: activeSet.has("gro") ? "시즌 키워드 테스트 안건 상신" : "신규 성장 안건 없음",
      workload: 66,
      queueCount: queueCounts.get("gro") ?? 0,
    },
    {
      id: "pro",
      name: "프로",
      role: "상품 담당",
      tone: "product",
      status: activeSet.has("pro") ? "스마트스토어 상품/키워드 안건 상신" : "상품 묶음 후보 대기",
      workload: 42,
      queueCount: queueCounts.get("pro") ?? 0,
    },
    {
      id: "copy",
      name: "카피",
      role: "메시지 담당",
      tone: "copy",
      status: "승인 후 문구 초안 준비",
      workload: 38,
      queueCount: 0,
    },
    {
      id: "ripi",
      name: "리피",
      role: "재구매 담당",
      tone: "crm",
      status: activeSet.has("ripi") ? "영카트 재구매 고객군 안건 상신" : "이벤트 구매 고객군 관찰",
      workload: 33,
      queueCount: queueCounts.get("ripi") ?? 0,
    },
    {
      id: "maru",
      name: "마루",
      role: "손익 담당",
      tone: "finance",
      status: activeSet.has("maru") ? "채널 매출 균형 점검안 상신" : "예산 상한과 마진 조건 확인",
      workload: 58,
      queueCount: queueCounts.get("maru") ?? 0,
    },
    {
      id: "day",
      name: "데이",
      role: "데이터 담당",
      tone: "data",
      status: activeSet.has("day") ? "오래된 키워드 근거 보강 요청" : "데이터 품질 정상",
      workload: 63,
      queueCount: queueCounts.get("day") ?? 0,
    },
  ];
}

function providerStatusLabel(report: ProviderReadinessReport): string {
  if (report.status === "READY") {
    return "읽기/쓰기 준비";
  }

  if (report.status === "READ_ONLY_READY") {
    return "읽기 준비";
  }

  if (report.status === "MISSING_CONFIG") {
    return "설정 필요";
  }

  if (report.status === "WRITE_DISABLED") {
    return "쓰기 차단";
  }

  return "차단";
}

function providerTone(report: ProviderReadinessReport): AgendaRoomViewModel["providerReadiness"][number]["tone"] {
  if (report.status === "READY") {
    return "ready";
  }

  if (report.status === "READ_ONLY_READY") {
    return "warning";
  }

  return "blocked";
}

function providerSyncStatusLabel(status: ProviderSyncReport["status"]): string {
  const labels: Record<ProviderSyncReport["status"], string> = {
    SYNCED: "동기화 완료",
    READY_READ_ONLY: "읽기 준비",
    SKIPPED_MISSING_CONFIG: "설정 누락",
    FAILED: "동기화 실패",
  };

  return labels[status];
}

function providerSyncTone(report: ProviderSyncReport): AgendaRoomViewModel["providerSyncEvidence"][number]["tone"] {
  if (report.status === "SYNCED") {
    return "ready";
  }

  if (report.status === "READY_READ_ONLY" || report.status === "SKIPPED_MISSING_CONFIG") {
    return "warning";
  }

  return "blocked";
}

function providerKeyLabel(provider: ProviderSyncReport["provider"]): string {
  const labels: Record<ProviderSyncReport["provider"], string> = {
    search_ad: "네이버 키워드광고",
    datalab: "네이버 데이터랩",
    smartstore: "스마트스토어(스티커씨)",
    shop: "쇼핑몰(커피프린트)",
  };

  return labels[provider];
}

type ProviderDisplayInfo = Pick<
  AgendaRoomViewModel["providerSyncEvidence"][number],
  "providerGroup" | "channelKey" | "channelLabel" | "brandLabel" | "providerLabel"
>;

function buildProviderDisplayInfo(report: ProviderSyncReport): ProviderDisplayInfo {
  if (report.provider === "smartstore") {
    const brandKey = report.commerceAggregateSnapshot?.brandKey ?? "STICKERSEE";
    const brandLabel = brandDisplayName(brandKey);
    const channelLabel = `스마트스토어(${brandLabel})`;

    return {
      providerGroup: "commerce",
      channelKey: `smartstore-${brandSlug(brandKey)}`,
      channelLabel,
      brandLabel,
      providerLabel: channelLabel,
    };
  }

  if (report.provider === "shop") {
    const brandKey = report.shopAggregateSnapshot?.brandKey ?? "COFFEEPRINT";
    const brandLabel = brandDisplayName(brandKey);
    const channelLabel = `쇼핑몰(${brandLabel})`;

    return {
      providerGroup: "commerce",
      channelKey: `shop-${brandSlug(brandKey)}`,
      channelLabel,
      brandLabel,
      providerLabel: channelLabel,
    };
  }

  if (report.provider === "datalab") {
    return {
      providerGroup: "trend",
      channelKey: "datalab",
      channelLabel: providerKeyLabel(report.provider),
      providerLabel: providerKeyLabel(report.provider),
    };
  }

  return {
    providerGroup: "ad",
    channelKey: "search-ad",
    channelLabel: providerKeyLabel(report.provider),
    providerLabel: providerKeyLabel(report.provider),
  };
}

function buildProviderSnapshotLabels(report: ProviderSyncReport): string[] {
  const labels: string[] = [];

  if (report.keywordDemandSnapshots?.length) {
    labels.push(`키워드 수요 ${report.keywordDemandSnapshots.length.toLocaleString("ko-KR")}건`);
  }

  if (report.searchTrendSnapshots?.length) {
    labels.push(`검색 추이 ${report.searchTrendSnapshots.length.toLocaleString("ko-KR")}건`);
  }

  if (report.commerceAggregateSnapshot) {
    const brandLabel = brandDisplayName(report.commerceAggregateSnapshot.brandKey);
    labels.push(`${brandLabel} 주문 ${report.commerceAggregateSnapshot.paidOrderCount.toLocaleString("ko-KR")}건`);
    labels.push(`${brandLabel} 매출 ${report.commerceAggregateSnapshot.grossSales.toLocaleString("ko-KR")}원`);
    if (report.commerceAggregateSnapshot.topProductName) {
      labels.push(`${brandLabel} 상위 상품 ${report.commerceAggregateSnapshot.topProductName}`);
    }
  }

  if (report.shopAggregateSnapshot) {
    const brandLabel = brandDisplayName(report.shopAggregateSnapshot.brandKey);
    labels.push(`${brandLabel} 주문 ${report.shopAggregateSnapshot.orderCount.toLocaleString("ko-KR")}건`);
    labels.push(`${brandLabel} 재구매 ${report.shopAggregateSnapshot.repeatCustomerCount.toLocaleString("ko-KR")}명`);
    labels.push(`${brandLabel} 매출 ${report.shopAggregateSnapshot.grossSales.toLocaleString("ko-KR")}원`);
  }

  if (report.generatedSignal) {
    labels.push(`시그널 ${report.generatedSignal.title}`);
  }

  return labels.length > 0 ? labels : ["저장된 요약 자료 없음"];
}

function brandDisplayName(brandKey: string): string {
  const labels: Record<string, string> = {
    STICKERSEE: "스티커씨",
    SMARTSTORE: "스티커씨",
    COFFEEPRINT: "커피프린트",
    YOUNGCART: "커피프린트",
  };

  return labels[brandKey.trim().toUpperCase()] ?? brandKey;
}

function brandSlug(brandKey: string): string {
  const slug = brandKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unknown";
}

function toOperatorKorean(value: string): string {
  return value
    .replaceAll("쓰기 게이트", "외부 반영 잠금")
    .replaceAll("AgentRun timeline", "AI 실행 이력")
    .replaceAll("AgentRun", "AI 실행 기록")
    .replaceAll("DB mode smoke", "DB 저장 확인")
    .replaceAll("APPROVAL_PENDING", "승인 대기")
    .replaceAll("server env", "서버 환경 설정")
    .replaceAll("Client Credentials", "커머스 인증")
    .replaceAll("client secret", "시크릿")
    .replaceAll("productOrderId", "주문번호")
    .replaceAll("raw order row", "주문 원문 행")
    .replaceAll("raw order", "주문 원문")
    .replaceAll("KeywordDemandSnapshot", "키워드 수요 요약")
    .replaceAll("SearchTrendSnapshot", "검색 추이 요약")
    .replaceAll("bridge", "연결")
    .replaceAll("report", "수집 기록")
    .replaceAll("ROAS", "광고수익률")
    .replaceAll("CTR", "클릭률")
    .replaceAll("CPA", "전환단가")
    .replaceAll("CVR", "전환율")
    .replaceAll("SPEND", "광고비")
    .replaceAll("SALES", "매출")
    .replaceAll("MARGIN", "마진")
    .replaceAll("token-protected", "토큰 보호")
    .replaceAll("read-only sync", "읽기 전용 수집")
    .replaceAll("read-only", "읽기 전용")
    .replaceAll("provider report", "연동 수집 기록")
    .replaceAll("provider", "연동")
    .replaceAll("sync", "수집")
    .replaceAll("snapshot", "요약 자료")
    .replaceAll("aggregate-only", "집계만")
    .replaceAll("aggregate", "집계")
    .replaceAll("raw row", "원천 행")
    .replaceAll("row", "행")
    .replaceAll("write gate", "외부 반영 잠금")
    .replaceAll("write", "외부 반영")
    .replaceAll("mock", "모의")
    .replaceAll("planner", "계획기")
    .replaceAll("endpoint", "주소")
    .replaceAll("tokens", "토큰")
    .replaceAll("token", "토큰")
    .replaceAll("live call", "실제 호출")
    .replaceAll("deterministic fallback", "규칙 기반 대체")
    .replaceAll("fallback", "대체")
    .replaceAll("keyword tool", "키워드 도구")
    .replaceAll("DataLab", "데이터랩")
    .replaceAll("env", "환경 설정")
    .replaceAll("candidate summary", "후보 요약")
    .replaceAll("confidence", "신뢰도")
    .replaceAll("risk", "위험도")
    .replaceAll("evidence id", "근거 ID")
    .replaceAll("서버 환경 설정로", "서버 환경 설정으로")
    .replaceAll("외부 반영 잠금와", "외부 반영 잠금과")
    .replaceAll("주문 원문 행는", "주문 원문 행은")
    .replaceAll("원천 행는", "원천 행은")
    .replaceAll("연결는", "연결은");
}

function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    CTR: "클릭률",
    CPA: "전환단가",
    CVR: "전환율",
    MARGIN: "마진",
    ROAS: "광고수익률",
    SALES: "매출",
    SPEND: "광고비",
  };

  return labels[metric] ?? metric;
}

function opportunityKindLabel(kind: ProductGrowthOpportunity["kind"]): string {
  const labels: Record<ProductGrowthOpportunity["kind"], string> = {
    KEYWORD_EXPANSION: "키워드 확장",
    MARKETING_PROPOSAL: "마케팅 제안",
    PRODUCT_DISCOVERY: "상품 발굴",
  };

  return labels[kind];
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

function formatOffset(offset: number): string {
  if (offset === 0) {
    return "D-day";
  }

  return offset > 0 ? `D+${offset}` : `D${offset}`;
}

function formatKoreanDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function planIdFromExecutionId(executionPlanId: string): string {
  return executionPlanId.replace(/^execution-/, "");
}

function describeExecutionState(state: unknown): string[] {
  if (!isRecord(state)) {
    return ["상태 정보 없음"];
  }

  const items: string[] = [];
  if (Array.isArray(state.keywords)) {
    items.push(state.keywords.length > 0 ? `키워드 ${state.keywords.join(", ")}` : "키워드 없음");
  }

  if (typeof state.provider === "string") {
    items.push(`연동 ${state.provider}`);
  }

  if (typeof state.internalDraft === "string") {
    items.push(`내부 초안 ${state.internalDraft}`);
  }

  if (typeof state.nextAction === "string") {
    items.push(`다음 작업 ${state.nextAction}`);
  }

  if (Array.isArray(state.evidenceIds) && state.evidenceIds.length > 0) {
    items.push(`근거 ${state.evidenceIds.length.toLocaleString("ko-KR")}개`);
  }

  if (Array.isArray(state.opportunityIds) && state.opportunityIds.length > 0) {
    items.push(`기회 ${state.opportunityIds.length.toLocaleString("ko-KR")}개`);
  }

  if (Array.isArray(state.negativeCandidates) && state.negativeCandidates.length > 0) {
    items.push(
      `제외 후보 ${state.negativeCandidates
        .map((candidate) => (isRecord(candidate) && typeof candidate.keyword === "string" ? candidate.keyword : undefined))
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  if (typeof state.dailyBudgetCap === "number") {
    items.push(`일예산 ${state.dailyBudgetCap.toLocaleString("ko-KR")}원`);
  }

  if (typeof state.bidCap === "number") {
    items.push(`입찰 상한 ${state.bidCap.toLocaleString("ko-KR")}원`);
  }

  return items.length > 0 ? items : ["변경 항목 없음"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function confidenceLabel(confidence: ApprovalRequest["dataConfidence"]): string {
  const labels: Record<ApprovalRequest["dataConfidence"], string> = {
    READY_TO_APPROVE: "승인 가능",
    EVIDENCE_WEAK: "근거 약함",
    SEASONAL_CONTEXT_REQUIRED: "시즌 보정 필요",
    LUNAR_EVENT_CONTEXT_REQUIRED: "음력 기준 확인 필요",
    KEYWORD_DEMAND_STALE: "키워드 수요 오래됨",
    AD_TRACKING_UNVERIFIED: "광고 추적 미확인",
    BUDGET_GUARD_MISSING: "예산 안전장치 부족",
    API_PARTIAL_FAILURE: "일부 수집 실패",
    INSUFFICIENT_HISTORY: "전년도 근거 부족",
  };

  return labels[confidence];
}

function riskLabel(risk: ApprovalRequest["riskLevel"]): string {
  const labels: Record<ApprovalRequest["riskLevel"], string> = {
    LOW: "낮음",
    MEDIUM: "중간",
    HIGH: "높음",
    CRITICAL: "매우 높음",
  };

  return labels[risk];
}

function executorLabel(executorKey: string): string {
  const labels: Record<string, string> = {
    "mock-search-ad-keyword-executor": "네이버 키워드광고 모의 실행기",
    "internal-product-opportunity-planner": "프로 내부 상품/키워드 초안",
    "internal-crm-draft-planner": "리피 내부 CRM 초안",
    "internal-margin-channel-reviewer": "마루 채널 손익 점검",
  };

  return labels[executorKey] ?? executorKey;
}

function disabledReason(request: ApprovalRequest): string {
  if (request.status !== "PENDING") {
    return "추가 근거 보강 후 다시 상신되어야 합니다.";
  }

  return `${confidenceLabel(request.dataConfidence)} 상태라 즉시 반영할 수 없습니다.`;
}

function decisionLabel(decision: OwnerDecisionType): string {
  const labels: Record<OwnerDecisionType, string> = {
    APPROVE_AND_APPLY: "승인 후 바로 반영",
    APPROVE_DRAFT_ONLY: "초안만 승인",
    REQUEST_REVISION: "수정 요청",
    REQUEST_MORE_EVIDENCE: "추가 근거 요청",
    HOLD: "보류",
    REJECT: "반려",
  };

  return labels[decision];
}

function preflightStatusLabel(status: "PASS" | "WARN" | "BLOCK"): OwnerDecisionFlowView["preflightChecks"][number]["status"] {
  if (status === "PASS") {
    return "통과";
  }

  if (status === "WARN") {
    return "주의";
  }

  return "차단";
}

function executionStateLabel(state: string): OwnerDecisionFlowView["executionStateLabel"] {
  if (state === "APPLIED") {
    return "실행됨";
  }

  if (state === "NEEDS_MANUAL_ACTION") {
    return "수동 처리 필요";
  }

  if (state === "FAILED" || state === "PARTIALLY_APPLIED") {
    return "차단됨";
  }

  return "대기";
}

function outcomeStateLabel(state: string): string {
  const labels: Record<string, string> = {
    SUCCESS: "성공",
    PARTIAL_SUCCESS: "부분 성공",
    FAILED: "실패",
    INCONCLUSIVE: "판단 보류",
  };

  return labels[state] ?? state;
}
