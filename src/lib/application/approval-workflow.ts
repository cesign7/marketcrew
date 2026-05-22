import type {
  ApprovalRequest,
  ExecutionResult,
  FollowUpInternalTask,
  OwnerDecision,
  OwnerDecisionType,
  OutcomeReport,
  PerformanceCheckpoint,
  PreflightCheck,
  ProviderSyncReport,
} from "../domain";
import { MockProviderExecutor } from "../integrations/executors/mock-provider-executor";
import type { MarketingWorkflowRepository } from "./workflow-repository";
import { recordOwnerDecisionAgentRun } from "./agent-run-recorder";
import { buildProviderOutcomeAnalysis } from "./provider-outcome-analysis";

export type ProcessOwnerDecisionInput = {
  approvalRequest: ApprovalRequest;
  decision: OwnerDecisionType;
  memo: string;
  now: string;
  externalWriteEnabled?: boolean;
  secondConfirmation?: boolean;
  providerSyncReports?: ProviderSyncReport[];
  repository?: MarketingWorkflowRepository;
};

export type OwnerDecisionWorkflowResult = {
  ownerDecision: OwnerDecision;
  updatedApprovalRequest: ApprovalRequest;
  preflightCheck?: PreflightCheck;
  executionResult?: ExecutionResult;
  performanceCheckpoints: PerformanceCheckpoint[];
  outcomeReport?: OutcomeReport;
  followUpTasks: FollowUpInternalTask[];
};

// Design Ref: §3.6 + §3.7 — 대표 결정 후 실행 전 점검, 모의 실행, 성과 추적 계약을 한 번에 만든다.
export function processOwnerDecision(input: ProcessOwnerDecisionInput): OwnerDecisionWorkflowResult {
  const ownerDecision = buildOwnerDecision(input);

  if (input.decision === "APPROVE_AND_APPLY") {
    return processApproveAndApply(input, ownerDecision);
  }

  if (input.decision === "APPROVE_DRAFT_ONLY") {
    return processApproveDraftOnly(input, ownerDecision);
  }

  return processNonExecutionDecision(input, ownerDecision);
}

function processApproveAndApply(
  input: ProcessOwnerDecisionInput,
  ownerDecision: OwnerDecision,
): OwnerDecisionWorkflowResult {
  const preflightCheck = runPreflightCheck(input);
  if (preflightCheck.status === "BLOCKED") {
    const result = {
      ownerDecision,
      updatedApprovalRequest: {
        ...input.approvalRequest,
        status: "NEEDS_EVIDENCE" as const,
      },
      preflightCheck,
      performanceCheckpoints: [],
      followUpTasks: buildPreflightFollowUpTasks(input.approvalRequest, input.now, preflightCheck),
    };
    persistWorkflowResult(input.repository, result);
    return result;
  }

  const executionResult = new MockProviderExecutor({
    externalWriteEnabled: input.externalWriteEnabled,
  }).execute(input.approvalRequest);
  const performanceCheckpoints = buildDecisionPerformanceCheckpoints(input.approvalRequest, input.now);
  const outcomeReport = buildOutcomeReport({
    approvalRequest: input.approvalRequest,
    executionResult,
    now: input.now,
    providerSyncReports: input.providerSyncReports,
  });
  const followUpTasks = buildExecutionFollowUpTasks(input.approvalRequest, executionResult, input.now);
  const result = {
    ownerDecision,
    updatedApprovalRequest: {
      ...input.approvalRequest,
      status: "APPROVED" as const,
    },
    preflightCheck,
    executionResult,
    performanceCheckpoints,
    outcomeReport,
    followUpTasks,
  };

  persistWorkflowResult(input.repository, result);
  return result;
}

