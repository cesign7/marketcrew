import type {
  AgentRun,
  AgentRunMode,
  AgentRunProvider,
  AgentRunStatus,
  AgentRunWorkflowLink,
  AgendaCandidate,
  EvidenceRequest,
  HypothesisCandidate,
  LlmPlannerAuditRun,
  LlmPlannerInput,
  LlmPlannerResult,
  ProviderSyncReport,
  WorkflowObjectRef,
} from "../domain";
import type { MarketingWorkflowRepository } from "./workflow-repository";
import type { OwnerDecisionWorkflowResult } from "./approval-workflow";

export function recordPlannerAgentRun(
  repository: MarketingWorkflowRepository,
  input: LlmPlannerInput,
  result: LlmPlannerResult,
  audit: LlmPlannerAuditRun,
): AgentRun {
  const run: AgentRun = {
    id: audit.id,
    runnerKey: audit.runnerKey,
    runType: "moa_planner",
    mode: result.mode === "deterministic_fallback" ? "deterministic_fallback" : "llm",
    provider: normalizeAgentRunProvider(audit.provider),
    model: audit.model,
    status: "SUCCEEDED",
    inputSummary: `결재 후보 ${audit.sourceCounts.candidateSummaries.toLocaleString("ko-KR")}건과 연동 근거 메모 ${audit.sourceCounts.providerEvidenceNotes.toLocaleString("ko-KR")}개를 요약 입력으로 사용했습니다.`,
    outputSummary: result.summary,
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: audit.tokenUsage.inputEstimate,
      outputTokens: audit.tokenUsage.outputEstimate,
      totalTokens: audit.tokenUsage.totalEstimate,
      estimated: true,
      estimatedCostKrw: audit.billing.estimatedCostKrw,
      basis: audit.billing.basis,
    },
    evidenceIds: audit.evidenceIds,
    startedAt: input.generatedAt,
    finishedAt: result.createdAt,
  };
  const links = result.recommendedApprovalIds.map((approvalId) =>
    buildWorkflowLink(run.id, { objectType: "approval_request", objectId: approvalId }, "generated", result.createdAt),
  );

  const existingRun = repository.listAgentRuns().find((candidate) => candidate.id === run.id);
  if (existingRun && isSameAgentRun(existingRun, run) && hasExpectedWorkflowLinks(repository, run.id, links)) {
    return existingRun;
  }

  repository.saveAgentRuns([run]);
  repository.saveAgentRunWorkflowLinks(links);

  return run;
}

export function recordProviderSyncAgentRuns(
  repository: MarketingWorkflowRepository,
  reports: ProviderSyncReport[],
): AgentRun[] {
  const runs = reports.map(buildProviderSyncAgentRun);
  const links = reports.flatMap((report) => {
    const runId = providerSyncRunId(report);
    const createdAt = report.checkedAt;
    const workflowLinks: AgentRunWorkflowLink[] = [
      buildWorkflowLink(runId, { objectType: "provider_sync_report", objectId: report.id }, "generated", createdAt),
    ];

    if (report.generatedSignal) {
      workflowLinks.push(
        buildWorkflowLink(runId, { objectType: "signal", objectId: report.generatedSignal.id }, "generated", createdAt),
      );
    }

    return workflowLinks;
  });

  repository.saveAgentRuns(runs);
  repository.saveAgentRunWorkflowLinks(links);

  return runs;
}

export function recordOwnerDecisionAgentRun(
  repository: MarketingWorkflowRepository,
  result: OwnerDecisionWorkflowResult,
): AgentRun {
  const executionState = result.executionResult?.state;
  const run: AgentRun = {
    id: `agent-run-owner-decision-${result.ownerDecision.id}`,
    runnerKey: "owner_decision_workflow",
    runType: "owner_decision",
    mode: result.executionResult ? "mock_execution" : "deterministic_fallback",
    provider: "local",
    model: "owner-decision-workflow",
    status: "SUCCEEDED",
    inputSummary: `${result.ownerDecision.decision} 대표 결정을 처리했습니다.`,
    outputSummary: executionState
      ? `결재 상태 ${result.updatedApprovalRequest.status}, 실행 상태 ${executionState}, 후속 업무 ${result.followUpTasks.length.toLocaleString("ko-KR")}건을 기록했습니다.`
      : `결재 상태 ${result.updatedApprovalRequest.status}, 후속 업무 ${result.followUpTasks.length.toLocaleString("ko-KR")}건을 기록했습니다.`,
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      estimatedCostKrw: 0,
      basis: "로컬 규칙 기반 업무 흐름",
    },
    evidenceIds: result.outcomeReport?.evidenceIds ?? [],
    startedAt: result.ownerDecision.decidedAt,
    finishedAt: result.outcomeReport?.createdAt ?? result.ownerDecision.decidedAt,
  };
  const links = buildOwnerDecisionLinks(run.id, result);

  repository.saveAgentRuns([run]);
  repository.saveAgentRunWorkflowLinks(links);

  return run;
}

