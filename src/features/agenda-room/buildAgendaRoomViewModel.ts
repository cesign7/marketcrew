import { runSampleAgendaCycle } from "@/lib/application/agenda-cycle";
import { buildAiEvidenceBriefs } from "@/lib/application/ai-evidence-briefs";
import {
  buildSampleHypothesisEvidenceQueue,
  canPromoteHypothesis,
  type HypothesisEvidenceQueue,
} from "@/lib/application/evidence-request-guard";
import { processOwnerDecision } from "@/lib/application/approval-workflow";
import {
  buildProductGrowthOpportunities,
  type ProductGrowthOpportunity,
} from "@/lib/application/product-growth-opportunities";
import {
  buildAdPerformanceDiagnoses,
  type AdPerformanceDiagnosis,
} from "@/lib/application/ad-performance-diagnostics";
import { buildProviderSignalAgendaArtifacts } from "@/lib/application/provider-signal-agenda";
import { buildLlmDryRunQueue } from "@/lib/application/llm-dry-run-queue";
import {
  containsDeprecatedCrossBrandJudgment,
  isDeprecatedCrossBrandApprovalId,
} from "@/lib/application/deprecated-approvals";
import {
  getProviderHistoryPolicy,
  type AgendaCandidate,
  type AgentRun,
  type AgentRunWorkflowLink,
  type ApprovalRequest,
  type CharacterKey,
  type CharacterReport,
  type EvidenceRequest,
  type HypothesisCandidate,
  type KeywordDemandSnapshot,
  type LlmPlannerAuditRun,
  type LlmPlannerResult,
  type MarketingCalendarEvent,
  type OwnerDecision,
  type OwnerDecisionType,
  type ProviderReadinessReport,
  type ProviderSyncReport,
  type SearchAdPerformanceSnapshot,
  type SearchTrendSnapshot,
  type SeasonalKeywordAdPlan,
  type ShoppingSearchAdPerformanceSnapshot,
} from "@/lib/domain";
import { recordLlmDryRunAgentRun, recordPlannerAgentRun } from "@/lib/application/agent-run-recorder";
import { buildProviderReadinessReports } from "@/lib/integrations/providers/readiness";
import { buildDeterministicPlannerResult, buildPlannerAuditRun, buildPlannerInputFromApprovals } from "@/lib/llm/planner";
import type { MarketingWorkflowRepository } from "@/lib/application/workflow-repository";
import { resolveAiOperationsSettings } from "@/features/people/ai-operations-settings";
import {
  isKeywordPilotActiveCharacter,
  keywordPilotAvailability,
  keywordPilotScopeLabel,
} from "@/features/characters/keyword-pilot";
import { buildLlmCostGovernanceView } from "./buildLlmCostGovernanceView";
import { buildProviderDataContracts } from "./provider-data-contracts";
import { buildProviderEvidenceExpansionPlans } from "./provider-evidence-expansion-plans";
import type {
  AgendaRoomViewModel,
  ApprovalPreviewView,
  InboxBucketView,
  KeywordPerformanceDashboardView,
  KeywordPerformanceRowTone,
  OwnerDecisionFlowView,
  SeasonalKeywordPlanView,
  WorkDeskCardView,
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
  const aiEvidenceBriefs = buildAiEvidenceBriefs({
    providerSyncReports,
    generatedAt: agendaCycle.generatedAt,
  });
  const hypothesisEvidenceQueue = resolveHypothesisEvidenceQueue(input.repository, agendaCycle.generatedAt);
  const openEvidenceRequestCount = hypothesisEvidenceQueue.evidenceRequests.filter(isOpenEvidenceRequest).length;
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
  let agentRuns = input.repository?.listAgentRuns() ?? [];
  const storedAiOperationsSettings = input.repository?.listAiOperationsSettings()[0];
  const aiOperationsSettings = storedAiOperationsSettings
    ? resolveAiOperationsSettings({
        stored: storedAiOperationsSettings,
        env: input.env ?? process.env,
      })
    : undefined;
  const llmCostGovernance = buildLlmCostGovernanceView({
    env: input.env ?? process.env,
    generatedAt: agendaCycle.generatedAt,
    plannerAudit,
    agentRuns,
    providerReadiness,
    aiOperationsSettings,
  });
  const llmDryRunQueue = buildLlmDryRunQueue({
    generatedAt: agendaCycle.generatedAt,
    plannerAudit,
    plannerResult,
    costGovernance: llmCostGovernance,
  });
  if (input.repository) {
    recordLlmDryRunAgentRun(input.repository, {
      queue: llmDryRunQueue,
      plannerAudit,
      plannerResult,
      generatedAt: agendaCycle.generatedAt,
    });
    agentRuns = input.repository.listAgentRuns();
  }
  const pendingApprovals = allApprovalRequests.filter((request) => request.status === "PENDING");
  const waitingEvidence = allApprovalRequests.filter((request) => request.status === "NEEDS_EVIDENCE");
  const latestDecisionByApprovalId = buildLatestOwnerDecisionByApprovalId(input.repository?.listOwnerDecisions() ?? []);
  const ownerDecisionFlows = pendingApprovals
    .slice(0, providerSyncReports.length > 0 ? 2 : 1)
    .map((request) => buildOwnerDecisionFlowView(request, agendaCycle.generatedAt, providerSyncReports));
  const workDeskCards = buildWorkDeskCards(providerSyncReports, agendaCycle.generatedAt);
  const keywordPerformanceDashboard = buildKeywordPerformanceDashboard({
    providerSyncReports,
    generatedAt: agendaCycle.generatedAt,
    seasonalKeywordPlans: agendaCycle.seasonalKeywordAdPlans,
    eventsById,
  });
  const failedExecutionCount =
    agendaCycle.executionResults.filter((result) => result.state !== "APPLIED").length +
    ownerDecisionFlows.filter((flow) => !["실행됨", "내부 초안 기록됨"].includes(flow.executionStateLabel)).length;

  return {
    generatedAt: formatKoreanDateTime(agendaCycle.generatedAt),
    moaReport: {
      title: agendaCycle.moaSynthesisReport.title,
      summary: buildMoaSummary(allApprovalRequests, providerArtifacts.agendaCandidates.length),
      reportCount: allCharacterReports.length,
    },
    summary: {
      waitingApproval: pendingApprovals.length,
      waitingEvidence: waitingEvidence.length + openEvidenceRequestCount,
      readyToApply: allApprovalRequests.filter((request) => request.dataConfidence === "READY_TO_APPROVE").length,
      failedExecutions: failedExecutionCount,
    },
    inboxBuckets: buildInboxBuckets({
      approvalCount: pendingApprovals.length,
      seasonalKeywordCount: agendaCycle.seasonalKeywordAdPlans.length,
      trackingCount: allPerformanceCheckpoints.length,
      waitingEvidenceCount: waitingEvidence.length + openEvidenceRequestCount,
      autoHoldCount: allAgendaCandidates.length - agendaCycle.promotedAgendaCandidates.length - providerArtifacts.agendaCandidates.length,
      failedExecutionCount,
    }),
    characters: buildCharacterStatuses({
      characterReports: allCharacterReports,
      openEvidenceRequestCount,
      pendingApprovalCount: pendingApprovals.length,
      waitingEvidenceCount: waitingEvidence.length,
      workDeskCards,
    }),
    workDeskCards,
    keywordPerformanceDashboard,
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
        latestDecisionByApprovalId.get(request.id),
      ),
    ),
    ownerDecisionFlows,
    providerDataContracts: buildProviderDataContracts(),
    providerEvidenceExpansionPlans: buildProviderEvidenceExpansionPlans(),
    providerReadiness: providerReadiness.map(buildProviderReadinessView),
    providerSyncEvidence: buildProviderSyncEvidenceViews(providerSyncReports),
    plannerPreview: buildPlannerPreviewView(plannerResult, plannerAudit),
    llmCostGovernance,
    llmDryRunQueue,
    aiPilotInsight: buildAiPilotInsightView(agentRuns, input.repository?.listAgentRunWorkflowLinks() ?? [], allApprovalRequests),
    agentRunSummary: buildAgentRunSummaryView(agentRuns),
    productGrowthOpportunities: productGrowthOpportunities.map(buildProductGrowthOpportunityView),
    aiEvidenceBriefs: aiEvidenceBriefs.map((brief) => ({
      ...brief,
      checkedAt: formatKoreanDateTime(brief.checkedAt),
    })),
    evidenceRequestQueue: buildEvidenceRequestQueueView(hypothesisEvidenceQueue),
    executionResults: [
      ...ownerDecisionFlows.map((flow) => ({
        id: `decision-flow-${flow.id}`,
        title: flow.title,
        state: executionResultStateFromFlow(flow.executionStateLabel),
        note: flow.executionNote,
      })),
      ...allApprovalRequests
        .filter((request) => request.status !== "PENDING")
        .map((request) => {
          const latestDecision = latestDecisionByApprovalId.get(request.id);
          const isDraftOnly = latestDecision?.decision === "APPROVE_DRAFT_ONLY";

          return {
            id: `preview-${request.executionPlan.id}`,
            title: toOperatorKorean(request.executionPlan.diffSummary),
            state: isDraftOnly ? ("내부 초안" as const) : ("차단됨" as const),
            note: isDraftOnly
              ? "초안 확정 상태입니다. 외부 반영 전 다시 대표 결재가 필요합니다."
              : "데이터 신뢰도와 예산 안전장치가 보강되어야 합니다.",
          };
        }),
    ],
    outcomeCheckpoints: allPerformanceCheckpoints.map((checkpoint) => ({
      id: checkpoint.id,
      title: checkpoint.title,
      metric: checkpoint.metrics.map(metricLabel).join(", "),
      status: "준비",
    })),
  };
}