function processApproveDraftOnly(
  input: ProcessOwnerDecisionInput,
  ownerDecision: OwnerDecision,
): OwnerDecisionWorkflowResult {
  const executionResult: ExecutionResult = {
    id: `exec-draft-${input.approvalRequest.id}`,
    approvalRequestId: input.approvalRequest.id,
    state: "APPLIED",
    appliedOperations: [`draft-only:${input.approvalRequest.executionPlan.executorKey}`],
    failedOperations: [],
    createdAt: input.now,
  };
  const performanceCheckpoints = buildDecisionPerformanceCheckpoints(input.approvalRequest, input.now);
  const outcomeReport = buildOutcomeReport({
    approvalRequest: input.approvalRequest,
    executionResult,
    now: input.now,
    draftOnly: true,
    providerSyncReports: input.providerSyncReports,
  });
  const result = {
    ownerDecision,
    updatedApprovalRequest: {
      ...input.approvalRequest,
      status: "APPROVED" as const,
    },
    executionResult,
    performanceCheckpoints,
    outcomeReport,
    followUpTasks: [
      {
        id: `followup-draft-${input.approvalRequest.id}`,
        sourceApprovalRequestId: input.approvalRequest.id,
        assignedCharacter: "moa" as const,
        title: "초안 승인 범위로 내부 작업을 정리하고 외부 반영 전 재상신",
        status: "OPEN" as const,
        createdAt: input.now,
      },
    ],
  };

  persistWorkflowResult(input.repository, result);
  return result;
}

function processNonExecutionDecision(
  input: ProcessOwnerDecisionInput,
  ownerDecision: OwnerDecision,
): OwnerDecisionWorkflowResult {
  const updatedApprovalRequest: ApprovalRequest = {
    ...input.approvalRequest,
    status: statusFromNonExecutionDecision(input.decision),
  };
  const followUpTasks = [
    {
      id: `followup-${input.decision.toLowerCase()}-${input.approvalRequest.id}`,
      sourceApprovalRequestId: input.approvalRequest.id,
      assignedCharacter: followUpCharacterFromDecision(input.decision),
      title: followUpTitleFromDecision(input.decision),
      status: "OPEN" as const,
      createdAt: input.now,
    },
  ];
  const result = {
    ownerDecision,
    updatedApprovalRequest,
    performanceCheckpoints: [],
    followUpTasks,
  };

  persistWorkflowResult(input.repository, result);
  return result;
}

function buildOwnerDecision(input: ProcessOwnerDecisionInput): OwnerDecision {
  return {
    id: `decision-${input.approvalRequest.id}-${input.decision.toLowerCase()}`,
    approvalRequestId: input.approvalRequest.id,
    decision: input.decision,
    memo: input.memo,
    actor: "owner",
    decidedAt: input.now,
  };
}

function runPreflightCheck(input: ProcessOwnerDecisionInput): PreflightCheck {
  const { approvalRequest } = input;
  const checks: PreflightCheck["checks"] = [
    {
      code: "APPROVAL_PENDING",
      label: "결재 상태",
      status: approvalRequest.status === "PENDING" ? "PASS" : "BLOCK",
      message:
        approvalRequest.status === "PENDING"
          ? "대표 결재 대기 상태입니다."
          : "대표 결재 대기 상태가 아니라 즉시 반영할 수 없습니다.",
    },
    {
      code: "DATA_CONFIDENCE",
      label: "근거 신뢰도",
      status: approvalRequest.dataConfidence === "READY_TO_APPROVE" ? "PASS" : "BLOCK",
      message:
        approvalRequest.dataConfidence === "READY_TO_APPROVE"
          ? "근거가 승인 가능 수준입니다."
          : `${approvalRequest.dataConfidence} 상태라 추가 보강이 필요합니다.`,
    },
    {
      code: "ROLLBACK_READY",
      label: "되돌리기",
      status: approvalRequest.executionPlan.rollbackPlan ? "PASS" : "BLOCK",
      message: approvalRequest.executionPlan.rollbackPlan
        ? approvalRequest.executionPlan.rollbackPlan
        : "되돌리기 계획이 없어 즉시 반영할 수 없습니다.",
    },
    {
      code: "MEASUREMENT_READY",
      label: "성과 측정",
      status:
        approvalRequest.executionPlan.measurementPlan.checkpoints.length > 0 &&
        approvalRequest.executionPlan.measurementPlan.metrics.length > 0
          ? "PASS"
          : "BLOCK",
      message:
        approvalRequest.executionPlan.measurementPlan.checkpoints.length > 0
          ? "성과 체크포인트와 지표가 준비되어 있습니다."
          : "성과 체크포인트가 없어 승인 후 분석할 수 없습니다.",
    },
    {
      code: "SECOND_CONFIRMATION",
      label: "2차 확인",
      status: approvalRequest.riskLevel === "CRITICAL" && !input.secondConfirmation ? "BLOCK" : "PASS",
      message:
        approvalRequest.riskLevel === "CRITICAL" && !input.secondConfirmation
          ? "매우 높은 위험 작업은 2차 확인이 필요합니다."
          : "추가 확인 조건을 통과했습니다.",
    },
    {
      code: "WRITE_GATE",
      label: "외부 반영 잠금",
      status: approvalRequest.executionPlan.requiresWriteGate && !input.externalWriteEnabled ? "WARN" : "PASS",
      message:
        approvalRequest.executionPlan.requiresWriteGate && !input.externalWriteEnabled
          ? "실제 외부 반영 잠금이 닫혀 있어 모의 실행 또는 수동 처리가 필요합니다."
          : "외부 반영 잠금 조건을 통과했습니다.",
    },
  ];
  const blockingReasons = checks.filter((check) => check.status === "BLOCK").map((check) => check.code);
  const warnings = checks.filter((check) => check.status === "WARN").map((check) => check.code);

  return {
    id: `preflight-${approvalRequest.id}`,
    approvalRequestId: approvalRequest.id,
    status: blockingReasons.length === 0 ? "PASSED" : "BLOCKED",
    checks,
    blockingReasons,
    warnings,
    checkedAt: input.now,
  };
}

