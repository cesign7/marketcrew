import { buildAgendaRoomViewModel, type BuildAgendaRoomViewModelInput } from "@/features/agenda-room/buildAgendaRoomViewModel";
import type {
  ApprovalPreviewView,
  ExecutionResultView,
  OutcomeCheckpointView,
  OwnerDecisionFlowView,
  ProviderSyncEvidenceView,
} from "@/features/agenda-room/types";
import type {
  AgentRun,
  AgentRunWorkflowLink,
  AgentRunType,
  AgentRunStatus,
  AgentRunWorkflowRelation,
  OutcomeReport,
  WorkflowObjectType,
} from "@/lib/domain";
import type { MarketingWorkflowRepository } from "@/lib/application/workflow-repository";

export type ApprovalDetailViewModel = {
  generatedAt: string;
  id: string;
  title: string;
  moaSummary: string;
  approvalPreview: ApprovalPreviewView;
  providerSyncEvidence: ProviderSyncEvidenceView[];
  agentRunTimeline: ApprovalAgentRunTimelineView[];
  outcomeHistory: OutcomeReportHistoryView[];
  ownerDecisionFlows: OwnerDecisionFlowView[];
  executionResults: ExecutionResultView[];
  outcomeCheckpoints: OutcomeCheckpointView[];
};

export type ApprovalAgentRunTimelineView = {
  id: string;
  runnerLabel: string;
  statusLabel: string;
  statusTone: "success" | "warning" | "blocked";
  modelLabel: string;
  modeLabel: string;
  tokenLabel: string;
  costLabel: string;
  evidenceCountLabel: string;
  evidenceTraceLabel: string;
  inputSummary: string;
  outputSummary: string;
  linkedObjectLabels: string[];
  relationLabels: string[];
  finishedAt: string;
  errorMessage?: string;
};

export type OutcomeReportHistoryView = {
  id: string;
  stateLabel: string;
  stateTone: "success" | "warning" | "blocked";
  summary: string;
  baselineSummary: string;
  checkpointSummary: string;
  evidenceLabels: string[];
  sourceReportIds: string[];
  followUpAgendaTitle?: string;
  createdAt: string;
};

export function buildApprovalDetailViewModel(
  approvalId: string,
  input: BuildAgendaRoomViewModelInput = {},
): ApprovalDetailViewModel | undefined {
  const room = buildAgendaRoomViewModel(input);
  const approvalPreview = room.approvalPreviews.find((preview) => preview.id === approvalId);
  if (!approvalPreview) {
    return undefined;
  }

  const repository = input.repository;

  return {
    generatedAt: room.generatedAt,
    id: approvalPreview.id,
    title: approvalPreview.title,
    moaSummary: room.moaReport.summary,
    approvalPreview,
    providerSyncEvidence: filterProviderSyncEvidence(room.providerSyncEvidence, approvalPreview),
    agentRunTimeline: repository ? buildApprovalAgentRunTimeline(repository, approvalPreview.id) : [],
    outcomeHistory: buildOutcomeHistory(repository?.listOutcomeReports() ?? [], approvalPreview.id),
    ownerDecisionFlows: room.ownerDecisionFlows.filter((flow) => flow.title === approvalPreview.title),
    executionResults: room.executionResults.filter((result) => result.title === approvalPreview.title),
    outcomeCheckpoints: room.outcomeCheckpoints.filter((checkpoint) => checkpoint.title.startsWith(approvalPreview.title)),
  };
}