function buildAiPilotInsightView(
  agentRuns: AgentRun[],
  workflowLinks: AgentRunWorkflowLink[],
  approvalRequests: ApprovalRequest[],
): AgendaRoomViewModel["aiPilotInsight"] {
  const latestLlmRun = [...agentRuns]
    .filter((run) => run.runType === "moa_planner" && run.mode === "llm")
    .filter(isVisibleAiPilotRun)
    .sort((left, right) => (right.finishedAt ?? right.startedAt).localeCompare(left.finishedAt ?? left.startedAt))[0];

  if (!latestLlmRun) {
    return {
      title: "AI 파일럿 판단",
      statusLabel: "저장된 판단 없음",
      tone: "waiting",
      summary: "아직 실제 AI 파일럿 결과가 저장되지 않았습니다. 비용 가드와 원천 행 제외 조건을 통과한 뒤 실행한 결과만 이곳에 표시합니다.",
      modelLabel: "실제 호출 전",
      tokenCostLabel: "토큰/비용 기록 없음",
      evidenceLabel: "근거 연결 전",
      finishedAtLabel: "실행 전",
      inputPolicyLabels: ["원천 행 제외", "집계 요약과 근거 ID만 사용", "외부 반영 없음"],
      recommendedApprovalLabels: ["실제 AI 파일럿 실행 후 추천 안건이 표시됩니다."],
      evidenceCategoryLabels: ["근거 없음"],
    };
  }

  const approvalById = new Map(approvalRequests.map((approval) => [approval.id, approval]));
  const linkedApprovalIds = workflowLinks
    .filter((link) => link.agentRunId === latestLlmRun.id && link.objectType === "approval_request")
    .map((link) => link.objectId)
    .filter((approvalId) => !isDeprecatedCrossBrandApprovalId(approvalId));
  const recommendedApprovalLabels = linkedApprovalIds.length > 0
    ? linkedApprovalIds.map((approvalId) => approvalLabelFromId(approvalId, approvalById))
    : ["추천 안건 연결 기록 없음"];

  return {
    title: "AI 파일럿 판단",
    statusLabel: latestLlmRun.status === "SUCCEEDED" ? "저장된 판단" : agentRunStatusLabel(latestLlmRun.status),
    tone: latestLlmRun.status === "SUCCEEDED" ? "ready" : "blocked",
    summary: toOperatorKorean(latestLlmRun.outputSummary),
    modelLabel: `연동 ${agentRunProviderLabel(latestLlmRun.provider)} · 모델 ${agentRunModelLabel(latestLlmRun.model)}`,
    tokenCostLabel: `입력 ${latestLlmRun.tokenUsage.inputTokens.toLocaleString("ko-KR")}토큰 · 출력 ${latestLlmRun.tokenUsage.outputTokens.toLocaleString(
      "ko-KR",
    )}토큰 · 총 ${latestLlmRun.tokenUsage.totalTokens.toLocaleString("ko-KR")}토큰 · 약 ${latestLlmRun.tokenUsage.estimatedCostKrw.toLocaleString(
      "ko-KR",
    )}원`,
    evidenceLabel: `근거 ${latestLlmRun.evidenceIds.length.toLocaleString("ko-KR")}개 · 추천 안건 ${linkedApprovalIds.length.toLocaleString(
      "ko-KR",
    )}건`,
    finishedAtLabel: formatKoreanDateTime(latestLlmRun.finishedAt ?? latestLlmRun.startedAt),
    inputPolicyLabels: ["원천 행 제외", "집계 요약과 근거 ID만 사용", "고객 식별정보 제외", "외부 반영 없음"],
    recommendedApprovalLabels,
    evidenceCategoryLabels: buildEvidenceCategoryLabels(latestLlmRun.evidenceIds),
  };
}

function isVisibleAiPilotRun(run: AgentRun): boolean {
  return !containsDeprecatedCrossBrandJudgment(`${run.inputSummary} ${run.outputSummary}`);
}

function buildLatestOwnerDecisionByApprovalId(ownerDecisions: OwnerDecision[]): Map<string, OwnerDecision> {
  const latestDecisionByApprovalId = new Map<string, OwnerDecision>();
  for (const decision of [...ownerDecisions].sort((left, right) => right.decidedAt.localeCompare(left.decidedAt))) {
    if (!latestDecisionByApprovalId.has(decision.approvalRequestId)) {
      latestDecisionByApprovalId.set(decision.approvalRequestId, decision);
    }
  }

  return latestDecisionByApprovalId;
}

