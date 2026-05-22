import type {
  ApprovalRequest,
  CharacterKey,
  ExecutionResult,
  FollowUpInternalTask,
  OutcomeReport,
  OwnerDecision,
  PreflightCheck,
} from "@/lib/domain";
import type { MarketingWorkflowRepository } from "@/lib/application/workflow-repository";
import type {
  FollowUpCharacterQueueView,
  FollowUpQueueViewModel,
  FollowUpTaskQueueItemView,
  OwnerLearningSignalView,
} from "./types";

export type BuildFollowUpQueueViewModelInput = {
  repository: MarketingWorkflowRepository;
  now?: string;
};

const characterProfiles: Record<CharacterKey, { name: string; role: string }> = {
  moa: { name: "모아", role: "업무실장" },
  gro: { name: "그로", role: "성장 담당" },
  pro: { name: "프로", role: "상품 담당" },
  copy: { name: "카피", role: "메시지 담당" },
  ripi: { name: "리피", role: "재구매 담당" },
  maru: { name: "마루", role: "손익 담당" },
  day: { name: "데이", role: "데이터 담당" },
};

const characterOrder: CharacterKey[] = ["moa", "gro", "pro", "copy", "ripi", "maru", "day"];

export function buildFollowUpQueueViewModel({
  repository,
  now = new Date().toISOString(),
}: BuildFollowUpQueueViewModelInput): FollowUpQueueViewModel {
  const tasks = repository.listFollowUpInternalTasks();
  const approvals = repository.listApprovalRequests();
  const decisions = repository.listOwnerDecisions();
  const outcomes = repository.listOutcomeReports();
  const preflights = repository.listPreflightChecks();
  const executions = repository.listExecutionResults();

  const approvalsById = new Map(approvals.map((approval) => [approval.id, approval]));
  const latestDecisionByApprovalId = latestByApproval(decisions, (decision) => decision.approvalRequestId, (decision) => decision.decidedAt);
  const latestOutcomeByApprovalId = latestByApproval(outcomes, (outcome) => outcome.approvalRequestId, (outcome) => outcome.createdAt);
  const latestPreflightByApprovalId = latestByApproval(preflights, (preflight) => preflight.approvalRequestId, (preflight) => preflight.checkedAt);
  const latestExecutionByApprovalId = latestByApproval(executions, (execution) => execution.approvalRequestId, (execution) => execution.createdAt);

  const taskViews = tasks
    .map((task) =>
      buildTaskView({
        task,
        sourceApproval: approvalsById.get(task.sourceApprovalRequestId),
        latestDecision: latestDecisionByApprovalId.get(task.sourceApprovalRequestId),
        latestOutcome: latestOutcomeByApprovalId.get(task.sourceApprovalRequestId),
        latestPreflight: latestPreflightByApprovalId.get(task.sourceApprovalRequestId),
        latestExecution: latestExecutionByApprovalId.get(task.sourceApprovalRequestId),
      }),
    )
    .sort(taskSort);

  const characterQueues = characterOrder.map((character) => buildCharacterQueue(character, taskViews));
  const ownerLearningSignals = buildOwnerLearningSignals({
    decisions,
    taskViews,
    preflights,
    executions,
    outcomes,
  });

  return {
    generatedAt: formatKoreanDateTime(now),
    summary: {
      openTasks: taskViews.filter((task) => task.status === "OPEN").length,
      doneTasks: taskViews.filter((task) => task.status === "DONE").length,
      sourceApprovals: new Set(taskViews.map((task) => task.sourceApprovalId)).size,
      learningSignals: ownerLearningSignals.length,
    },
    characterQueues,
    ownerLearningSignals,
  };
}

