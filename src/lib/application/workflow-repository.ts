import type {
  AgendaCandidate,
  AiOperationsSettings,
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
  WorkflowObjectRef,
} from "../domain";

export interface MarketingWorkflowRepository {
  saveSignals(signals: Signal[]): void;
  listSignals(): Signal[];
  saveSeasonalKeywordAdPlans(plans: SeasonalKeywordAdPlan[]): void;
  listSeasonalKeywordAdPlans(): SeasonalKeywordAdPlan[];
  saveKeywordDemandSnapshots(snapshots: KeywordDemandSnapshot[]): void;
  listKeywordDemandSnapshots(): KeywordDemandSnapshot[];
  saveSearchTrendSnapshots(snapshots: SearchTrendSnapshot[]): void;
  listSearchTrendSnapshots(): SearchTrendSnapshot[];
  saveAgendaCandidates(candidates: AgendaCandidate[]): void;
  listAgendaCandidates(): AgendaCandidate[];
  saveCharacterReports(reports: CharacterReport[]): void;
  listCharacterReports(): CharacterReport[];
  saveMoaSynthesisReport(report: MoaSynthesisReport): void;
  listMoaSynthesisReports(): MoaSynthesisReport[];
  saveApprovalRequests(requests: ApprovalRequest[]): void;
  listApprovalRequests(): ApprovalRequest[];
  saveOwnerDecisions(decisions: OwnerDecision[]): void;
  listOwnerDecisions(): OwnerDecision[];
  savePreflightChecks(checks: PreflightCheck[]): void;
  listPreflightChecks(): PreflightCheck[];
  saveExecutionResults(results: ExecutionResult[]): void;
  listExecutionResults(): ExecutionResult[];
  savePerformanceCheckpoints(checkpoints: PerformanceCheckpoint[]): void;
  listPerformanceCheckpoints(): PerformanceCheckpoint[];
  saveOutcomeReports(reports: OutcomeReport[]): void;
  listOutcomeReports(): OutcomeReport[];
  saveFollowUpInternalTasks(tasks: FollowUpInternalTask[]): void;
  listFollowUpInternalTasks(): FollowUpInternalTask[];
  saveProviderSyncReports(reports: ProviderSyncReport[]): void;
  listProviderSyncReports(): ProviderSyncReport[];
  saveAgentRuns(runs: AgentRun[]): void;
  listAgentRuns(): AgentRun[];
  saveAgentRunWorkflowLinks(links: AgentRunWorkflowLink[]): void;
  listAgentRunWorkflowLinks(): AgentRunWorkflowLink[];
  listAgentRunsForWorkflowObject(ref: WorkflowObjectRef): AgentRun[];
  saveAiOperationsSettings(settings: AiOperationsSettings[]): void;
  listAiOperationsSettings(): AiOperationsSettings[];
}