function approvalLabelFromId(approvalId: string, approvalById: Map<string, ApprovalRequest>): string {
  const approval = approvalById.get(approvalId);
  if (approval) {
    return approval.title;
  }

  if (approvalId.includes("provider-channel-balance-stickersee-coffeeprint")) {
    return "브랜드별 개별 검토 안건";
  }

  if (approvalId.includes("provider-smartstore-stickersee")) {
    return "스마트스토어 상위 상품 키워드 확장 안건";
  }

  if (approvalId.includes("provider-youngcart-coffeeprint")) {
    return "영카트 재구매 고객군 CRM 초안 안건";
  }

  if (approvalId.includes("season-plan-buddha-gift-card")) {
    return "부처님오신날 선물카드 키워드 테스트 승인안";
  }

  return "추천 안건 기록";
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

function resolveHypothesisEvidenceQueue(
  repository: MarketingWorkflowRepository | undefined,
  generatedAt: string,
): HypothesisEvidenceQueue {
  const sampleQueue = buildSampleHypothesisEvidenceQueue({ generatedAt });

  if (!repository) {
    return sampleQueue;
  }

  const storedHypotheses = repository.listHypothesisCandidates();
  const storedEvidenceRequests = repository.listEvidenceRequests();

  if (storedHypotheses.length === 0) {
    repository.saveHypothesisCandidates(sampleQueue.hypotheses);
  }

  if (storedEvidenceRequests.length === 0) {
    repository.saveEvidenceRequests(sampleQueue.evidenceRequests);
  }

  return {
    hypotheses: storedHypotheses.length > 0 ? storedHypotheses : sampleQueue.hypotheses,
    evidenceRequests: storedEvidenceRequests.length > 0 ? storedEvidenceRequests : sampleQueue.evidenceRequests,
  };
}

function buildEvidenceRequestQueueView(queue: HypothesisEvidenceQueue): AgendaRoomViewModel["evidenceRequestQueue"] {
  const openRequestCount = queue.evidenceRequests.filter(isOpenEvidenceRequest).length;
  const verifiedHypothesisCount = queue.hypotheses.filter((hypothesis) =>
    canPromoteHypothesis(hypothesis, queue.evidenceRequests),
  ).length;

  return {
    title: "근거 요청 큐",
    summaryLabel: `검증 대기 ${openRequestCount.toLocaleString("ko-KR")}건 · 승격 가능 ${verifiedHypothesisCount.toLocaleString(
      "ko-KR",
    )}건`,
    guardrailLabel: "검증 전 결재 승격 차단 · 데이가 요청 근거를 확인한 뒤에만 대표 결재로 올라갑니다.",
    openRequestCount,
    verifiedHypothesisCount,
    items: queue.hypotheses.map((hypothesis) => {
      const requests = evidenceRequestsForHypothesis(hypothesis, queue.evidenceRequests);
      const primaryRequest = requests.find((request) => request.status !== "VERIFIED") ?? requests[0];
      const canPromote = canPromoteHypothesis(hypothesis, queue.evidenceRequests);
      const tone = evidenceRequestTone(hypothesis, requests, canPromote);

      return {
        id: primaryRequest?.id ?? `evidence-request-${hypothesis.id}`,
        requestStatus: primaryRequest?.status,
        title: hypothesis.title,
        ownerName: characterName(hypothesis.character),
        verifierName: primaryRequest ? characterName(primaryRequest.verifier) : "데이",
        statusLabel: evidenceRequestStatusLabel(hypothesis, primaryRequest, canPromote),
        tone,
        hypothesis: hypothesis.hypothesis,
        requestedFields: requests.flatMap((request) => request.neededFields),
        comparisonWindow: primaryRequest?.comparisonWindow ?? "확인 기간 지정 필요",
        reason: primaryRequest?.reason ?? "추가 근거 항목 지정이 필요합니다.",
        promotionLabel: canPromote ? "승격 가능" : tone === "blocked" ? "보강 필요" : "검증 전 차단",
        evidenceLabels: buildEvidenceRequestEvidenceLabels(requests),
      };
    }),
  };
}

function evidenceRequestsForHypothesis(
  hypothesis: HypothesisCandidate,
  evidenceRequests: EvidenceRequest[],
): EvidenceRequest[] {
  return evidenceRequests.filter((request) => hypothesis.requestedEvidenceIds.includes(request.id));
}

function isOpenEvidenceRequest(request: EvidenceRequest): boolean {
  return request.status === "REQUESTED" || request.status === "COLLECTING" || request.status === "INSUFFICIENT";
}

function evidenceRequestTone(
  hypothesis: HypothesisCandidate,
  requests: EvidenceRequest[],
  canPromote: boolean,
): AgendaRoomViewModel["evidenceRequestQueue"]["items"][number]["tone"] {
  if (canPromote) {
    return "ready";
  }

  if (hypothesis.status === "REJECTED" || requests.some((request) => request.status === "INSUFFICIENT")) {
    return "blocked";
  }

  return "waiting";
}

function evidenceRequestStatusLabel(
  hypothesis: HypothesisCandidate,
  request: EvidenceRequest | undefined,
  canPromote: boolean,
): string {
  if (canPromote) {
    return "근거 확인 완료";
  }

  if (hypothesis.status === "REJECTED") {
    return "가설 반려";
  }

  if (!request) {
    return "요청 항목 필요";
  }

  const labels: Record<EvidenceRequest["status"], string> = {
    REQUESTED: "데이 확인 대기",
    COLLECTING: "근거 수집 중",
    VERIFIED: "근거 확인 완료",
    INSUFFICIENT: "근거 부족",
  };

  return labels[request.status];
}

function buildEvidenceRequestEvidenceLabels(requests: EvidenceRequest[]): string[] {
  const evidenceIds = requests.flatMap((request) => request.verifiedEvidenceIds);

  if (evidenceIds.length === 0) {
    return ["검증 근거 대기"];
  }

  return evidenceIds.map((id) => evidenceCategoryLabel(id));
}

function agentRunTypeLabel(runType: AgentRun["runType"]): string {
  const labels: Record<AgentRun["runType"], string> = {
    moa_planner: "모아 계획",
    llm_dry_run: "AI 실행 점검",
    provider_sync: "연동 수집",
    provider_signal_agenda: "연동 안건 생성",
    evidence_request_review: "근거 검증",
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
    "llm-dry-run-queue": "AI 실행 큐",
    "evidence-request-review-workflow": "근거 검증 기록기",
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

function buildWorkDeskCards(providerSyncReports: ProviderSyncReport[], generatedAt: string): WorkDeskCardView[] {
  const reports = latestSearchAdPerformanceReports(providerSyncReports);
  const cards = reports.flatMap((report) => buildKeywordWorkDeskCards(report, generatedAt));
  return dedupeWorkDeskCards(cards).sort(compareWorkDeskCards).slice(0, 24);
}

function latestSearchAdPerformanceReports(providerSyncReports: ProviderSyncReport[]): ProviderSyncReport[] {
  const latestSearchKeywordReport = latestSyncedReportWithSnapshots(providerSyncReports, "searchAdPerformanceSnapshots");
  const latestShoppingReport = latestSyncedReportWithSnapshots(providerSyncReports, "shoppingSearchAdPerformanceSnapshots");
  return Array.from(new Map([latestSearchKeywordReport, latestShoppingReport].filter(Boolean).map((report) => [report!.id, report!])).values());
}

function latestSyncedReportWithSnapshots(
  providerSyncReports: ProviderSyncReport[],
  snapshotKey: "searchAdPerformanceSnapshots" | "shoppingSearchAdPerformanceSnapshots",
): ProviderSyncReport | undefined {
  return providerSyncReports
    .filter((report) => report.provider === "search_ad" && report.status === "SYNCED" && (report[snapshotKey]?.length ?? 0) > 0)
    .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt))[0];
}

const KEYWORD_DASHBOARD_MIN_CLICKS = 10;
const KEYWORD_DASHBOARD_MIN_COST = 1000;
const KEYWORD_DASHBOARD_DEFAULT_TARGET_CPA = 20000;
const KEYWORD_DASHBOARD_DEFAULT_TARGET_ROAS = 1.5;
const PRODUCT_KEYWORD_PATTERN = /스티커|답례|구디백|어린이집|유치원|학원|선물|카드|포장|커피|드립|쿠폰/;
const PRODUCT_KEYWORD_STOP_WORDS = new Set(["주문", "소량", "감사", "제작", "원형", "옵션"]);

type KeywordAggregate = {
  id: string;
  keyword: string;
  brandKey: string;
  brandLabel: string;
  scopeLabel: string;
  windowDays: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  targetCpa?: number;
  targetRoas?: number;
  trackingVerified: boolean;
  evidenceLabels: string[];
};

function buildKeywordPerformanceDashboard(input: {
  providerSyncReports: ProviderSyncReport[];
  generatedAt: string;
  seasonalKeywordPlans: SeasonalKeywordAdPlan[];
  eventsById: Map<string, MarketingCalendarEvent>;
}): KeywordPerformanceDashboardView {
  const reports = latestSearchAdPerformanceReports(input.providerSyncReports);
  const searchSnapshots = reports.flatMap((report) => report.searchAdPerformanceSnapshots ?? []);
  const shoppingSnapshots = reports.flatMap((report) => report.shoppingSearchAdPerformanceSnapshots ?? []);
  const keywordAggregates = aggregateKeywordPerformance(searchSnapshots);
  const sufficientAggregates = keywordAggregates.filter(isSufficientKeywordAggregate);
  const latestCheckedAt = latestCheckedAtLabel(reports, input.generatedAt);
  const recommendationContext = buildKeywordRecommendationContext({
    providerSyncReports: input.providerSyncReports,
    seasonalKeywordPlans: input.seasonalKeywordPlans,
    eventsById: input.eventsById,
  });

  return {
    title: "키워드 성과 대시보드",
    summaryLabel: `검색광고 키워드 ${keywordAggregates.length.toLocaleString("ko-KR")}개 · 쇼핑검색어 ${shoppingSnapshots.length.toLocaleString(
      "ko-KR",
    )}개를 그로가 먼저 점검합니다.`,
    sourceLabel: reports.length > 0 ? "읽기 전용 네이버 검색광고 성과 스냅샷 기준" : "성과 스냅샷 수집 대기",
    updatedAtLabel: latestCheckedAt,
    qualityGuardLabel: "클릭 1~2건으로 전환율이 과대 표시되지 않도록 충분한 클릭/비용 기준을 먼저 적용합니다.",
    minimumCriteriaLabels: [
      `순위 반영 기준: 클릭 ${KEYWORD_DASHBOARD_MIN_CLICKS.toLocaleString("ko-KR")}회 이상 또는 비용 ${KEYWORD_DASHBOARD_MIN_COST.toLocaleString(
        "ko-KR",
      )}원 이상`,
      "기기/시간대 조정은 키워드 전체 중지가 아니라 낮은 구간만 따로 봅니다.",
      "실제 외부 광고 변경은 대표 승인과 쓰기 게이트 통과 전까지 차단합니다.",
    ],
    topConversionKeywords: sufficientAggregates
      .filter((aggregate) => aggregate.conversions > 0)
      .sort(compareTopConversionAggregates)
      .slice(0, 10)
      .map((aggregate, index) => keywordAggregateRow(aggregate, index, "good", "전환율과 주문이 함께 확인된 키워드입니다.")),
    lowConversionKeywords: sufficientAggregates
      .sort(compareLowConversionAggregates)
      .slice(0, 10)
      .map((aggregate, index) =>
        keywordAggregateRow(
          aggregate,
          index,
          aggregate.conversions === 0 ? "danger" : "warning",
          aggregate.conversions === 0 ? "주문 없는 클릭이 누적되어 유지 예외를 확인해야 합니다." : "전환율이 낮아 입찰/랜딩 점검이 필요합니다.",
        ),
      ),
    wasteKeywords: sufficientAggregates
      .filter(isWasteKeywordAggregate)
      .sort(compareWasteAggregates)
      .slice(0, 10)
      .map((aggregate, index) => keywordAggregateRow(aggregate, index, "danger", wasteKeywordNote(aggregate))),
    deviceSegments: buildDeviceSegmentRows(searchSnapshots).slice(0, 10),
    timeSegments: buildTimeSegmentRows(searchSnapshots).slice(0, 10),
    shoppingSearchTerms: buildShoppingSearchTermRows(shoppingSnapshots, input.providerSyncReports).slice(0, 10),
    recommendationKeywords: recommendationContext.candidates.slice(0, 10),
    recommendationEvidence: recommendationContext.evidence.slice(0, 10),
  };
}

function aggregateKeywordPerformance(snapshots: SearchAdPerformanceSnapshot[]): KeywordAggregate[] {
  const snapshotsByKeyword = new Map<string, SearchAdPerformanceSnapshot[]>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.brandKey}::${snapshot.keyword}`;
    snapshotsByKeyword.set(key, [...(snapshotsByKeyword.get(key) ?? []), snapshot]);
  }

  return [...snapshotsByKeyword.values()].map((group) => {
    const rankSnapshots = snapshotsForKeywordRanking(group);
    const primary = rankSnapshots[0] ?? group[0]!;
    const clicks = sum(rankSnapshots.map((snapshot) => snapshot.clicks));
    const cost = sum(rankSnapshots.map((snapshot) => snapshot.cost));
    const conversions = sum(rankSnapshots.map((snapshot) => snapshot.conversions));
    const revenue = sum(rankSnapshots.map((snapshot) => snapshot.revenue));
    const targetCpa = firstDefined(rankSnapshots.map((snapshot) => snapshot.targetCpa));
    const targetRoas = firstDefined(rankSnapshots.map((snapshot) => snapshot.targetRoas));

    return {
      id: `keyword-dashboard-${primary.brandKey}-${primary.keyword}`,
      keyword: primary.keyword,
      brandKey: primary.brandKey,
      brandLabel: brandLabelFromKey(primary.brandKey),
      scopeLabel: `${primary.windowDays.toLocaleString("ko-KR")}일 · ${rankSnapshots.length.toLocaleString("ko-KR")}개 성과 구간`,
      windowDays: primary.windowDays,
      clicks,
      cost,
      conversions,
      revenue,
      targetCpa,
      targetRoas,
      trackingVerified: rankSnapshots.every((snapshot) => snapshot.trackingVerified),
      evidenceLabels: rankSnapshots.map((snapshot) => snapshot.id),
    };
  });
}

function snapshotsForKeywordRanking(group: SearchAdPerformanceSnapshot[]): SearchAdPerformanceSnapshot[] {
  const allDeviceSnapshots = group.filter((snapshot) => snapshot.device === "ALL");
  if (allDeviceSnapshots.length > 0) {
    return allDeviceSnapshots;
  }

  return group;
}

function isSufficientKeywordAggregate(aggregate: KeywordAggregate): boolean {
  return aggregate.clicks >= KEYWORD_DASHBOARD_MIN_CLICKS || aggregate.cost >= KEYWORD_DASHBOARD_MIN_COST;
}

function compareTopConversionAggregates(left: KeywordAggregate, right: KeywordAggregate): number {
  return (
    conversionRate(right) - conversionRate(left) ||
    right.conversions - left.conversions ||
    right.revenue - left.revenue ||
    right.clicks - left.clicks
  );
}

function compareLowConversionAggregates(left: KeywordAggregate, right: KeywordAggregate): number {
  return conversionRate(left) - conversionRate(right) || right.cost - left.cost || right.clicks - left.clicks;
}

function compareWasteAggregates(left: KeywordAggregate, right: KeywordAggregate): number {
  return right.cost - left.cost || right.clicks - left.clicks || conversionRate(left) - conversionRate(right);
}

function isWasteKeywordAggregate(aggregate: KeywordAggregate): boolean {
  if (aggregate.conversions === 0 && aggregate.clicks >= KEYWORD_DASHBOARD_MIN_CLICKS) {
    return true;
  }

  const cpa = costPerOrder(aggregate);
  const roas = roasValue(aggregate);
  const cpaTarget = aggregate.targetCpa ?? KEYWORD_DASHBOARD_DEFAULT_TARGET_CPA;
  const roasTarget = aggregate.targetRoas ?? KEYWORD_DASHBOARD_DEFAULT_TARGET_ROAS;

  return Boolean((cpa && cpa > cpaTarget) || (roas !== undefined && roas < roasTarget));
}

function keywordAggregateRow(
  aggregate: KeywordAggregate,
  index: number,
  tone: KeywordPerformanceRowTone,
  noteLabel: string,
): KeywordPerformanceDashboardView["topConversionKeywords"][number] {
  return {
    id: `${aggregate.id}-${index}`,
    keyword: aggregate.keyword,
    brandLabel: aggregate.brandLabel,
    scopeLabel: aggregate.scopeLabel,
    conversionRateLabel: `전환율 ${formatPercent(conversionRate(aggregate))}`,
    clicksLabel: `클릭 ${aggregate.clicks.toLocaleString("ko-KR")}회`,
    ordersLabel: `주문 ${aggregate.conversions.toLocaleString("ko-KR")}건`,
    costLabel: `비용 ${aggregate.cost.toLocaleString("ko-KR")}원`,
    cpaLabel: aggregate.conversions > 0 ? `CPA ${Math.round(aggregate.cost / aggregate.conversions).toLocaleString("ko-KR")}원` : "CPA 없음",
    roasLabel: aggregate.cost > 0 ? `ROAS ${formatNumber(roasValue(aggregate) ?? 0)}배` : "ROAS 없음",
    noteLabel,
    tone,
    evidenceLabels: aggregate.evidenceLabels.map((id) => `근거 ${id}`),
  };
}

function wasteKeywordNote(aggregate: KeywordAggregate): string {
  if (aggregate.conversions === 0) {
    return "클릭은 충분하지만 주문이 없어 제외/하향 후보입니다.";
  }

  const cpa = costPerOrder(aggregate);
  if (cpa && cpa > (aggregate.targetCpa ?? KEYWORD_DASHBOARD_DEFAULT_TARGET_CPA)) {
    return "주문은 있으나 목표 CPA를 넘어서 입찰 하향 후보입니다.";
  }

  return "ROAS가 낮아 예산 유지 여부를 다시 봐야 합니다.";
}

function buildDeviceSegmentRows(snapshots: SearchAdPerformanceSnapshot[]): KeywordPerformanceDashboardView["deviceSegments"] {
  return snapshots
    .filter((snapshot) => snapshot.device !== "ALL")
    .sort(compareSegmentSnapshots)
    .map((snapshot, index) => segmentRow(snapshot, index, `기기 ${deviceLabel(snapshot.device)}`));
}

function buildTimeSegmentRows(snapshots: SearchAdPerformanceSnapshot[]): KeywordPerformanceDashboardView["timeSegments"] {
  return snapshots
    .filter((snapshot) => Boolean(snapshot.timeSlot))
    .sort(compareSegmentSnapshots)
    .map((snapshot, index) => segmentRow(snapshot, index, `시간 ${snapshot.timeSlot}`));
}

function compareSegmentSnapshots(left: SearchAdPerformanceSnapshot, right: SearchAdPerformanceSnapshot): number {
  return conversionRateFromValues(left.clicks, left.conversions) - conversionRateFromValues(right.clicks, right.conversions) || right.cost - left.cost;
}

function segmentRow(
  snapshot: SearchAdPerformanceSnapshot,
  index: number,
  segmentLabel: string,
): KeywordPerformanceDashboardView["deviceSegments"][number] {
  const cpa = snapshot.conversions > 0 ? Math.round(snapshot.cost / snapshot.conversions) : undefined;
  const tone = snapshot.conversions === 0 && snapshot.clicks >= KEYWORD_DASHBOARD_MIN_CLICKS ? "danger" : "warning";

  return {
    id: `${snapshot.id}-${index}`,
    keyword: snapshot.keyword,
    brandLabel: brandLabelFromKey(snapshot.brandKey),
    segmentLabel,
    conversionRateLabel: `전환율 ${formatPercent(conversionRateFromValues(snapshot.clicks, snapshot.conversions))}`,
    clicksLabel: `클릭 ${snapshot.clicks.toLocaleString("ko-KR")}회`,
    ordersLabel: `주문 ${snapshot.conversions.toLocaleString("ko-KR")}건`,
    costLabel: `비용 ${snapshot.cost.toLocaleString("ko-KR")}원`,
    cpaLabel: cpa ? `CPA ${cpa.toLocaleString("ko-KR")}원` : "CPA 없음",
    noteLabel: snapshot.trackingVerified ? "성과 낮은 구간만 따로 조정합니다." : "전환 추적 확인 후 판단합니다.",
    tone,
  };
}

function buildShoppingSearchTermRows(
  snapshots: ShoppingSearchAdPerformanceSnapshot[],
  providerSyncReports: ProviderSyncReport[],
): KeywordPerformanceDashboardView["shoppingSearchTerms"] {
  const commerceImages = buildCommerceProductImageCandidates(providerSyncReports);

  return [...snapshots]
    .sort((left, right) => left.directConversionRate - right.directConversionRate || right.cost - left.cost || right.clicks - left.clicks)
    .map((snapshot, index) => {
      const productName = snapshot.productGroupName ?? snapshot.mallName ?? "연결 상품 확인 필요";
      const tone: KeywordPerformanceRowTone = snapshot.directConversionRate === 0 ? "danger" : snapshot.directConversionRate < 0.02 ? "warning" : "neutral";
      const needsProductMapping = !snapshot.productGroupName && !snapshot.mallName;
      const productImage = resolveShoppingSearchTermImage(snapshot, productName, commerceImages);

      return {
        id: `${snapshot.id}-${index}`,
        searchKeyword: snapshot.searchKeyword,
        brandLabel: brandLabelFromKey(snapshot.brandKey),
        productName,
        productImageUrl: productImage.url,
        productImageAlt: `${productName} 상품 이미지`,
        productImageSourceLabel: productImage.sourceLabel,
        campaignLabel: `${snapshot.campaignName} · ${snapshot.adGroupName}`,
        directConversionRateLabel: `직접 전환율 ${formatPercent(snapshot.directConversionRate)}`,
        clicksLabel: `클릭 ${snapshot.clicks.toLocaleString("ko-KR")}회`,
        costLabel: `비용 ${snapshot.cost.toLocaleString("ko-KR")}원`,
        landingFitLabel: shoppingLandingFitLabel(snapshot.directConversionRate),
        noteLabel: needsProductMapping ? "상품 그룹과 랜딩 연결을 먼저 확인합니다." : "상품명, 이미지, 랜딩 적합도를 함께 확인합니다.",
        tone,
      };
    });
}

type CommerceProductImageCandidate = {
  brandKey: string;
  productName: string;
  imageUrl: string;
};

function buildCommerceProductImageCandidates(providerSyncReports: ProviderSyncReport[]): CommerceProductImageCandidate[] {
  return providerSyncReports
    .map((report) => report.commerceAggregateSnapshot)
    .filter((snapshot): snapshot is NonNullable<ProviderSyncReport["commerceAggregateSnapshot"]> =>
      Boolean(snapshot?.topProductName && snapshot.topProductImageUrl),
    )
    .map((snapshot) => ({
      brandKey: normalizeBrandKey(snapshot.brandKey),
      productName: snapshot.topProductName ?? "",
      imageUrl: snapshot.topProductImageUrl ?? "",
    }));
}

function resolveShoppingSearchTermImage(
  snapshot: ShoppingSearchAdPerformanceSnapshot,
  productName: string,
  commerceImages: CommerceProductImageCandidate[],
): { url: string; sourceLabel: string } {
  if (isSafeImageUrl(snapshot.productImageUrl)) {
    return { url: snapshot.productImageUrl, sourceLabel: "상품그룹 이미지" };
  }

  const commerceImage = commerceImages.find((candidate) => isCommerceProductImageMatch(snapshot, productName, candidate));
  if (commerceImage) {
    return { url: commerceImage.imageUrl, sourceLabel: "주문 이미지" };
  }

  return { url: buildKeywordThumbnailDataUri(productName), sourceLabel: "대체 이미지" };
}

function isCommerceProductImageMatch(
  snapshot: ShoppingSearchAdPerformanceSnapshot,
  productName: string,
  candidate: CommerceProductImageCandidate,
): boolean {
  if (candidate.brandKey !== normalizeBrandKey(snapshot.brandKey) || !isSafeImageUrl(candidate.imageUrl)) {
    return false;
  }

  const sourceText = `${snapshot.searchKeyword} ${productName} ${snapshot.adGroupName}`;
  const sourceTokens = meaningfulShoppingImageTokens(sourceText);
  const productTokens = meaningfulShoppingImageTokens(candidate.productName);
  const overlap = sourceTokens.filter((token) => productTokens.includes(token));

  return overlap.length >= 2;
}

function meaningfulShoppingImageTokens(text: string): string[] {
  const normalized = text.replace(/[_/()[\]{}·,.-]+/g, " ");
  const dictionary = [
    "생일",
    "축하",
    "답례",
    "답례품",
    "감사",
    "소량",
    "주문",
    "제작",
    "스티커",
    "스티커제작",
    "원형",
    "구디백",
    "어린이집",
    "유치원",
    "학원",
    "선물",
    "선물카드",
    "카드",
    "봉투",
    "결혼",
  ];
  const dictionaryTokens = dictionary.filter((token) => normalized.includes(token));
  const splitTokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{Script=Hangul}A-Za-z0-9]/gu, "").trim())
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));

  return uniqueKeywordLabels([...dictionaryTokens, ...splitTokens]);
}

function isSafeImageUrl(url?: string): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function shoppingLandingFitLabel(directConversionRate: number): string {
  if (directConversionRate === 0) {
    return "랜딩 적합도 점검";
  }

  if (directConversionRate < 0.02) {
    return "상품 노출 조건 점검";
  }

  return "랜딩 유지 후보";
}

type KeywordRecommendationContext = {
  candidates: KeywordPerformanceDashboardView["recommendationKeywords"];
  evidence: KeywordPerformanceDashboardView["recommendationEvidence"];
};

function buildKeywordRecommendationContext(input: {
  providerSyncReports: ProviderSyncReport[];
  seasonalKeywordPlans: SeasonalKeywordAdPlan[];
  eventsById: Map<string, MarketingCalendarEvent>;
}): KeywordRecommendationContext {
  const reportsByLatest = [...input.providerSyncReports].sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
  const demandSnapshots = latestUniqueKeywordDemandSnapshots(
    reportsByLatest.flatMap((report) => report.keywordDemandSnapshots ?? []),
  )
    .sort(compareKeywordDemandSnapshots)
    .slice(0, 4);
  const trendSnapshots = latestUniqueSearchTrendSnapshots(
    reportsByLatest.flatMap((report) => report.searchTrendSnapshots ?? []),
  )
    .filter((snapshot) => maxTrendRatio(snapshot) > 0)
    .sort(compareSearchTrendSnapshots)
    .slice(0, 3);
  const demandCandidates = demandSnapshots.map(keywordDemandCandidate);
  const demandEvidence = demandSnapshots.map(keywordDemandEvidence);
  const trendEvidence = trendSnapshots.map(searchTrendEvidence);
  const seasonCandidates = input.seasonalKeywordPlans.flatMap((plan) => seasonalKeywordCandidates(plan, input.eventsById.get(plan.eventId)));
  const seasonEvidence = input.seasonalKeywordPlans.slice(0, 3).map((plan) => seasonalKeywordEvidence(plan, input.eventsById.get(plan.eventId)));
  const commerceContext = buildCommerceKeywordRecommendationContext(reportsByLatest);

  return {
    candidates: dedupeKeywordRecommendationCandidates([...demandCandidates, ...commerceContext.candidates, ...seasonCandidates]),
    evidence: dedupeKeywordRecommendationEvidence([...demandEvidence, ...trendEvidence, ...seasonEvidence, ...commerceContext.evidence]),
  };
}

function buildCommerceKeywordRecommendationContext(reportsByLatest: ProviderSyncReport[]): KeywordRecommendationContext {
  const candidates: KeywordRecommendationContext["candidates"] = [];
  const evidenceItems: KeywordRecommendationContext["evidence"] = [];

  for (const report of reportsByLatest) {
    const evidence: KeywordPerformanceDashboardView["recommendationEvidence"] = [];

    if (report.commerceAggregateSnapshot) {
      const snapshot = report.commerceAggregateSnapshot;
      const extractedKeywords = extractProductKeywordCandidates(snapshot.topProductName);
      candidates.push(
        ...extractedKeywords.map((keyword, index) => ({
          id: `keyword-candidate-commerce-${snapshot.id}-${index}`,
          keyword,
          brandLabel: brandLabelFromKey(snapshot.brandKey),
          sourceLabel: "실제 주문 상품명",
          reasonLabel: "최근 주문 상품명에서 반복 구매 문맥을 추출했습니다.",
          evidenceLabels: [`근거 ${snapshot.id}`, `${snapshot.paidOrderCount.toLocaleString("ko-KR")}건 주문`],
        })),
      );
      evidence.push({
        id: `keyword-recommendation-commerce-${snapshot.id}`,
        title: `${brandLabelFromKey(snapshot.brandKey)} 실제 주문 상품명`,
        sourceLabel: "실제 주문 집계",
        summary:
          extractedKeywords.length > 0
            ? `${extractedKeywords.slice(0, 4).join(", ")} 후보를 주문 상품명에서 추출했습니다.`
            : `${brandLabelFromKey(snapshot.brandKey)} 주문 흐름을 키워드 후보 근거로 둡니다.`,
        evidenceLabels: [`근거 ${snapshot.id}`, `${snapshot.paidOrderCount.toLocaleString("ko-KR")}건 주문`, "원천 상품명 접기"],
        sourceDetailLabel: snapshot.topProductName ? `원천 상품명: ${snapshot.topProductName}` : undefined,
      });
    }

    if (report.shopAggregateSnapshot) {
      const snapshot = report.shopAggregateSnapshot;
      candidates.push(...shopFlowKeywordCandidates(snapshot.brandKey, snapshot.id, snapshot.orderCount, snapshot.repeatCustomerCount));
      evidence.push({
        id: `keyword-recommendation-shop-${snapshot.id}`,
        title: `${brandLabelFromKey(snapshot.brandKey)} 쇼핑몰 주문 흐름`,
        sourceLabel: "실제 주문 집계",
        summary: `${snapshot.orderCount.toLocaleString("ko-KR")}건 주문과 재구매 ${snapshot.repeatCustomerCount.toLocaleString(
          "ko-KR",
        )}명 흐름에서 재구매·선물형 후보를 봅니다.`,
        evidenceLabels: [`근거 ${snapshot.id}`, "쇼핑몰 주문/재구매 집계"],
      });
    }

    evidenceItems.push(...evidence);
  }

  return { candidates, evidence: evidenceItems };
}

function latestUniqueKeywordDemandSnapshots(snapshots: KeywordDemandSnapshot[]): KeywordDemandSnapshot[] {
  return latestUniqueBy(
    snapshots,
    (snapshot) => `keyword-demand:${snapshot.provider}:${normalizeRecommendationKey(snapshot.keyword)}`,
    (snapshot) => snapshot.collectedAt,
  );
}

function latestUniqueSearchTrendSnapshots(snapshots: SearchTrendSnapshot[]): SearchTrendSnapshot[] {
  return latestUniqueBy(
    snapshots,
    (snapshot) => `search-trend:${snapshot.provider}:${normalizeRecommendationKey(snapshot.keywordGroupName)}:${snapshot.timeUnit}`,
    (snapshot) => snapshot.collectedAt,
  );
}

function latestUniqueBy<TItem>(
  items: TItem[],
  keyFn: (item: TItem) => string,
  collectedAtFn: (item: TItem) => string,
): TItem[] {
  const latestByKey = new Map<string, TItem>();

  for (const item of items) {
    const key = keyFn(item);
    const existing = latestByKey.get(key);
    if (!existing || collectedAtFn(item) > collectedAtFn(existing)) {
      latestByKey.set(key, item);
    }
  }

  return [...latestByKey.values()];
}

function dedupeKeywordRecommendationEvidence(
  evidenceItems: KeywordPerformanceDashboardView["recommendationEvidence"],
): KeywordPerformanceDashboardView["recommendationEvidence"] {
  const uniqueEvidence = new Map<string, KeywordPerformanceDashboardView["recommendationEvidence"][number]>();

  for (const evidence of evidenceItems) {
    const key = [
      normalizeRecommendationKey(evidence.sourceLabel),
      normalizeRecommendationKey(evidence.title),
      normalizeRecommendationKey(evidence.summary),
    ].join("::");
    if (!uniqueEvidence.has(key)) {
      uniqueEvidence.set(key, evidence);
    }
  }

  return [...uniqueEvidence.values()];
}

function dedupeKeywordRecommendationCandidates(
  candidates: KeywordPerformanceDashboardView["recommendationKeywords"],
): KeywordPerformanceDashboardView["recommendationKeywords"] {
  const uniqueCandidates = new Map<string, KeywordPerformanceDashboardView["recommendationKeywords"][number]>();

  for (const candidate of candidates) {
    const brandKey =
      candidate.brandLabel === "브랜드 배정 필요" || candidate.brandLabel === "시즌 캠페인"
        ? "공통"
        : normalizeRecommendationKey(candidate.brandLabel);
    const key = [brandKey, normalizeRecommendationKey(candidate.keyword)].join("::");
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, candidate);
    }
  }

  return [...uniqueCandidates.values()];
}

function normalizeRecommendationKey(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function compareKeywordDemandSnapshots(left: KeywordDemandSnapshot, right: KeywordDemandSnapshot): number {
  return keywordDemandVolume(right) - keywordDemandVolume(left);
}

function keywordDemandEvidence(snapshot: KeywordDemandSnapshot): KeywordPerformanceDashboardView["recommendationEvidence"][number] {
  return {
    id: `keyword-recommendation-demand-${snapshot.id}`,
    title: snapshot.keyword,
    sourceLabel: "네이버 키워드 수요",
    summary: `월 검색 ${keywordDemandVolume(snapshot).toLocaleString("ko-KR")}회 기준으로 추천 후보에 올립니다.`,
    evidenceLabels: [
      `PC ${Number(snapshot.monthlyPcSearches ?? 0).toLocaleString("ko-KR")}회`,
      `모바일 ${Number(snapshot.monthlyMobileSearches ?? 0).toLocaleString("ko-KR")}회`,
      `경쟁 ${competitionLabel(snapshot.competitionIndex)}`,
    ],
  };
}

function keywordDemandCandidate(snapshot: KeywordDemandSnapshot): KeywordPerformanceDashboardView["recommendationKeywords"][number] {
  return {
    id: `keyword-candidate-demand-${snapshot.id}`,
    keyword: snapshot.keyword,
    brandLabel: "브랜드 배정 필요",
    sourceLabel: "네이버 키워드 수요",
    reasonLabel: `월 검색 ${keywordDemandVolume(snapshot).toLocaleString("ko-KR")}회 · 경쟁 ${competitionLabel(snapshot.competitionIndex)}`,
    evidenceLabels: [`근거 ${snapshot.id}`],
  };
}

function compareSearchTrendSnapshots(left: SearchTrendSnapshot, right: SearchTrendSnapshot): number {
  return maxTrendRatio(right) - maxTrendRatio(left);
}

function searchTrendEvidence(snapshot: SearchTrendSnapshot): KeywordPerformanceDashboardView["recommendationEvidence"][number] {
  return {
    id: `keyword-recommendation-trend-${snapshot.id}`,
    title: snapshot.keywordGroupName,
    sourceLabel: "데이터랩 추이",
    summary: `상대지수 최대 ${formatNumber(maxTrendRatio(snapshot))} 기준입니다. 절대 검색량처럼 보지 않습니다.`,
    evidenceLabels: [`기간 ${snapshot.startDate}~${snapshot.endDate}`, "상대 추이", `근거 ${snapshot.id}`],
  };
}

function seasonalKeywordEvidence(
  plan: SeasonalKeywordAdPlan,
  event?: MarketingCalendarEvent,
): KeywordPerformanceDashboardView["recommendationEvidence"][number] {
  const calendarBasis = event?.eventType === "solar" ? "양력" : "음력";
  const keywords = uniqueKeywordLabels([...plan.keywordSet.add, ...plan.keywordSet.expand]).slice(0, 3);

  return {
    id: `keyword-recommendation-season-${plan.id}`,
    title: event?.name ?? "시즌 키워드",
    sourceLabel: `${calendarBasis} 시즌 윈도우`,
    summary: `${keywords.join(", ") || "키워드 후보"}를 전년도 같은 ${calendarBasis} 이벤트 윈도우와 함께 봅니다.`,
    evidenceLabels: [`단계 ${seasonStageLabel(plan.seasonStage)}`, "전년도/명절 윈도우 비교", `근거 ${plan.id}`],
  };
}

function seasonalKeywordCandidates(
  plan: SeasonalKeywordAdPlan,
  event?: MarketingCalendarEvent,
): KeywordPerformanceDashboardView["recommendationKeywords"] {
  const eventName = event?.name ?? "시즌";
  return uniqueKeywordLabels([...plan.keywordSet.add, ...plan.keywordSet.expand])
    .slice(0, 4)
    .map((keyword, index) => ({
      id: `keyword-candidate-season-${plan.id}-${index}`,
      keyword,
      brandLabel: "시즌 캠페인",
      sourceLabel: `${eventName} 시즌`,
      reasonLabel: "전년도 같은 이벤트 윈도우와 함께 검증할 후보입니다.",
      evidenceLabels: [`근거 ${plan.id}`, `단계 ${seasonStageLabel(plan.seasonStage)}`],
    }));
}

function shopFlowKeywordCandidates(
  brandKey: string,
  evidenceId: string,
  orderCount: number,
  repeatCustomerCount: number,
): KeywordPerformanceDashboardView["recommendationKeywords"] {
  const brandLabel = brandLabelFromKey(brandKey);
  const keywords = repeatCustomerCount > 0 ? [`${brandLabel} 재구매`, `${brandLabel} 선물`] : [`${brandLabel} 선물`];

  return keywords.map((keyword, index) => ({
    id: `keyword-candidate-shop-${evidenceId}-${index}`,
    keyword,
    brandLabel,
    sourceLabel: "쇼핑몰 주문 흐름",
    reasonLabel: `${orderCount.toLocaleString("ko-KR")}건 주문 · 재구매 ${repeatCustomerCount.toLocaleString("ko-KR")}명`,
    evidenceLabels: [`근거 ${evidenceId}`],
  }));
}

function extractProductKeywordCandidates(productName?: string): string[] {
  if (!productName) {
    return [];
  }

  const rawTokens = productName
    .split(/[\s,/()_\-[\]{}·]+/)
    .map((token) => token.replace(/[^\p{Script=Hangul}A-Za-z0-9]/gu, "").trim())
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));
  const tokens = uniqueKeywordLabels(rawTokens);
  const hasSticker = tokens.some((token) => token.includes("스티커"));
  const hasReplyGift = tokens.some((token) => token.includes("답례"));
  const candidates: string[] = [];

  if (tokens.some((token) => token.includes("생일축하스티커"))) {
    candidates.push("생일축하스티커");
  }
  if (hasSticker && hasReplyGift) {
    candidates.push("답례품 스티커");
  }
  if (tokens.some((token) => token.includes("어린이집")) && hasReplyGift) {
    candidates.push("어린이집 답례품");
  }
  if (tokens.some((token) => token.includes("유치원")) && hasReplyGift) {
    candidates.push("유치원 답례품");
  }
  if (tokens.some((token) => token.includes("구디백")) && hasSticker) {
    candidates.push("구디백 스티커");
  }

  candidates.push(
    ...tokens.filter((token) => {
      if (PRODUCT_KEYWORD_STOP_WORDS.has(token)) {
        return false;
      }
      return token.length <= 16 && PRODUCT_KEYWORD_PATTERN.test(token);
    }),
  );

  return uniqueKeywordLabels(candidates).slice(0, 5);
}

function uniqueKeywordLabels(keywords: string[]): string[] {
  const uniqueKeywords = new Map<string, string>();

  for (const keyword of keywords) {
    const key = normalizeRecommendationKey(keyword);
    if (!uniqueKeywords.has(key)) {
      uniqueKeywords.set(key, keyword);
    }
  }

  return [...uniqueKeywords.values()];
}

function keywordDemandVolume(snapshot: KeywordDemandSnapshot): number {
  return Number(snapshot.monthlyPcSearches ?? 0) + Number(snapshot.monthlyMobileSearches ?? 0);
}

function competitionLabel(value: KeywordDemandSnapshot["competitionIndex"]): string {
  const labels: Record<NonNullable<KeywordDemandSnapshot["competitionIndex"]>, string> = {
    LOW: "낮음",
    MEDIUM: "중간",
    HIGH: "높음",
    UNKNOWN: "미확인",
  };

  return value ? labels[value] : "미확인";
}

function maxTrendRatio(snapshot: SearchTrendSnapshot): number {
  return Math.max(0, ...snapshot.ratios.map((ratio) => ratio.ratio));
}

function seasonStageLabel(stage: SeasonalKeywordAdPlan["seasonStage"]): string {
  const labels: Record<SeasonalKeywordAdPlan["seasonStage"], string> = {
    DISCOVER: "발굴",
    VALIDATE: "검증",
    TEST: "소액 테스트",
    SCALE: "확대",
    PEAK_GUARD: "피크 방어",
    TAPER: "축소",
    REVIEW: "회고",
  };

  return labels[stage];
}

function conversionRate(aggregate: KeywordAggregate): number {
  return conversionRateFromValues(aggregate.clicks, aggregate.conversions);
}

function conversionRateFromValues(clicks: number, conversions: number): number {
  return clicks > 0 ? conversions / clicks : 0;
}

function costPerOrder(aggregate: KeywordAggregate): number | undefined {
  return aggregate.conversions > 0 ? aggregate.cost / aggregate.conversions : undefined;
}

function roasValue(aggregate: KeywordAggregate): number | undefined {
  return aggregate.cost > 0 ? aggregate.revenue / aggregate.cost : undefined;
}

function firstDefined<T>(values: Array<T | undefined>): T | undefined {
  return values.find((value): value is T => value !== undefined);
}

function latestCheckedAtLabel(reports: ProviderSyncReport[], fallbackGeneratedAt: string): string {
  const latestCheckedAt = reports.map((report) => report.checkedAt).sort((left, right) => right.localeCompare(left))[0];

  return `갱신 ${formatKoreanDateTime(latestCheckedAt ?? fallbackGeneratedAt)}`;
}

function buildKeywordThumbnailDataUri(productName: string): string {
  const label = compactProductLabel(productName);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<rect width="72" height="72" rx="10" fill="#edf6f1"/>`,
    `<rect x="13" y="15" width="46" height="34" rx="7" fill="#ffffff" stroke="#b7dfcf" stroke-width="3"/>`,
    `<path d="M20 27h32M20 37h24" stroke="#17745f" stroke-width="4" stroke-linecap="round" opacity="0.72"/>`,
    `<circle cx="53" cy="20" r="7" fill="#17745f" opacity="0.9"/>`,
    `<text x="36" y="62" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" font-weight="700" fill="#17745f">${escapeSvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildKeywordWorkDeskCards(report: ProviderSyncReport, generatedAt: string): WorkDeskCardView[] {
  const diagnoses = buildAdPerformanceDiagnoses({
    snapshots: report.searchAdPerformanceSnapshots ?? [],
    shoppingSnapshots: report.shoppingSearchAdPerformanceSnapshots ?? [],
    generatedAt,
  });
  const searchSnapshotsById = new Map((report.searchAdPerformanceSnapshots ?? []).map((snapshot) => [snapshot.id, snapshot]));
  const shoppingSnapshotsById = new Map(
    (report.shoppingSearchAdPerformanceSnapshots ?? []).map((snapshot) => [snapshot.id, snapshot]),
  );

  return diagnoses.map((diagnosis) =>
    buildKeywordWorkDeskCard({
      diagnosis,
      searchSnapshotsById,
      shoppingSnapshotsById,
    }),
  );
}

function buildKeywordWorkDeskCard(input: {
  diagnosis: AdPerformanceDiagnosis;
  searchSnapshotsById: Map<string, SearchAdPerformanceSnapshot>;
  shoppingSnapshotsById: Map<string, ShoppingSearchAdPerformanceSnapshot>;
}): WorkDeskCardView {
  const { diagnosis } = input;
  const searchSnapshots = diagnosis.evidenceIds
    .map((id) => input.searchSnapshotsById.get(id))
    .filter((snapshot): snapshot is SearchAdPerformanceSnapshot => Boolean(snapshot));
  const shoppingSnapshots = diagnosis.evidenceIds
    .map((id) => input.shoppingSnapshotsById.get(id))
    .filter((snapshot): snapshot is ShoppingSearchAdPerformanceSnapshot => Boolean(snapshot));
  const primarySearchSnapshot = searchSnapshots[0];
  const primaryShoppingSnapshot = shoppingSnapshots[0];
  const action = keywordActionCopy(diagnosis);
  const delegation = keywordDelegationCopy(diagnosis);

  return {
    id: `work-desk-card-${diagnosis.id}`,
    ownerId: diagnosis.character,
    ownerName: characterName(diagnosis.character),
    parentTitle:
      diagnosis.character === "day" ? "검색광고 전환 추적 근거 확인 요청" : "저성과 검색광고 키워드 조정 안건",
    title: `${diagnosis.keyword} ${action.shortLabel}`,
    brandLabel: brandLabelFromKey(diagnosis.brandKey),
    domainLabel: primaryShoppingSnapshot ? "쇼핑검색광고" : "검색광고",
    statusLabel: diagnosis.character === "day" ? "근거 확인" : "대표 첫 승인 필요",
    priorityLabel: severityLabel(diagnosis.severity),
    routeLabel: diagnosis.character === "day" ? "데이 확인 후 모아 재보고" : "모아 검토 후 대표 승인",
    keywordLabel: diagnosis.keyword,
    contextLabels: keywordContextLabels(primarySearchSnapshot, primaryShoppingSnapshot),
    metricLabels: keywordMetricLabels(searchSnapshots, shoppingSnapshots),
    diagnosisLabel: diagnosisKindLabel(diagnosis.kind),
    recommendedActionLabel: action.label,
    reasonLabel: action.reason,
    evidenceLabels: diagnosis.evidenceIds.map((id) => `근거 ${id}`),
    detailHref: "/approvals",
    delegation,
  };
}

function keywordContextLabels(
  searchSnapshot?: SearchAdPerformanceSnapshot,
  shoppingSnapshot?: ShoppingSearchAdPerformanceSnapshot,
): string[] {
  if (shoppingSnapshot) {
    return [
      shoppingSnapshot.campaignName,
      shoppingSnapshot.adGroupName,
      shoppingSnapshot.productGroupName ? `상품 ${shoppingSnapshot.productGroupName}` : "상품 그룹 미확인",
    ];
  }

  if (!searchSnapshot) {
    return ["광고 설정 근거 확인 필요"];
  }

  return [
    searchSnapshot.campaignName,
    searchSnapshot.adGroupName,
    `기기 ${deviceLabel(searchSnapshot.device)}`,
    searchSnapshot.timeSlot ? `시간 ${searchSnapshot.timeSlot}` : "전체 시간",
  ];
}

function keywordMetricLabels(
  searchSnapshots: SearchAdPerformanceSnapshot[],
  shoppingSnapshots: ShoppingSearchAdPerformanceSnapshot[],
): string[] {
  if (shoppingSnapshots.length > 0) {
    const snapshot = shoppingSnapshots[0];
    return [
      `최근 ${snapshot.windowDays}일 클릭 ${snapshot.clicks.toLocaleString("ko-KR")}회`,
      `비용 ${snapshot.cost.toLocaleString("ko-KR")}원`,
      `직접 전환율 ${formatPercent(snapshot.directConversionRate)}`,
    ];
  }

  if (searchSnapshots.length === 0) {
    return ["성과 집계 확인 필요"];
  }

  const primary = searchSnapshots[0];
  const totalClicks = sum(searchSnapshots.map((snapshot) => snapshot.clicks));
  const totalCost = sum(searchSnapshots.map((snapshot) => snapshot.cost));
  const totalConversions = sum(searchSnapshots.map((snapshot) => snapshot.conversions));
  const labels = [
    `최근 ${primary.windowDays}일 클릭 ${totalClicks.toLocaleString("ko-KR")}회`,
    `비용 ${totalCost.toLocaleString("ko-KR")}원`,
    `주문 ${totalConversions.toLocaleString("ko-KR")}건`,
  ];
  const cpa = totalConversions > 0 ? Math.round(totalCost / totalConversions) : undefined;
  if (cpa) {
    labels.push(`CPA ${cpa.toLocaleString("ko-KR")}원`);
  }

  return labels;
}

function keywordActionCopy(diagnosis: AdPerformanceDiagnosis): { shortLabel: string; label: string; reason: string } {
  const copies: Record<AdPerformanceDiagnosis["kind"], { shortLabel: string; label: string; reason: string }> = {
    CLICKS_NO_ORDER: {
      shortLabel: "조정 검토",
      label: "입찰 하향 또는 일시중지 검토",
      reason: "주문은 없지만 시즌/브랜드 핵심 키워드일 수 있으므로 즉시 중지 전 유지 예외를 먼저 확인합니다.",
    },
    LOW_CVR: {
      shortLabel: "관찰 조정",
      label: "관찰 연장 또는 입찰 하향",
      reason: "전환율이 낮아도 학습 기간, 시즌 초입, 랜딩 개선 예정이면 유지 후 다시 볼 수 있습니다.",
    },
    HIGH_CPA: {
      shortLabel: "비용 조정",
      label: "목표 CPA 안으로 입찰 하향",
      reason: "전환은 있으므로 전체 중지보다 비용 상한 안에서 효율을 맞추는 조정이 우선입니다.",
    },
    DEVICE_GAP: {
      shortLabel: "기기 조정",
      label: "성과 낮은 기기만 하향",
      reason: "키워드 전체 중지가 아니라 성과가 좋은 PC 또는 모바일은 유지하고 낮은 쪽만 조정합니다.",
    },
    TIME_SLOT_GAP: {
      shortLabel: "시간 조정",
      label: "저성과 시간대 제외 또는 하향",
      reason: "전환이 나는 시간대는 유지하고 비용만 쓰는 시간대부터 조정합니다.",
    },
    TRACKING_UNVERIFIED: {
      shortLabel: "추적 확인",
      label: "전환 추적 확인",
      reason: "주문 연결이 불확실하면 조정이 아니라 데이가 원천 집계와 추적 상태를 먼저 확인해야 합니다.",
    },
    SHOPPING_SEARCH_NO_ORDER: {
      shortLabel: "상품 노출 점검",
      label: "입찰 하향 또는 상품 노출 점검",
      reason: "쇼핑검색어는 상품명, 썸네일, 랜딩 적합도가 영향을 주므로 중지 전 상품 노출 적합성을 확인합니다.",
    },
    SHOPPING_SEARCH_LOW_DIRECT_CVR: {
      shortLabel: "전환율 점검",
      label: "입찰 하향 또는 상품 노출 조건 조정",
      reason: "직접 전환율이 낮아도 시즌 검색어이거나 대표 상품 노출이면 관찰 기간을 둔 뒤 조정할 수 있습니다.",
    },
  };

  return copies[diagnosis.kind];
}

function keywordDelegationCopy(diagnosis: AdPerformanceDiagnosis): WorkDeskCardView["delegation"] {
  if (diagnosis.character === "day") {
    return {
      state: "NEEDS_DATA_REVIEW",
      label: "위임 전 데이터 확인",
      summary: "전환 추적과 주문 연결이 확인되기 전에는 모아가 자동 조정하지 않습니다.",
      ruleHint: "추적 확인 완료 후 동일 조건의 조정 위임 여부를 대표가 다시 정합니다.",
      reportLabel: "데이가 확인 결과를 모아에게 재보고",
    };
  }

  return {
    state: "OWNER_FIRST_APPROVAL_REQUIRED",
    label: "대표 첫 승인 필요",
    summary: "처음 실행하는 키워드 조정 유형은 대표가 먼저 승인합니다.",
    ruleHint: "승인 시 같은 브랜드, 같은 진단, 같은 조정 한도는 다음부터 모아에게 위임할 수 있습니다.",
    reportLabel: "모아 자동 처리 후에도 대표에게 결과 보고",
  };
}

function diagnosisKindLabel(kind: AdPerformanceDiagnosis["kind"]): string {
  const labels: Record<AdPerformanceDiagnosis["kind"], string> = {
    CLICKS_NO_ORDER: "클릭은 있으나 주문 없음",
    LOW_CVR: "전환율 낮음",
    HIGH_CPA: "CPA 높음",
    DEVICE_GAP: "기기별 성과 차이",
    TIME_SLOT_GAP: "시간대별 성과 차이",
    TRACKING_UNVERIFIED: "전환 추적 확인 필요",
    SHOPPING_SEARCH_NO_ORDER: "쇼핑검색어 직접 전환 없음",
    SHOPPING_SEARCH_LOW_DIRECT_CVR: "쇼핑검색어 직접 전환율 낮음",
  };

  return labels[kind];
}

function dedupeWorkDeskCards(cards: WorkDeskCardView[]): WorkDeskCardView[] {
  return Array.from(new Map(cards.map((card) => [card.id, card])).values());
}

function compareWorkDeskCards(left: WorkDeskCardView, right: WorkDeskCardView): number {
  return workDeskCardPriority(right) - workDeskCardPriority(left);
}

function workDeskCardPriority(card: WorkDeskCardView): number {
  const priorityScore = card.priorityLabel === "높음" ? 30 : card.priorityLabel === "중간" ? 20 : 10;
  const ownerScore = card.ownerId === "gro" ? 4 : card.ownerId === "day" ? 3 : 1;
  return priorityScore + ownerScore;
}

function severityLabel(severity: AdPerformanceDiagnosis["severity"]): string {
  const labels: Record<AdPerformanceDiagnosis["severity"], string> = {
    LOW: "낮음",
    MEDIUM: "중간",
    HIGH: "높음",
  };

  return labels[severity];
}

function brandLabelFromKey(brandKey: string): string {
  const labels: Record<string, string> = {
    STICKERSEE: "스티커씨",
    COFFEEPRINT: "커피프린트",
  };

  return labels[brandKey.toUpperCase()] ?? brandKey;
}

function normalizeBrandKey(brandKey: string): string {
  return brandKey.trim().toUpperCase();
}

function deviceLabel(device: SearchAdPerformanceSnapshot["device"]): string {
  const labels: Record<SearchAdPerformanceSnapshot["device"], string> = {
    ALL: "전체",
    PC: "PC",
    MOBILE: "모바일",
  };

  return labels[device];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
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
  latestDecision?: OwnerDecision,
): ApprovalPreviewView {
  const canApply = request.status === "PENDING" && request.dataConfidence === "READY_TO_APPROVE";
  const measurementLabels = request.executionPlan.measurementPlan.checkpoints.map(
    (checkpoint) => `${checkpoint.label} ${checkpoint.dueDate}`,
  );

  return {
    id: request.id,
    title: request.title,
    statusLabel: approvalRequestStatusLabel(request, latestDecision),
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
    secondaryActions: ["초안 확정", "수정 요청", "추가 근거 요청", "보류", "반려"],
    disabledReason: canApply ? undefined : disabledReason(request),
    executionScopeProposal: buildExecutionScopeProposalView(request.executionPlan.executionScopeProposal),
    provenance: buildApprovalProvenanceView(request, plan, repository, providerSyncReports),
  };
}

function buildExecutionScopeProposalView(
  proposal: ApprovalRequest["executionPlan"]["executionScopeProposal"],
): ApprovalPreviewView["executionScopeProposal"] {
  if (!proposal) {
    return undefined;
  }

  return {
    title: proposal.title,
    summary: proposal.summary,
    fields: proposal.fields.map((field) => ({
      id: field.id,
      label: field.label,
      recommendedValue: field.recommendedValue,
      options: Array.from(new Set([field.recommendedValue, ...field.options])),
      reason: field.reason,
      required: field.required,
    })),
    guardrailLabels: proposal.guardrails,
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
  if (evidenceId.includes("shopping-search-ad-performance")) {
    return "쇼핑검색광고 성과";
  }

  if (evidenceId.includes("search-ad-performance") || evidenceId.includes("ad-perf")) {
    return "검색광고 성과";
  }

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
    executionStateLabel: executionStateLabel(executionState, result.executionResult?.appliedOperations ?? []),
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
  const historyPolicy = {
    ...(report.historyPolicy ?? {}),
    ...getProviderHistoryPolicy(report.provider),
  };
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
      baseScheduleLabel: historyPolicy.baseScheduleLabel,
      intensiveScheduleLabel: historyPolicy.intensiveScheduleLabel,
      manualRefreshLabel: historyPolicy.manualRefreshLabel,
      freshnessLabel: historyPolicy.freshnessLabel,
      dedupeKeyLabel: historyPolicy.dedupeKeyLabel,
      sourceUrl: historyPolicy.sourceUrl,
    },
  };
}

function buildProductGrowthOpportunityView(opportunity: ProductGrowthOpportunity): AgendaRoomViewModel["productGrowthOpportunities"][number] {
  const targetLabel = toOperatorKorean(opportunity.targetName);

  return {
    id: opportunity.id,
    owner: characterName(opportunity.owner),
    kindLabel: opportunityKindLabel(opportunity.kind),
    confidenceLabel: confidenceLabel(opportunity.confidence),
    title: toOperatorKorean(opportunity.title),
    targetLabel,
    productImageUrl: opportunity.productImageUrl ?? buildProductThumbnailDataUri(opportunity.kind, targetLabel),
    productImageAlt: `${targetLabel} 상품 이미지`,
    summary: toOperatorKorean(opportunity.summary),
    keywords: opportunity.keywordCandidates,
    evidenceLabels: opportunity.evidenceLabels.map(toOperatorKorean),
    nextAction: toOperatorKorean(opportunity.nextAction),
    guardrail: toOperatorKorean(opportunity.guardrail),
    sourceReportIds: opportunity.sourceReportIds.map((_, index) => `연동 수집 기록 ${index + 1}`),
  };
}

function buildProductThumbnailDataUri(kind: ProductGrowthOpportunity["kind"], targetLabel: string): string {
  const palette =
    kind === "MARKETING_PROPOSAL"
      ? { background: "#fdf0e7", accent: "#c85a2a", soft: "#f8c9a8" }
      : kind === "PRODUCT_DISCOVERY"
        ? { background: "#edf6f1", accent: "#17745f", soft: "#b7dfcf" }
        : { background: "#eaf1fb", accent: "#245c9f", soft: "#bdd3ee" };
  const label = compactProductLabel(targetLabel);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">`,
    `<rect width="96" height="96" rx="14" fill="${palette.background}"/>`,
    `<rect x="18" y="20" width="60" height="48" rx="8" fill="#ffffff" stroke="${palette.soft}" stroke-width="3"/>`,
    `<path d="M24 34h48M24 47h36M24 60h28" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" opacity="0.72"/>`,
    `<circle cx="72" cy="26" r="10" fill="${palette.accent}" opacity="0.9"/>`,
    `<text x="48" y="84" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="700" fill="${palette.accent}">${escapeSvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function compactProductLabel(targetLabel: string): string {
  const normalized = targetLabel.split("/")[0]?.trim() ?? targetLabel.trim();

  return [...normalized].slice(0, 5).join("") || "상품";
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function buildCharacterStatuses(input: {
  characterReports: CharacterReport[];
  workDeskCards: WorkDeskCardView[];
  pendingApprovalCount: number;
  waitingEvidenceCount: number;
  openEvidenceRequestCount: number;
}): AgendaRoomViewModel["characters"] {
  const queueCounts = new Map<CharacterKey, number>();
  for (const report of input.characterReports) {
    queueCounts.set(report.character, (queueCounts.get(report.character) ?? 0) + report.agendaCandidateIds.length);
  }
  const activeSet = new Set(queueCounts.keys());
  const workCardCounts = countBy(input.workDeskCards, (card) => card.ownerId);
  const importantWorkCardCounts = countBy(
    input.workDeskCards.filter((card) => card.priorityLabel === "높음" || card.priorityLabel === "중간"),
    (card) => card.ownerId,
  );
  const ownerFirstApprovalCount = input.workDeskCards.filter(
    (card) => card.delegation.state === "OWNER_FIRST_APPROVAL_REQUIRED",
  ).length;
  const dataReviewCardCount = input.workDeskCards.filter((card) => card.delegation.state === "NEEDS_DATA_REVIEW").length;
  const characterDefinitions = [
    {
      id: "moa" as const,
      name: "모아",
      role: "업무실장",
      tone: "coordinator" as const,
      activeStatus: "키워드 성과/추천 안건을 대표 결재 흐름으로 묶는 중",
      preparingStatus: "키워드 결재 종합 이후 추가 업무 준비중",
      queue: input.pendingApprovalCount,
      cards: ownerFirstApprovalCount,
      priority: importantWorkCardCounts.get("gro") ?? 0,
      evidence: dataReviewCardCount,
      base: 18,
    },
    {
      id: "gro" as const,
      name: "그로",
      role: "키워드 성과 담당",
      tone: "growth" as const,
      activeStatus: activeSet.has("gro") ? "키워드 성과/추천 안건 상신" : "키워드 성과 카드 확인 중",
      preparingStatus: "키워드 기능 이후 성장 업무 준비중",
      queue: queueCounts.get("gro") ?? 0,
      cards: workCardCounts.get("gro") ?? 0,
      priority: importantWorkCardCounts.get("gro") ?? 0,
      evidence: 0,
      base: 14,
    },
    {
      id: "pro" as const,
      name: "프로",
      role: "상품 담당",
      tone: "product" as const,
      activeStatus: activeSet.has("pro") ? "스마트스토어 상품/키워드 안건 상신" : "상품 묶음 후보 대기",
      preparingStatus: "상품 전략 업무는 준비중",
      queue: queueCounts.get("pro") ?? 0,
      cards: workCardCounts.get("pro") ?? 0,
      priority: importantWorkCardCounts.get("pro") ?? 0,
      evidence: 0,
      base: 12,
    },
    {
      id: "copy" as const,
      name: "카피",
      role: "메시지 담당",
      tone: "copy" as const,
      activeStatus: "승인 후 문구 초안 준비",
      preparingStatus: "문안 업무는 준비중",
      queue: queueCounts.get("copy") ?? 0,
      cards: workCardCounts.get("copy") ?? 0,
      priority: importantWorkCardCounts.get("copy") ?? 0,
      evidence: 0,
      base: 12,
    },
    {
      id: "ripi" as const,
      name: "리피",
      role: "재구매 담당",
      tone: "crm" as const,
      activeStatus: activeSet.has("ripi") ? "영카트 재구매 고객군 안건 상신" : "이벤트 구매 고객군 관찰",
      preparingStatus: "재구매 업무는 준비중",
      queue: queueCounts.get("ripi") ?? 0,
      cards: workCardCounts.get("ripi") ?? 0,
      priority: importantWorkCardCounts.get("ripi") ?? 0,
      evidence: 0,
      base: 12,
    },
    {
      id: "maru" as const,
      name: "마루",
      role: "커머스 운영",
      tone: "finance" as const,
      activeStatus: activeSet.has("maru") ? "브랜드별 주문/판매채널 상태 점검안 상신" : "브랜드별 주문, 상품 흐름, 판매채널 상태 확인",
      preparingStatus: "커머스 운영 업무는 준비중",
      queue: queueCounts.get("maru") ?? 0,
      cards: workCardCounts.get("maru") ?? 0,
      priority: importantWorkCardCounts.get("maru") ?? 0,
      evidence: 0,
      base: 12,
    },
    {
      id: "day" as const,
      name: "데이",
      role: "근거 확인 담당",
      tone: "data" as const,
      activeStatus: activeSet.has("day") ? "키워드 근거와 전환 추적 확인" : "키워드 근거 품질 확인 중",
      preparingStatus: "데이터 감사 확장 업무는 준비중",
      queue: (queueCounts.get("day") ?? 0) + input.openEvidenceRequestCount,
      cards: workCardCounts.get("day") ?? 0,
      priority: importantWorkCardCounts.get("day") ?? 0,
      evidence: input.waitingEvidenceCount + input.openEvidenceRequestCount + dataReviewCardCount,
      base: 14,
    },
  ];

  return characterDefinitions.map((definition) => {
    const availability = keywordPilotAvailability(definition.id);
    if (!isKeywordPilotActiveCharacter(definition.id)) {
      return {
        id: definition.id,
        name: definition.name,
        role: definition.role,
        tone: definition.tone,
        status: `${definition.preparingStatus} · 현재 범위: ${keywordPilotScopeLabel}`,
        availability: availability.availability,
        availabilityLabel: availability.availabilityLabel,
        workload: 0,
        workloadFormulaLabel: "준비중 = 0%",
        queueCount: 0,
      };
    }

    const workload = calculateWorkloadPercent({
      base: definition.base,
      queue: definition.queue,
      cards: definition.cards,
      priority: definition.priority,
      evidence: definition.evidence,
    });

    return {
      id: definition.id,
      name: definition.name,
      role: definition.role,
      tone: definition.tone,
      status: definition.activeStatus,
      availability: availability.availability,
      availabilityLabel: availability.availabilityLabel,
      workload,
      workloadFormulaLabel: workloadFormulaLabel({
        base: definition.base,
        queue: definition.queue,
        cards: definition.cards,
        priority: definition.priority,
        evidence: definition.evidence,
        workload,
      }),
      queueCount: definition.queue + definition.cards,
    };
  });
}

function calculateWorkloadPercent(input: {
  base: number;
  queue: number;
  cards: number;
  priority: number;
  evidence: number;
}): number {
  return clampPercent(input.base + input.queue * 8 + input.cards * 10 + input.priority * 6 + input.evidence * 6);
}

function workloadFormulaLabel(input: {
  base: number;
  queue: number;
  cards: number;
  priority: number;
  evidence: number;
  workload: number;
}): string {
  const terms = [`기본 ${input.base}`];
  if (input.queue > 0) {
    terms.push(`대기 ${input.queue}×8`);
  }
  if (input.cards > 0) {
    terms.push(`카드 ${input.cards}×10`);
  }
  if (input.priority > 0) {
    terms.push(`중요 ${input.priority}×6`);
  }
  if (input.evidence > 0) {
    terms.push(`근거 ${input.evidence}×6`);
  }

  return `${terms.join(" + ")} = ${input.workload}%`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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
      channelLabel: "마케팅 데이터",
      providerLabel: providerKeyLabel(report.provider),
    };
  }

  return {
    providerGroup: "ad",
    channelKey: "search-ad",
    channelLabel: "마케팅 데이터",
    providerLabel: providerKeyLabel(report.provider),
  };
}

function buildProviderSnapshotLabels(report: ProviderSyncReport): string[] {
  const labels: string[] = [];

  if (report.keywordDemandSnapshots?.length) {
    labels.push(`키워드 수요 ${report.keywordDemandSnapshots.length.toLocaleString("ko-KR")}건`);
  }

  if (report.searchAdPerformanceSnapshots?.length) {
    labels.push(`검색광고 성과 ${report.searchAdPerformanceSnapshots.length.toLocaleString("ko-KR")}건`);
  }

  if (report.shoppingSearchAdPerformanceSnapshots?.length) {
    labels.push(`쇼핑검색광고 성과 ${report.shoppingSearchAdPerformanceSnapshots.length.toLocaleString("ko-KR")}건`);
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

function approvalRequestStatusLabel(request: ApprovalRequest, latestDecision?: OwnerDecision): string {
  if (request.status === "PENDING") {
    return "대표 승인 대기";
  }

  if (request.status === "APPROVED" && latestDecision?.decision === "APPROVE_DRAFT_ONLY") {
    return "초안 확정됨";
  }

  if (request.status === "APPROVED") {
    return "승인됨";
  }

  if (request.status === "NEEDS_EVIDENCE") {
    return "추가 근거 요청";
  }

  const labels: Record<Exclude<ApprovalRequest["status"], "PENDING" | "APPROVED" | "NEEDS_EVIDENCE">, string> = {
    REJECTED: "반려됨",
    HELD: "보류됨",
    NEEDS_REVISION: "수정 필요",
  };

  return labels[request.status];
}

function decisionLabel(decision: OwnerDecisionType): string {
  const labels: Record<OwnerDecisionType, string> = {
    APPROVE_AND_APPLY: "승인 후 바로 반영",
    APPROVE_DRAFT_ONLY: "초안 확정",
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

function executionStateLabel(state: string, appliedOperations: string[] = []): OwnerDecisionFlowView["executionStateLabel"] {
  if (state === "APPLIED") {
    if (appliedOperations.some((operation) => operation.startsWith("draft-only:"))) {
      return "내부 초안 기록됨";
    }

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

function executionResultStateFromFlow(
  state: OwnerDecisionFlowView["executionStateLabel"],
): AgendaRoomViewModel["executionResults"][number]["state"] {
  if (state === "실행됨") {
    return "실행됨";
  }

  if (state === "내부 초안 기록됨") {
    return "내부 초안";
  }

  if (state === "대기") {
    return "대기";
  }

  return "차단됨";
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