export function recordEvidenceRequestReviewAgentRun(
  repository: MarketingWorkflowRepository,
  input: {
    evidenceRequest: EvidenceRequest;
    hypothesis?: HypothesisCandidate;
    promotedAgendaCandidate?: AgendaCandidate;
    reviewedAt: string;
  },
): AgentRun {
  const run: AgentRun = {
    id: `agent-run-evidence-request-review-${input.evidenceRequest.id}-${compactTimestamp(input.reviewedAt)}`,
    runnerKey: "day_evidence_request_review",
    runType: "evidence_request_review",
    mode: "deterministic_fallback",
    provider: "local",
    model: "evidence-request-review-workflow",
    status: "SUCCEEDED",
    inputSummary: `데이가 ${evidenceSourceLabel(input.evidenceRequest.neededSource)} 근거 요청을 ${evidenceRequestStatusLabel(
      input.evidenceRequest.status,
    )} 상태로 검토했습니다.`,
    outputSummary: input.promotedAgendaCandidate
      ? `${input.hypothesis?.title ?? "자유 탐색 가설"}을 근거 확인 후 ${input.promotedAgendaCandidate.title}으로 승격했습니다.`
      : `${input.hypothesis?.title ?? "자유 탐색 가설"}은 ${evidenceRequestStatusLabel(
          input.evidenceRequest.status,
        )} 상태로 저장하고 대표 결재 승격을 보류했습니다.`,
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      estimatedCostKrw: 0,
      basis: "데이의 로컬 근거 검증 기록",
    },
    evidenceIds: input.evidenceRequest.verifiedEvidenceIds,
    startedAt: input.reviewedAt,
    finishedAt: input.reviewedAt,
  };
  const links = buildEvidenceRequestReviewLinks(run.id, input);

  repository.saveAgentRuns([run]);
  repository.saveAgentRunWorkflowLinks(links);

  return run;
}

function buildProviderSyncAgentRun(report: ProviderSyncReport): AgentRun {
  const evidenceIds = Array.from(
    new Set([
      ...(report.generatedSignal?.evidenceRowIds ?? []),
      ...(report.keywordDemandSnapshots ?? []).map((snapshot) => snapshot.id),
      ...(report.searchTrendSnapshots ?? []).map((snapshot) => snapshot.id),
      report.commerceAggregateSnapshot?.id,
      report.shopAggregateSnapshot?.id,
    ].filter(Boolean) as string[]),
  );

  return {
    id: providerSyncRunId(report),
    runnerKey: `${report.provider}_read_only_sync`,
    runType: "provider_sync",
    mode: "provider_read_only",
    provider: providerFromSyncReport(report),
    model: "read-only-adapter",
    status: statusFromProviderSyncReport(report),
    inputSummary: `${report.label}을 ${report.endpoint} 기준으로 실행했습니다.`,
    outputSummary: report.failureReason ?? `${providerSyncStatusLabel(report.status)} 상태로 근거 메모 ${report.evidenceNotes.length.toLocaleString("ko-KR")}개를 남겼습니다.`,
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      estimatedCostKrw: 0,
      basis: "AI 모델 과금 없는 읽기 전용 연동 수집",
    },
    evidenceIds,
    startedAt: report.checkedAt,
    finishedAt: report.checkedAt,
    errorMessage: report.status === "FAILED" ? report.failureReason : undefined,
  };
}

function buildOwnerDecisionLinks(agentRunId: string, result: OwnerDecisionWorkflowResult): AgentRunWorkflowLink[] {
  const createdAt = result.ownerDecision.decidedAt;
  const refs: Array<{ ref: WorkflowObjectRef; relation: AgentRunWorkflowLink["relation"] }> = [
    {
      ref: { objectType: "approval_request", objectId: result.updatedApprovalRequest.id },
      relation: "decided",
    },
    {
      ref: { objectType: "owner_decision", objectId: result.ownerDecision.id },
      relation: "decided",
    },
  ];

  if (result.preflightCheck) {
    refs.push({
      ref: { objectType: "preflight_check", objectId: result.preflightCheck.id },
      relation: "used_as_evidence",
    });
  }
  if (result.executionResult) {
    refs.push({
      ref: { objectType: "execution_result", objectId: result.executionResult.id },
      relation: "executed",
    });
  }
  if (result.outcomeReport) {
    refs.push({
      ref: { objectType: "outcome_report", objectId: result.outcomeReport.id },
      relation: "measured",
    });
  }
  for (const checkpoint of result.performanceCheckpoints) {
    refs.push({
      ref: { objectType: "performance_checkpoint", objectId: checkpoint.id },
      relation: "measured",
    });
  }
  for (const task of result.followUpTasks) {
    refs.push({
      ref: { objectType: "follow_up_internal_task", objectId: task.id },
      relation: "generated",
    });
  }

  return refs.map(({ ref, relation }) => buildWorkflowLink(agentRunId, ref, relation, createdAt));
}