export function buildApprovalAgentRunTimeline(
  repository: MarketingWorkflowRepository,
  approvalId: string,
): ApprovalAgentRunTimelineView[] {
  const relatedRefs = buildRelatedWorkflowRefKeys(repository, approvalId);
  const linksByRunId = groupLinksByRunId(
    repository.listAgentRunWorkflowLinks().filter((link) => relatedRefs.has(workflowRefKey(link.objectType, link.objectId))),
  );
  const runsById = new Map(repository.listAgentRuns().map((run) => [run.id, run]));
  const timeline: ApprovalAgentRunTimelineView[] = [];

  for (const [runId, links] of linksByRunId.entries()) {
    const run = runsById.get(runId);
    if (!run) {
      continue;
    }

    const relationLabels = Array.from(new Set(links.map((link) => relationLabel(link.relation))));
    const linkedObjectLabels = Array.from(new Set(links.map((link) => workflowObjectLabel(link.objectType))));

    timeline.push({
      id: `AI 실행 ${timeline.length + 1} · ${agentRunTypeLabel(run.runType)}`,
      runnerLabel: agentRunTypeLabel(run.runType),
      statusLabel: agentRunStatusLabel(run.status),
      statusTone: agentRunStatusTone(run.status),
      modelLabel: `연동 ${agentRunProviderLabel(run.provider)} · 모델 ${agentRunModelLabel(run.model)}`,
      modeLabel: agentRunModeLabel(run.mode),
      tokenLabel: `${run.tokenUsage.totalTokens.toLocaleString("ko-KR")}토큰${run.tokenUsage.estimated ? " 추정" : ""}`,
      costLabel: `${run.tokenUsage.estimatedCostKrw.toLocaleString("ko-KR")}원`,
      evidenceCountLabel: `근거 ${run.evidenceIds.length.toLocaleString("ko-KR")}개`,
      evidenceTraceLabel:
        run.evidenceIds.length > 0 ? `근거 ${run.evidenceIds.length.toLocaleString("ko-KR")}개 연결` : "근거 없음",
      inputSummary: toOperatorKorean(run.inputSummary),
      outputSummary: toOperatorKorean(run.outputSummary),
      linkedObjectLabels,
      relationLabels,
      finishedAt: formatKoreanDateTime(run.finishedAt ?? run.startedAt),
      errorMessage: run.errorMessage ? toOperatorKorean(run.errorMessage) : undefined,
    });
  }

  return timeline.sort((left, right) => right.finishedAt.localeCompare(left.finishedAt));
}

