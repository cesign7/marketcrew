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
  WorkflowObjectRef,
} from "../domain";
import type { MarketingWorkflowRepository } from "./repositories";

export function createMemoryMarketingWorkflowRepository(): MarketingWorkflowRepository {
  return new MemoryMarketingWorkflowRepository();
}

class MemoryMarketingWorkflowRepository implements MarketingWorkflowRepository {
  private signals: Signal[] = [];
  private seasonalKeywordAdPlans: SeasonalKeywordAdPlan[] = [];
  private keywordDemandSnapshots: KeywordDemandSnapshot[] = [];
  private searchTrendSnapshots: SearchTrendSnapshot[] = [];
  private agendaCandidates: AgendaCandidate[] = [];
  private characterReports: CharacterReport[] = [];
  private moaSynthesisReports: MoaSynthesisReport[] = [];
  private approvalRequests: ApprovalRequest[] = [];
  private ownerDecisions: OwnerDecision[] = [];
  private preflightChecks: PreflightCheck[] = [];
  private executionResults: ExecutionResult[] = [];
  private performanceCheckpoints: PerformanceCheckpoint[] = [];
  private outcomeReports: OutcomeReport[] = [];
  private followUpInternalTasks: FollowUpInternalTask[] = [];
  private providerSyncReports: ProviderSyncReport[] = [];
  private agentRuns: AgentRun[] = [];
  private agentRunWorkflowLinks: AgentRunWorkflowLink[] = [];

  saveSignals(signals: Signal[]): void {
    this.signals = upsertById(this.signals, signals);
  }

  listSignals(): Signal[] {
    return [...this.signals];
  }

  saveSeasonalKeywordAdPlans(plans: SeasonalKeywordAdPlan[]): void {
    this.seasonalKeywordAdPlans = upsertById(this.seasonalKeywordAdPlans, plans);
  }

  listSeasonalKeywordAdPlans(): SeasonalKeywordAdPlan[] {
    return [...this.seasonalKeywordAdPlans];
  }

  saveKeywordDemandSnapshots(snapshots: KeywordDemandSnapshot[]): void {
    this.keywordDemandSnapshots = upsertById(this.keywordDemandSnapshots, snapshots);
  }

  listKeywordDemandSnapshots(): KeywordDemandSnapshot[] {
    return [...this.keywordDemandSnapshots];
  }

  saveSearchTrendSnapshots(snapshots: SearchTrendSnapshot[]): void {
    this.searchTrendSnapshots = upsertById(this.searchTrendSnapshots, snapshots);
  }

  listSearchTrendSnapshots(): SearchTrendSnapshot[] {
    return [...this.searchTrendSnapshots];
  }

  saveAgendaCandidates(candidates: AgendaCandidate[]): void {
    this.agendaCandidates = upsertById(this.agendaCandidates, candidates);
  }

  listAgendaCandidates(): AgendaCandidate[] {
    return [...this.agendaCandidates];
  }

  saveCharacterReports(reports: CharacterReport[]): void {
    this.characterReports = upsertById(this.characterReports, reports);
  }

  listCharacterReports(): CharacterReport[] {
    return [...this.characterReports];
  }

  saveMoaSynthesisReport(report: MoaSynthesisReport): void {
    this.moaSynthesisReports = upsertById(this.moaSynthesisReports, [report]);
  }

  listMoaSynthesisReports(): MoaSynthesisReport[] {
    return [...this.moaSynthesisReports];
  }

  saveApprovalRequests(requests: ApprovalRequest[]): void {
    this.approvalRequests = upsertById(this.approvalRequests, requests);
  }

  listApprovalRequests(): ApprovalRequest[] {
    return [...this.approvalRequests];
  }

  saveOwnerDecisions(decisions: OwnerDecision[]): void {
    this.ownerDecisions = upsertById(this.ownerDecisions, decisions);
  }

  listOwnerDecisions(): OwnerDecision[] {
    return [...this.ownerDecisions];
  }

  savePreflightChecks(checks: PreflightCheck[]): void {
    this.preflightChecks = upsertById(this.preflightChecks, checks);
  }

  listPreflightChecks(): PreflightCheck[] {
    return [...this.preflightChecks];
  }

  saveExecutionResults(results: ExecutionResult[]): void {
    this.executionResults = upsertById(this.executionResults, results);
  }

  listExecutionResults(): ExecutionResult[] {
    return [...this.executionResults];
  }

  savePerformanceCheckpoints(checkpoints: PerformanceCheckpoint[]): void {
    this.performanceCheckpoints = upsertById(this.performanceCheckpoints, checkpoints);
  }

  listPerformanceCheckpoints(): PerformanceCheckpoint[] {
    return [...this.performanceCheckpoints];
  }

  saveOutcomeReports(reports: OutcomeReport[]): void {
    this.outcomeReports = upsertById(this.outcomeReports, reports);
  }

  listOutcomeReports(): OutcomeReport[] {
    return [...this.outcomeReports];
  }

  saveFollowUpInternalTasks(tasks: FollowUpInternalTask[]): void {
    this.followUpInternalTasks = upsertById(this.followUpInternalTasks, tasks);
  }

  listFollowUpInternalTasks(): FollowUpInternalTask[] {
    return [...this.followUpInternalTasks];
  }

  saveProviderSyncReports(reports: ProviderSyncReport[]): void {
    this.providerSyncReports = upsertById(this.providerSyncReports, reports);
  }

  listProviderSyncReports(): ProviderSyncReport[] {
    return [...this.providerSyncReports];
  }

  saveAgentRuns(runs: AgentRun[]): void {
    this.agentRuns = upsertById(this.agentRuns, runs);
  }

  listAgentRuns(): AgentRun[] {
    return [...this.agentRuns];
  }

  saveAgentRunWorkflowLinks(links: AgentRunWorkflowLink[]): void {
    this.agentRunWorkflowLinks = upsertById(this.agentRunWorkflowLinks, links);
  }

  listAgentRunWorkflowLinks(): AgentRunWorkflowLink[] {
    return [...this.agentRunWorkflowLinks];
  }

  listAgentRunsForWorkflowObject(ref: WorkflowObjectRef): AgentRun[] {
    const runIds = new Set(
      this.agentRunWorkflowLinks
        .filter((link) => link.objectType === ref.objectType && link.objectId === ref.objectId)
        .map((link) => link.agentRunId),
    );

    return this.agentRuns.filter((run) => runIds.has(run.id));
  }
}

function upsertById<TItem extends { id: string }>(current: TItem[], incoming: TItem[]): TItem[] {
  const itemsById = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    itemsById.set(item.id, item);
  }

  return [...itemsById.values()];
}