function buildDecisionPerformanceCheckpoints(
  approvalRequest: ApprovalRequest,
  now: string,
): PerformanceCheckpoint[] {
  return approvalRequest.executionPlan.measurementPlan.checkpoints.map((checkpoint) => ({
    id: `checkpoint-${approvalRequest.id}-${checkpoint.label.toLowerCase().replace("+", "plus")}`,
    approvalRequestId: approvalRequest.id,
    title: `${approvalRequest.title} ${checkpoint.label} 성과 확인`,
    dueDate: checkpoint.dueDate,
    metrics: approvalRequest.executionPlan.measurementPlan.metrics,
    status: "PENDING",
    createdAt: now,
  }));
}

function buildOutcomeReport(input: {
  approvalRequest: ApprovalRequest;
  executionResult: ExecutionResult;
  now: string;
  draftOnly?: boolean;
  providerSyncReports?: ProviderSyncReport[];
}): OutcomeReport {
  const providerAnalysis = buildProviderOutcomeAnalysis({
    approvalRequest: input.approvalRequest,
    executionResult: input.executionResult,
    providerSyncReports: input.providerSyncReports ?? [],
    draftOnly: input.draftOnly,
  });
  const state = providerAnalysis?.state ?? outcomeStateFromExecution(input.executionResult);
  const baseline = input.approvalRequest.executionPlan.measurementPlan.baselineWindow;
  const checkpointLabels = input.approvalRequest.executionPlan.measurementPlan.checkpoints
    .map((checkpoint) => `${checkpoint.label} ${checkpoint.dueDate}`)
    .join(", ");

  return {
    id: `outcome-${input.approvalRequest.id}`,
    approvalRequestId: input.approvalRequest.id,
    executionResultId: input.executionResult.id,
    state,
    summary: providerAnalysis?.summary ?? (input.draftOnly
      ? "초안 승인만 기록했습니다. 외부 반영 전 다시 대표 결재가 필요합니다."
      : summaryFromExecution(input.executionResult)),
    baselineSummary: providerAnalysis?.baselineSummary ?? `${baseline.startDate} ~ ${baseline.endDate} 기준선으로 비교합니다.`,
    checkpointSummary: providerAnalysis?.checkpointSummary ?? checkpointLabels,
    evidenceIds: providerAnalysis?.evidenceIds,
    evidenceLabels: providerAnalysis?.evidenceLabels,
    sourceReportIds: providerAnalysis?.sourceReportIds,
    followUpAgendaTitle:
      input.executionResult.state === "NEEDS_MANUAL_ACTION"
        ? "외부 반영 잠금 확인 후 재실행 또는 수동 반영"
        : undefined,
    createdAt: input.now,
  };
}

function buildPreflightFollowUpTasks(
  approvalRequest: ApprovalRequest,
  now: string,
  preflightCheck: PreflightCheck,
): FollowUpInternalTask[] {
  return [
    {
      id: `followup-preflight-${approvalRequest.id}`,
      sourceApprovalRequestId: approvalRequest.id,
      assignedCharacter: "day",
      title: `실행 전 점검 차단 사유 보강: ${preflightCheck.blockingReasons.join(", ")}`,
      status: "OPEN",
      createdAt: now,
    },
  ];
}