export function buildOutcomeHistory(outcomeReports: OutcomeReport[], approvalId: string): OutcomeReportHistoryView[] {
  return outcomeReports
    .filter((report) => report.approvalRequestId === approvalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((report) => ({
      id: report.id,
      stateLabel: outcomeStateLabel(report.state),
      stateTone: outcomeStateTone(report.state),
      summary: toOperatorKorean(report.summary),
      baselineSummary: toOperatorKorean(report.baselineSummary),
      checkpointSummary: toOperatorKorean(report.checkpointSummary),
      evidenceLabels: (report.evidenceLabels ?? []).map(toOperatorKorean),
      sourceReportIds: (report.sourceReportIds ?? []).map((_, index) => `연동 수집 기록 ${index + 1}`),
      followUpAgendaTitle: report.followUpAgendaTitle ? toOperatorKorean(report.followUpAgendaTitle) : undefined,
      createdAt: formatKoreanDateTime(report.createdAt),
    }));
}

function buildRelatedWorkflowRefKeys(repository: MarketingWorkflowRepository, approvalId: string): Set<string> {
  const relatedRefs = new Set<string>([workflowRefKey("approval_request", approvalId)]);
  const ownerDecisionIds = repository
    .listOwnerDecisions()
    .filter((decision) => decision.approvalRequestId === approvalId)
    .map((decision) => decision.id);
  const preflightCheckIds = repository
    .listPreflightChecks()
    .filter((check) => check.approvalRequestId === approvalId)
    .map((check) => check.id);
  const executionResultIds = repository
    .listExecutionResults()
    .filter((result) => result.approvalRequestId === approvalId)
    .map((result) => result.id);
  const performanceCheckpointIds = repository
    .listPerformanceCheckpoints()
    .filter((checkpoint) => checkpoint.approvalRequestId === approvalId)
    .map((checkpoint) => checkpoint.id);
  const outcomeReports = repository.listOutcomeReports().filter((report) => report.approvalRequestId === approvalId);
  const followUpTaskIds = repository
    .listFollowUpInternalTasks()
    .filter((task) => task.sourceApprovalRequestId === approvalId)
    .map((task) => task.id);

  for (const id of ownerDecisionIds) {
    relatedRefs.add(workflowRefKey("owner_decision", id));
  }
  for (const id of preflightCheckIds) {
    relatedRefs.add(workflowRefKey("preflight_check", id));
  }
  for (const id of executionResultIds) {
    relatedRefs.add(workflowRefKey("execution_result", id));
  }
  for (const id of performanceCheckpointIds) {
    relatedRefs.add(workflowRefKey("performance_checkpoint", id));
  }
  for (const report of outcomeReports) {
    relatedRefs.add(workflowRefKey("outcome_report", report.id));
    for (const sourceReportId of report.sourceReportIds ?? []) {
      relatedRefs.add(workflowRefKey("provider_sync_report", sourceReportId));
    }
  }
  for (const id of followUpTaskIds) {
    relatedRefs.add(workflowRefKey("follow_up_internal_task", id));
  }

  return relatedRefs;
}

function groupLinksByRunId(links: AgentRunWorkflowLink[]): Map<string, AgentRunWorkflowLink[]> {
  const linksByRunId = new Map<string, AgentRunWorkflowLink[]>();
  for (const link of links) {
    linksByRunId.set(link.agentRunId, [...(linksByRunId.get(link.agentRunId) ?? []), link]);
  }

  return linksByRunId;
}

function workflowRefKey(objectType: WorkflowObjectType, objectId: string): string {
  return `${objectType}:${objectId}`;
}

function agentRunTypeLabel(runType: AgentRunType): string {
  const labels: Record<AgentRunType, string> = {
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

function toOperatorKorean(value: string): string {
  return value
    .replaceAll("쓰기 게이트", "외부 반영 잠금")
    .replaceAll("AgentRun timeline", "AI 실행 이력")
    .replaceAll("AgentRun", "AI 실행 기록")
    .replaceAll("DB mode smoke", "DB 저장 확인")
    .replaceAll("APPROVAL_PENDING", "승인 대기")
    .replaceAll("KeywordDemandSnapshot", "키워드 수요 요약")
    .replaceAll("SearchTrendSnapshot", "검색 추이 요약")
    .replaceAll("Client Credentials", "커머스 인증")
    .replaceAll("client secret", "시크릿")
    .replaceAll("productOrderId", "주문번호")
    .replaceAll("raw order", "주문 원문")
    .replaceAll("bridge", "연결")
    .replaceAll("report", "수집 기록")
    .replaceAll("ROAS", "광고수익률")
    .replaceAll("CTR", "클릭률")
    .replaceAll("CPA", "전환단가")
    .replaceAll("CVR", "전환율")
    .replaceAll("SPEND", "광고비")
    .replaceAll("SALES", "매출")
    .replaceAll("MARGIN", "마진")
    .replaceAll("provider write gate", "외부 반영 잠금")
    .replaceAll("write gate", "외부 반영 잠금")
    .replaceAll("provider report", "연동 수집 기록")
    .replaceAll("provider sync", "연동 수집")
    .replaceAll("read-only provider", "읽기 전용 연동")
    .replaceAll("read-only sync", "읽기 전용 수집")
    .replaceAll("read-only", "읽기 전용")
    .replaceAll("provider", "연동")
    .replaceAll("sync", "수집")
    .replaceAll("snapshot", "요약 자료")
    .replaceAll("preflight", "실행 전 점검")
    .replaceAll("mock", "모의")
    .replaceAll("tokens", "토큰")
    .replaceAll("token", "토큰")
    .replaceAll("deterministic fallback", "규칙 기반 대체")
    .replaceAll("fallback", "대체")
    .replaceAll("주문 원문 행는", "주문 원문 행은")
    .replaceAll("원천 행는", "원천 행은")
    .replaceAll("연결는", "연결은");
}

function agentRunStatusLabel(status: AgentRunStatus): string {
  const labels: Record<AgentRunStatus, string> = {
    SUCCEEDED: "성공",
    FAILED: "실패",
    SKIPPED: "건너뜀",
  };

  return labels[status];
}

function agentRunStatusTone(status: AgentRunStatus): ApprovalAgentRunTimelineView["statusTone"] {
  if (status === "SUCCEEDED") {
    return "success";
  }
  if (status === "FAILED") {
    return "blocked";
  }

  return "warning";
}

function agentRunModeLabel(mode: AgentRun["mode"]): string {
  const labels: Record<AgentRun["mode"], string> = {
    deterministic_fallback: "규칙 기반 대체",
    llm: "AI 모델",
    provider_read_only: "연동 읽기 전용",
    mock_execution: "모의 실행",
  };

  return labels[mode];
}

function relationLabel(relation: AgentRunWorkflowRelation): string {
  const labels: Record<AgentRunWorkflowRelation, string> = {
    generated: "생성",
    used_as_evidence: "근거 사용",
    decided: "대표 결정",
    executed: "실행",
    measured: "성과 측정",
  };

  return labels[relation];
}

function workflowObjectLabel(objectType: WorkflowObjectType): string {
  const labels: Record<WorkflowObjectType, string> = {
    signal: "시그널",
    agenda_candidate: "안건 후보",
    hypothesis_candidate: "가설 후보",
    evidence_request: "근거 요청",
    character_report: "캐릭터 보고",
    moa_synthesis_report: "모아 종합",
    approval_request: "결재안",
    owner_decision: "대표 결정",
    preflight_check: "실행 전 점검",
    execution_result: "실행 결과",
    performance_checkpoint: "성과 체크포인트",
    outcome_report: "성과 보고",
    provider_sync_report: "연동 근거",
    follow_up_internal_task: "후속 업무",
  };

  return labels[objectType];
}

function filterProviderSyncEvidence(
  reports: ProviderSyncEvidenceView[],
  approvalPreview: ApprovalPreviewView,
): ProviderSyncEvidenceView[] {
  if (reports.length === 0) {
    return [];
  }

  const providerKeys = relevantProviderKeys(approvalPreview);
  const filteredReports = reports.filter((report) => providerKeys.includes(report.providerKey));
  const remainingReports = reports.filter((report) => !providerKeys.includes(report.providerKey));

  return filteredReports.length > 0 ? [...filteredReports, ...remainingReports] : reports;
}

function relevantProviderKeys(approvalPreview: ApprovalPreviewView): ProviderSyncEvidenceView["providerKey"][] {
  const searchableText = [
    approvalPreview.title,
    approvalPreview.evidenceSummary,
    approvalPreview.diffSummary,
    approvalPreview.executorLabel,
    ...approvalPreview.beforeItems,
    ...approvalPreview.afterItems,
  ].join(" ");
  const providerKeys: ProviderSyncEvidenceView["providerKey"][] = [];

  if (/검색광고|키워드|입찰|예산|광고/.test(searchableText)) {
    providerKeys.push("search_ad", "datalab");
  }

  if (/스마트스토어|스티커씨|상품|랜딩|상위 상품/.test(searchableText)) {
    providerKeys.push("smartstore", "search_ad", "datalab");
  }

  if (/커피프린트|영카트|자체몰|자체 쇼핑몰|쇼핑몰|CRM|재구매|고객군/.test(searchableText)) {
    providerKeys.push("shop", "smartstore");
  }

  if (/채널|손익|매출 균형|마진/.test(searchableText)) {
    providerKeys.push("smartstore", "shop");
  }

  return Array.from(new Set(providerKeys));
}

function outcomeStateLabel(state: OutcomeReport["state"]): string {
  const labels: Record<OutcomeReport["state"], string> = {
    SUCCESS: "성공",
    PARTIAL_SUCCESS: "부분 성공",
    FAILED: "실패",
    INCONCLUSIVE: "판단 보류",
  };

  return labels[state];
}

function outcomeStateTone(state: OutcomeReport["state"]): OutcomeReportHistoryView["stateTone"] {
  if (state === "SUCCESS") {
    return "success";
  }

  if (state === "FAILED") {
    return "blocked";
  }

  return "warning";
}

function formatKoreanDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}
