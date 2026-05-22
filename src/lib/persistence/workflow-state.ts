import type {
  AgendaCandidate,
  AgentRun,
  AgentRunWorkflowLink,
  ApprovalRequest,
  CharacterReport,
  ExecutionResult,
  FollowUpInternalTask,
  KeywordDemandSnapshot,
  MoaSynthesisReport,
  OutcomeReport,
  PerformanceCheckpoint,
  PreflightCheck,
  OwnerDecision,
  ProviderSyncReport,
  SearchTrendSnapshot,
  SeasonalKeywordAdPlan,
  Signal,
} from "../domain";

export type WorkflowRepositoryState = {
  signals: Signal[];
  seasonalKeywordAdPlans: SeasonalKeywordAdPlan[];
  keywordDemandSnapshots: KeywordDemandSnapshot[];
  searchTrendSnapshots: SearchTrendSnapshot[];
  agendaCandidates: AgendaCandidate[];
  characterReports: CharacterReport[];
  moaSynthesisReports: MoaSynthesisReport[];
  approvalRequests: ApprovalRequest[];
  ownerDecisions: OwnerDecision[];
  preflightChecks: PreflightCheck[];
  executionResults: ExecutionResult[];
  performanceCheckpoints: PerformanceCheckpoint[];
  outcomeReports: OutcomeReport[];
  followUpInternalTasks: FollowUpInternalTask[];
  providerSyncReports: ProviderSyncReport[];
  agentRuns: AgentRun[];
  agentRunWorkflowLinks: AgentRunWorkflowLink[];
};

export type WorkflowCollectionKey = keyof WorkflowRepositoryState;

export const workflowCollectionKeys: WorkflowCollectionKey[] = [
  "signals",
  "seasonalKeywordAdPlans",
  "keywordDemandSnapshots",
  "searchTrendSnapshots",
  "agendaCandidates",
  "characterReports",
  "moaSynthesisReports",
  "approvalRequests",
  "ownerDecisions",
  "preflightChecks",
  "executionResults",
  "performanceCheckpoints",
  "outcomeReports",
  "followUpInternalTasks",
  "providerSyncReports",
  "agentRuns",
  "agentRunWorkflowLinks",
];

export function createEmptyWorkflowRepositoryState(): WorkflowRepositoryState {
  return {
    signals: [],
    seasonalKeywordAdPlans: [],
    keywordDemandSnapshots: [],
    searchTrendSnapshots: [],
    agendaCandidates: [],
    characterReports: [],
    moaSynthesisReports: [],
    approvalRequests: [],
    ownerDecisions: [],
    preflightChecks: [],
    executionResults: [],
    performanceCheckpoints: [],
    outcomeReports: [],
    followUpInternalTasks: [],
    providerSyncReports: [],
    agentRuns: [],
    agentRunWorkflowLinks: [],
  };
}

export function normalizeWorkflowRepositoryState(
  parsed: Partial<WorkflowRepositoryState> | undefined,
): WorkflowRepositoryState {
  return {
    signals: asArray(parsed?.signals),
    seasonalKeywordAdPlans: asArray(parsed?.seasonalKeywordAdPlans),
    keywordDemandSnapshots: asArray(parsed?.keywordDemandSnapshots),
    searchTrendSnapshots: asArray(parsed?.searchTrendSnapshots),
    agendaCandidates: asArray(parsed?.agendaCandidates),
    characterReports: asArray(parsed?.characterReports),
    moaSynthesisReports: asArray(parsed?.moaSynthesisReports),
    approvalRequests: asArray(parsed?.approvalRequests),
    ownerDecisions: asArray(parsed?.ownerDecisions),
    preflightChecks: asArray(parsed?.preflightChecks),
    executionResults: asArray(parsed?.executionResults),
    performanceCheckpoints: asArray(parsed?.performanceCheckpoints),
    outcomeReports: asArray(parsed?.outcomeReports),
    followUpInternalTasks: asArray(parsed?.followUpInternalTasks),
    providerSyncReports: asArray(parsed?.providerSyncReports),
    agentRuns: asArray(parsed?.agentRuns),
    agentRunWorkflowLinks: asArray(parsed?.agentRunWorkflowLinks),
  };
}

export function upsertById<TItem extends { id: string }>(current: TItem[], incoming: TItem[]): TItem[] {
  const itemsById = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    itemsById.set(item.id, item);
  }

  return [...itemsById.values()];
}

function asArray<TItem>(value: TItem[] | undefined): TItem[] {
  return Array.isArray(value) ? value : [];
}