function buildExecutionFollowUpTasks(
  approvalRequest: ApprovalRequest,
  executionResult: ExecutionResult,
  now: string,
): FollowUpInternalTask[] {
  if (executionResult.state === "APPLIED") {
    return [
      {
        id: `followup-outcome-${approvalRequest.id}`,
        sourceApprovalRequestId: approvalRequest.id,
        assignedCharacter: "day",
        title: "성과 체크포인트 도래 시 기준선 대비 결과 보고",
        status: "OPEN",
        createdAt: now,
      },
    ];
  }

  return [
    {
      id: `followup-manual-${approvalRequest.id}`,
      sourceApprovalRequestId: approvalRequest.id,
      assignedCharacter: "moa",
      title: "외부 반영 잠금 상태를 대표에게 보고하고 수동 반영 또는 잠금 해제 여부 확인",
      status: "OPEN",
      createdAt: now,
    },
  ];
}

function statusFromNonExecutionDecision(decision: OwnerDecisionType): ApprovalRequest["status"] {
  const statuses: Record<Exclude<OwnerDecisionType, "APPROVE_AND_APPLY" | "APPROVE_DRAFT_ONLY">, ApprovalRequest["status"]> = {
    REQUEST_REVISION: "NEEDS_REVISION",
    REQUEST_MORE_EVIDENCE: "NEEDS_EVIDENCE",
    HOLD: "HELD",
    REJECT: "REJECTED",
  };

  return statuses[decision as Exclude<OwnerDecisionType, "APPROVE_AND_APPLY" | "APPROVE_DRAFT_ONLY">];
}

function followUpCharacterFromDecision(decision: OwnerDecisionType): FollowUpInternalTask["assignedCharacter"] {
  if (decision === "REQUEST_MORE_EVIDENCE") {
    return "day";
  }

  if (decision === "REQUEST_REVISION") {
    return "moa";
  }

  return "maru";
}

function followUpTitleFromDecision(decision: OwnerDecisionType): string {
  const titles: Record<Exclude<OwnerDecisionType, "APPROVE_AND_APPLY" | "APPROVE_DRAFT_ONLY">, string> = {
    REQUEST_REVISION: "대표 수정 요청 반영 후 모아가 재상신",
    REQUEST_MORE_EVIDENCE: "데이가 추가 근거를 수집하고 결재 가능 여부 재판정",
    HOLD: "보류 사유와 재검토 날짜를 기록",
    REJECT: "반려 사유를 기록하고 같은 안건 재상신을 제한",
  };

  return titles[decision as Exclude<OwnerDecisionType, "APPROVE_AND_APPLY" | "APPROVE_DRAFT_ONLY">];
}

function outcomeStateFromExecution(executionResult: ExecutionResult): OutcomeReport["state"] {
  if (executionResult.state === "APPLIED") {
    return "INCONCLUSIVE";
  }

  if (executionResult.state === "PARTIALLY_APPLIED") {
    return "PARTIAL_SUCCESS";
  }

  if (executionResult.state === "FAILED") {
    return "FAILED";
  }

  return "INCONCLUSIVE";
}

function summaryFromExecution(executionResult: ExecutionResult): string {
  if (executionResult.state === "APPLIED") {
    return "모의 실행이 기록되었습니다. 성과 체크포인트 도래 전까지 판단을 보류합니다.";
  }

  if (executionResult.state === "NEEDS_MANUAL_ACTION") {
    return "대표 승인은 통과했지만 실제 외부 반영 잠금이 닫혀 수동 처리 또는 잠금 해제 확인이 필요합니다.";
  }

  return "실행 결과 확인 후 후속 조치가 필요합니다.";
}

function persistWorkflowResult(
  repository: MarketingWorkflowRepository | undefined,
  result: OwnerDecisionWorkflowResult,
): void {
  if (!repository) {
    return;
  }

  repository.saveOwnerDecisions([result.ownerDecision]);
  repository.saveApprovalRequests([result.updatedApprovalRequest]);
  if (result.preflightCheck) {
    repository.savePreflightChecks([result.preflightCheck]);
  }
  if (result.executionResult) {
    repository.saveExecutionResults([result.executionResult]);
  }
  if (result.performanceCheckpoints.length > 0) {
    repository.savePerformanceCheckpoints(result.performanceCheckpoints);
  }
  if (result.outcomeReport) {
    repository.saveOutcomeReports([result.outcomeReport]);
  }
  if (result.followUpTasks.length > 0) {
    repository.saveFollowUpInternalTasks(result.followUpTasks);
  }
  recordOwnerDecisionAgentRun(repository, result);
}
