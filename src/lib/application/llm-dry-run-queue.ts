import type { LlmPlannerAuditRun, LlmPlannerResult } from "../domain";

type CostGateTone = "ready" | "warning" | "blocked";

type LlmCostGateSnapshot = {
  liveCallAllowed: boolean;
  providerLabel: string;
  modelLabel: string;
  estimatedRunCostLabel: string;
  runBudgetLabel: string;
  decisionSummary: string;
  gateChecks: Array<{
    id: string;
    label: string;
    statusLabel: string;
    tone: CostGateTone;
    message: string;
  }>;
};

export type LlmDryRunQueue = {
  title: string;
  summaryLabel: string;
  guardrailLabel: string;
  items: LlmDryRunQueueItem[];
};

export type LlmDryRunQueueItem = {
  id: string;
  runnerName: string;
  runnerRole: string;
  statusLabel: string;
  tone: "ready" | "blocked";
  callGateOpen: boolean;
  actualCallLabel: "실제 호출 대기" | "실제 호출 차단";
  executionModeLabel: "모의 실행만 기록";
  modelLabel: string;
  budgetLabel: string;
  tokenLabel: string;
  evidenceLabel: string;
  inputPolicyLabel: string;
  decisionSummary: string;
  rawRowsIncluded: boolean;
  selectedApprovalIds: string[];
  evidenceIds: string[];
  blockedGateLabels: string[];
  readyGateLabels: string[];
};

export type BuildLlmDryRunQueueInput = {
  generatedAt: string;
  plannerAudit: LlmPlannerAuditRun;
  plannerResult: LlmPlannerResult;
  costGovernance: LlmCostGateSnapshot;
};

// 실제 모델 호출 전, 어떤 입력과 비용 조건으로 호출 후보가 될지 감사 가능한 큐로 고정한다.
export function buildLlmDryRunQueue(input: BuildLlmDryRunQueueInput): LlmDryRunQueue {
  const blockedGateLabels = input.costGovernance.gateChecks
    .filter((check) => check.tone === "blocked")
    .map((check) => `${check.label}: ${check.message}`);
  const readyGateLabels = input.costGovernance.gateChecks
    .filter((check) => check.tone !== "blocked")
    .map((check) => `${check.label}: ${check.statusLabel}`);
  const rawRowsIncluded = input.plannerResult.rawRowsIncluded || input.plannerAudit.tokenUsage.rawRowsIncluded;
  const callGateOpen = input.costGovernance.liveCallAllowed && !rawRowsIncluded;
  const statusLabel = callGateOpen ? "모의 실행 가능" : "비용 가드 차단";
  const item: LlmDryRunQueueItem = {
    id: `llm-dry-run-${compactId(input.plannerAudit.id)}`,
    runnerName: "모아",
    runnerRole: "대표 결재 전 AI 종합 담당",
    statusLabel,
    tone: callGateOpen ? "ready" : "blocked",
    callGateOpen,
    actualCallLabel: callGateOpen ? "실제 호출 대기" : "실제 호출 차단",
    executionModeLabel: "모의 실행만 기록",
    modelLabel: `${input.costGovernance.providerLabel} · ${input.costGovernance.modelLabel}`,
    budgetLabel: `${input.costGovernance.estimatedRunCostLabel} · ${input.costGovernance.runBudgetLabel}`,
    tokenLabel: `입력 ${formatCount(input.plannerAudit.tokenUsage.inputEstimate)}토큰 · 출력 ${formatCount(
      input.plannerAudit.tokenUsage.outputEstimate,
    )}토큰 · 총 ${formatCount(input.plannerAudit.tokenUsage.totalEstimate)}토큰`,
    evidenceLabel: `근거 ${formatCount(input.plannerAudit.evidenceIds.length)}개 · 후보 ${formatCount(
      input.plannerAudit.sourceCounts.candidateSummaries,
    )}건 · 선택 ${formatCount(input.plannerAudit.sourceCounts.selectedApprovals)}건`,
    inputPolicyLabel: rawRowsIncluded ? "원천 행 포함 요청 차단" : "원천 행 제외 · 집계 요약만 사용",
    decisionSummary: callGateOpen
      ? "비용과 토큰 조건은 열렸지만, 이 단계에서는 실제 AI 호출 없이 입력 범위와 근거만 기록합니다."
      : input.costGovernance.decisionSummary,
    rawRowsIncluded,
    selectedApprovalIds: input.plannerResult.recommendedApprovalIds,
    evidenceIds: input.plannerAudit.evidenceIds,
    blockedGateLabels,
    readyGateLabels,
  };

  return {
    title: "AI 실행 큐",
    summaryLabel: `${callGateOpen ? "대기" : "차단"} ${formatCount(1)}건`,
    guardrailLabel: "실제 호출 전 비용 가드, 토큰 상한, 원천 행 제외를 확인하고 모의 실행 기록만 남깁니다.",
    items: [item],
  };
}

function compactId(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]/g, "-");
}

function formatCount(value: number): string {
  return value.toLocaleString("ko-KR");
}