function buildEvidenceRequestReviewLinks(
  agentRunId: string,
  input: {
    evidenceRequest: EvidenceRequest;
    hypothesis?: HypothesisCandidate;
    promotedAgendaCandidate?: AgendaCandidate;
    reviewedAt: string;
  },
): AgentRunWorkflowLink[] {
  const refs: Array<{ ref: WorkflowObjectRef; relation: AgentRunWorkflowLink["relation"] }> = [
    {
      ref: { objectType: "evidence_request", objectId: input.evidenceRequest.id },
      relation: "decided",
    },
  ];

  if (input.hypothesis) {
    refs.push({
      ref: { objectType: "hypothesis_candidate", objectId: input.hypothesis.id },
      relation: "decided",
    });
  }

  if (input.promotedAgendaCandidate) {
    refs.push({
      ref: { objectType: "agenda_candidate", objectId: input.promotedAgendaCandidate.id },
      relation: "generated",
    });
  }

  return refs.map(({ ref, relation }) => buildWorkflowLink(agentRunId, ref, relation, input.reviewedAt));
}

function providerSyncRunId(report: ProviderSyncReport): string {
  return `agent-run-provider-sync-${report.id}`;
}

function providerSyncStatusLabel(status: ProviderSyncReport["status"]): string {
  const labels: Record<ProviderSyncReport["status"], string> = {
    READY_READ_ONLY: "읽기 준비",
    SYNCED: "수집 완료",
    SKIPPED_MISSING_CONFIG: "설정 부족으로 건너뜀",
    FAILED: "수집 실패",
  };

  return labels[status];
}

function buildWorkflowLink(
  agentRunId: string,
  ref: WorkflowObjectRef,
  relation: AgentRunWorkflowLink["relation"],
  createdAt: string,
): AgentRunWorkflowLink {
  return {
    id: `agent-run-link-${agentRunId}-${ref.objectType}-${ref.objectId}-${relation}`,
    agentRunId,
    objectType: ref.objectType,
    objectId: ref.objectId,
    relation,
    createdAt,
  };
}

function compactTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "");
}

function evidenceRequestStatusLabel(status: EvidenceRequest["status"]): string {
  const labels: Record<EvidenceRequest["status"], string> = {
    REQUESTED: "확인 대기",
    COLLECTING: "수집 중",
    VERIFIED: "근거 충분",
    INSUFFICIENT: "근거 부족",
  };

  return labels[status];
}

function evidenceSourceLabel(source: EvidenceRequest["neededSource"]): string {
  const labels: Record<EvidenceRequest["neededSource"], string> = {
    search_ad: "검색광고",
    smartstore: "스마트스토어",
    shop: "쇼핑몰",
    datalab: "데이터랩",
    internal: "내부",
  };

  return labels[source];
}

function isSameAgentRun(left: AgentRun, right: AgentRun): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasExpectedWorkflowLinks(
  repository: MarketingWorkflowRepository,
  agentRunId: string,
  expectedLinks: AgentRunWorkflowLink[],
): boolean {
  const existingLinkKeys = new Set(
    repository
      .listAgentRunWorkflowLinks()
      .filter((link) => link.agentRunId === agentRunId)
      .map(workflowLinkIdentity),
  );

  return expectedLinks.every((link) => existingLinkKeys.has(workflowLinkIdentity(link)));
}

function workflowLinkIdentity(link: AgentRunWorkflowLink): string {
  return [link.agentRunId, link.objectType, link.objectId, link.relation, link.createdAt].join("|");
}

function statusFromProviderSyncReport(report: ProviderSyncReport): AgentRunStatus {
  if (report.status === "FAILED") {
    return "FAILED";
  }

  if (report.status === "SKIPPED_MISSING_CONFIG") {
    return "SKIPPED";
  }

  return "SUCCEEDED";
}

function providerFromSyncReport(report: ProviderSyncReport): AgentRunProvider {
  if (report.provider === "shop") {
    return "youngcart";
  }

  return "naver";
}

function normalizeAgentRunProvider(provider: string): AgentRunProvider {
  if (provider === "deterministic" || provider === "openai" || provider === "gemini" || provider === "naver" || provider === "youngcart") {
    return provider;
  }

  return "local";
}