function buildTaskView(input: {
  task: FollowUpInternalTask;
  sourceApproval?: ApprovalRequest;
  latestDecision?: OwnerDecision;
  latestOutcome?: OutcomeReport;
  latestPreflight?: PreflightCheck;
  latestExecution?: ExecutionResult;
}): FollowUpTaskQueueItemView {
  const rawBlockerLabels = collectBlockerLabels(input.latestPreflight, input.latestExecution);
  const blockerLabels = rawBlockerLabels.map(blockerLabel);
  const tone = taskTone(input.task, input.sourceApproval, rawBlockerLabels);
  const latestDecisionLabel = input.latestDecision ? decisionLabel(input.latestDecision.decision) : "대표 결정 없음";
  const latestOutcomeLabel = input.latestOutcome ? outcomeLabel(input.latestOutcome.state) : "성과 보고 대기";

  return {
    id: input.task.id,
    title: toOperatorKorean(input.task.title),
    status: input.task.status,
    statusLabel: input.task.status === "DONE" ? "완료" : "대기",
    tone,
    assignedCharacter: input.task.assignedCharacter,
    assignedCharacterName: characterProfiles[input.task.assignedCharacter].name,
    createdAt: formatKoreanDateTime(input.task.createdAt),
    sourceApprovalId: input.task.sourceApprovalRequestId,
    sourceApprovalTitle: input.sourceApproval?.title ?? input.task.sourceApprovalRequestId,
    sourceApprovalStatusLabel: input.sourceApproval ? approvalStatusLabel(input.sourceApproval.status) : "결재안 미조회",
    sourceApprovalHref: `/approvals/${input.task.sourceApprovalRequestId}`,
    latestDecisionLabel,
    latestDecisionMemo: input.latestDecision?.memo.trim() ? toOperatorKorean(input.latestDecision.memo.trim()) : undefined,
    latestOutcomeLabel,
    learningNote: buildLearningNote({
      task: input.task,
      sourceApproval: input.sourceApproval,
      latestDecision: input.latestDecision,
      latestOutcome: input.latestOutcome,
      blockerLabels: rawBlockerLabels,
    }),
    nextActionLabel: nextActionLabel(input.task, input.sourceApproval, rawBlockerLabels),
    blockerLabels,
  };
}

function buildCharacterQueue(character: CharacterKey, tasks: FollowUpTaskQueueItemView[]): FollowUpCharacterQueueView {
  const characterTasks = tasks.filter((task) => task.assignedCharacter === character);
  const openCount = characterTasks.filter((task) => task.status === "OPEN").length;
  const doneCount = characterTasks.filter((task) => task.status === "DONE").length;
  const profile = characterProfiles[character];

  return {
    character,
    name: profile.name,
    role: profile.role,
    openCount,
    doneCount,
    priorityLabel: openCount > 0 ? `진행 대기 ${openCount.toLocaleString("ko-KR")}건` : "새 후속 업무 없음",
    tasks: characterTasks,
  };
}

function buildOwnerLearningSignals(input: {
  decisions: OwnerDecision[];
  taskViews: FollowUpTaskQueueItemView[];
  preflights: PreflightCheck[];
  executions: ExecutionResult[];
  outcomes: OutcomeReport[];
}): OwnerLearningSignalView[] {
  const decisionCounts = countBy(input.decisions, (decision) => decision.decision);
  const blockerCounts = countBy(
    [
      ...input.preflights.flatMap((preflight) => preflight.blockingReasons),
      ...input.executions.flatMap((execution) => execution.failedOperations.map((failure) => failure.reason)),
    ],
    (reason) => reason,
  );
  const topBlocker = [...blockerCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const draftOnlyCount = decisionCounts.get("APPROVE_DRAFT_ONLY") ?? 0;
  const externalWriteBlockedCount = input.executions.filter((execution) =>
    execution.failedOperations.some((failure) => failure.reason === "WRITE_GATE_CLOSED"),
  ).length;
  const openTaskCount = input.taskViews.filter((task) => task.status === "OPEN").length;
  const inconclusiveOutcomeCount = input.outcomes.filter((outcome) => outcome.state === "INCONCLUSIVE").length;

  return [
    {
      id: "owner-decision-memory",
      label: "대표 결정 학습",
      value: `${input.decisions.length.toLocaleString("ko-KR")}건`,
      detail:
        input.decisions.length > 0
          ? "대표 메모와 결정 유형을 후속 업무 근거로 연결했습니다."
          : "대표 결정이 쌓이면 다음 추천의 근거로 연결합니다.",
      tone: input.decisions.length > 0 ? "ready" : "warning",
    },
    {
      id: "draft-first-pattern",
      label: "초안 우선 패턴",
      value: `${draftOnlyCount.toLocaleString("ko-KR")}건`,
      detail:
        draftOnlyCount > 0
          ? "유사 안건은 바로 외부 반영보다 초안 승인과 재상신을 먼저 추천합니다."
          : "초안 승인 패턴은 아직 쌓이지 않았습니다.",
      tone: draftOnlyCount > 0 ? "ready" : "warning",
    },
    {
      id: "write-gate-pattern",
      label: "외부 반영 잠금",
      value: `${externalWriteBlockedCount.toLocaleString("ko-KR")}건`,
      detail:
        externalWriteBlockedCount > 0
          ? "외부 반영은 계속 차단되어 있으므로 모아가 수동 확인 업무로 내려야 합니다."
          : "외부 반영 차단 실행은 아직 기록되지 않았습니다.",
      tone: externalWriteBlockedCount > 0 ? "blocked" : "ready",
    },
    {
      id: "top-blocker",
      label: "반복 차단 사유",
      value: topBlocker ? `${blockerLabel(topBlocker[0])} ${topBlocker[1].toLocaleString("ko-KR")}회` : "없음",
      detail: topBlocker
        ? "다음 결재 추천에서는 이 차단 사유를 먼저 해소할 담당자를 붙입니다."
        : "실행 전 점검 차단 사유가 아직 누적되지 않았습니다.",
      tone: topBlocker ? "warning" : "ready",
    },
    {
      id: "open-follow-up-load",
      label: "미완료 후속 업무",
      value: `${openTaskCount.toLocaleString("ko-KR")}건`,
      detail:
        openTaskCount > 0
          ? "대표 결정 이후 내려간 일이 아직 닫히지 않았습니다."
          : "현재 열린 후속 업무가 없습니다.",
      tone: openTaskCount > 0 ? "warning" : "ready",
    },
    {
      id: "outcome-review-load",
      label: "성과 판단 대기",
      value: `${inconclusiveOutcomeCount.toLocaleString("ko-KR")}건`,
      detail:
        inconclusiveOutcomeCount > 0
          ? "체크포인트 도래 전까지 성과 판단을 보류하고 후속 확인을 유지합니다."
          : "성과 판단 대기 건이 없습니다.",
      tone: inconclusiveOutcomeCount > 0 ? "warning" : "ready",
    },
  ];
}

function buildLearningNote(input: {
  task: FollowUpInternalTask;
  sourceApproval?: ApprovalRequest;
  latestDecision?: OwnerDecision;
  latestOutcome?: OutcomeReport;
  blockerLabels: string[];
}): string {
  if (input.task.status === "DONE") {
    return "완료된 후속 업무입니다. 다음 유사 안건의 처리 근거로 유지합니다.";
  }

  if (input.blockerLabels.includes("WRITE_GATE_CLOSED")) {
    return "외부 반영 잠금이 닫힌 결정입니다. 모아는 수동 처리 또는 재결재 조건을 먼저 확인해야 합니다.";
  }

  if (input.sourceApproval?.status === "NEEDS_EVIDENCE") {
    return "대표가 바로 결재하기 전 데이터 보강이 필요한 패턴입니다. 데이가 근거를 보강해야 합니다.";
  }

  if (input.latestDecision?.decision === "APPROVE_DRAFT_ONLY") {
    return "대표는 초안까지만 승인했습니다. 외부 반영 전 재상신 기준을 남겨야 합니다.";
  }

  if (input.latestOutcome?.state === "INCONCLUSIVE") {
    return "성과 판단이 아직 보류 상태입니다. 체크포인트 도래 후 다시 보고합니다.";
  }

  return "대표 결정 이후 다음 내부 조치로 내려온 업무입니다.";
}

function nextActionLabel(
  task: FollowUpInternalTask,
  sourceApproval: ApprovalRequest | undefined,
  blockerLabels: string[],
): string {
  if (task.status === "DONE") {
    return "학습 근거로 보관";
  }

  if (task.assignedCharacter === "day" || sourceApproval?.status === "NEEDS_EVIDENCE") {
    return "근거 보강 후 재상신";
  }

  if (blockerLabels.includes("WRITE_GATE_CLOSED")) {
    return "수동 반영 또는 잠금 해제 조건 확인";
  }

  if (task.assignedCharacter === "moa") {
    return "대표 보고용 재상신 정리";
  }

  return "담당 캐릭터 조치";
}

function collectBlockerLabels(preflight?: PreflightCheck, execution?: ExecutionResult): string[] {
  return [
    ...(preflight?.blockingReasons ?? []),
    ...(execution?.failedOperations.map((failure) => failure.reason) ?? []),
  ];
}

function blockerLabel(reason: string): string {
  const labels: Record<string, string> = {
    APPROVAL_PENDING: "승인 대기",
    WRITE_GATE_CLOSED: "외부 반영 잠금 닫힘",
  };

  return labels[reason] ?? toOperatorKorean(reason);
}

function toOperatorKorean(value: string): string {
  return value
    .replaceAll("preflight", "실행 전 점검")
    .replaceAll("AgentRun timeline", "AI 실행 이력")
    .replaceAll("AgentRun", "AI 실행 기록")
    .replaceAll("DB mode smoke", "DB 저장 확인")
    .replaceAll("APPROVAL_PENDING", "승인 대기")
    .replaceAll("WRITE_GATE_CLOSED", "외부 반영 잠금 닫힘")
    .replaceAll("write gate", "외부 반영 잠금")
    .replaceAll("provider", "연동")
    .replaceAll("sync", "수집")
    .replaceAll("read-only", "읽기 전용")
    .replaceAll("mock", "모의")
    .replaceAll("fallback", "대체");
}

function taskTone(
  task: FollowUpInternalTask,
  sourceApproval: ApprovalRequest | undefined,
  blockerLabels: string[],
): FollowUpTaskQueueItemView["tone"] {
  if (task.status === "DONE") {
    return "done";
  }

  if (blockerLabels.includes("WRITE_GATE_CLOSED")) {
    return "blocked";
  }

  if (task.assignedCharacter === "day" || sourceApproval?.status === "NEEDS_EVIDENCE") {
    return "evidence";
  }

  return "open";
}

function latestByApproval<TItem>(
  items: TItem[],
  approvalIdFn: (item: TItem) => string,
  dateFn: (item: TItem) => string,
): Map<string, TItem> {
  const latest = new Map<string, TItem>();
  for (const item of items) {
    const approvalId = approvalIdFn(item);
    const previous = latest.get(approvalId);
    if (!previous || dateFn(item).localeCompare(dateFn(previous)) > 0) {
      latest.set(approvalId, item);
    }
  }

  return latest;
}

function countBy<TItem, TKey>(items: TItem[], keyFn: (item: TItem) => TKey): Map<TKey, number> {
  const counts = new Map<TKey, number>();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function taskSort(left: FollowUpTaskQueueItemView, right: FollowUpTaskQueueItemView): number {
  if (left.status !== right.status) {
    return left.status === "OPEN" ? -1 : 1;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

function approvalStatusLabel(status: ApprovalRequest["status"]): string {
  const labels: Record<ApprovalRequest["status"], string> = {
    PENDING: "승인 대기",
    APPROVED: "승인됨",
    REJECTED: "반려됨",
    HELD: "보류됨",
    NEEDS_REVISION: "수정 필요",
    NEEDS_EVIDENCE: "근거 보강",
  };

  return labels[status];
}

function decisionLabel(decision: OwnerDecision["decision"]): string {
  const labels: Record<OwnerDecision["decision"], string> = {
    APPROVE_AND_APPLY: "승인 후 바로 반영",
    APPROVE_DRAFT_ONLY: "초안만 승인",
    REQUEST_REVISION: "수정 요청",
    REQUEST_MORE_EVIDENCE: "추가 근거 요청",
    HOLD: "보류",
    REJECT: "반려",
  };

  return labels[decision];
}

function outcomeLabel(state: OutcomeReport["state"]): string {
  const labels: Record<OutcomeReport["state"], string> = {
    SUCCESS: "성과 좋음",
    PARTIAL_SUCCESS: "부분 성과",
    FAILED: "실패",
    INCONCLUSIVE: "판단 보류",
  };

  return labels[state];
}

function formatKoreanDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
