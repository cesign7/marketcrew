import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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
import type { MarketingWorkflowRepository } from "../application/workflow-repository";
import {
  createEmptyWorkflowRepositoryState,
  normalizeWorkflowRepositoryState,
  upsertById,
  type WorkflowCollectionKey,
  type WorkflowRepositoryState,
} from "../application/workflow-state";

export function createFileMarketingWorkflowRepository(filePath: string): MarketingWorkflowRepository {
  return new FileMarketingWorkflowRepository(filePath);
}

class FileMarketingWorkflowRepository implements MarketingWorkflowRepository {
  constructor(private readonly filePath: string) {}

  saveSignals(signals: Signal[]): void {
    this.saveCollection("signals", signals);
  }

  listSignals(): Signal[] {
    return this.listCollection("signals");
  }

  saveSeasonalKeywordAdPlans(plans: SeasonalKeywordAdPlan[]): void {
    this.saveCollection("seasonalKeywordAdPlans", plans);
  }

  listSeasonalKeywordAdPlans(): SeasonalKeywordAdPlan[] {
    return this.listCollection("seasonalKeywordAdPlans");
  }

  saveKeywordDemandSnapshots(snapshots: KeywordDemandSnapshot[]): void {
    this.saveCollection("keywordDemandSnapshots", snapshots);
  }

  listKeywordDemandSnapshots(): KeywordDemandSnapshot[] {
    return this.listCollection("keywordDemandSnapshots");
  }

  saveSearchTrendSnapshots(snapshots: SearchTrendSnapshot[]): void {
    this.saveCollection("searchTrendSnapshots", snapshots);
  }

  listSearchTrendSnapshots(): SearchTrendSnapshot[] {
    return this.listCollection("searchTrendSnapshots");
  }

  saveAgendaCandidates(candidates: AgendaCandidate[]): void {
    this.saveCollection("agendaCandidates", candidates);
  }

  listAgendaCandidates(): AgendaCandidate[] {
    return this.listCollection("agendaCandidates");
  }

  saveCharacterReports(reports: CharacterReport[]): void {
    this.saveCollection("characterReports", reports);
  }

  listCharacterReports(): CharacterReport[] {
    return this.listCollection("characterReports");
  }

  saveMoaSynthesisReport(report: MoaSynthesisReport): void {
    this.saveCollection("moaSynthesisReports", [report]);
  }

  listMoaSynthesisReports(): MoaSynthesisReport[] {
    return this.listCollection("moaSynthesisReports");
  }

  saveApprovalRequests(requests: ApprovalRequest[]): void {
    this.saveCollection("approvalRequests", requests);
  }

  listApprovalRequests(): ApprovalRequest[] {
    return this.listCollection("approvalRequests");
  }

  saveOwnerDecisions(decisions: OwnerDecision[]): void {
    this.saveCollection("ownerDecisions", decisions);
  }

  listOwnerDecisions(): OwnerDecision[] {
    return this.listCollection("ownerDecisions");
  }

  savePreflightChecks(checks: PreflightCheck[]): void {
    this.saveCollection("preflightChecks", checks);
  }

  listPreflightChecks(): PreflightCheck[] {
    return this.listCollection("preflightChecks");
  }

  saveExecutionResults(results: ExecutionResult[]): void {
    this.saveCollection("executionResults", results);
  }

  listExecutionResults(): ExecutionResult[] {
    return this.listCollection("executionResults");
  }

  savePerformanceCheckpoints(checkpoints: PerformanceCheckpoint[]): void {
    this.saveCollection("performanceCheckpoints", checkpoints);
  }

  listPerformanceCheckpoints(): PerformanceCheckpoint[] {
    return this.listCollection("performanceCheckpoints");
  }

  saveOutcomeReports(reports: OutcomeReport[]): void {
    this.saveCollection("outcomeReports", reports);
  }

  listOutcomeReports(): OutcomeReport[] {
    return this.listCollection("outcomeReports");
  }

  saveFollowUpInternalTasks(tasks: FollowUpInternalTask[]): void {
    this.saveCollection("followUpInternalTasks", tasks);
  }

  listFollowUpInternalTasks(): FollowUpInternalTask[] {
    return this.listCollection("followUpInternalTasks");
  }

  saveProviderSyncReports(reports: ProviderSyncReport[]): void {
    this.saveCollection("providerSyncReports", reports);
  }

  listProviderSyncReports(): ProviderSyncReport[] {
    return this.listCollection("providerSyncReports");
  }

  saveAgentRuns(runs: AgentRun[]): void {
    this.saveCollection("agentRuns", runs);
  }

  listAgentRuns(): AgentRun[] {
    return this.listCollection("agentRuns");
  }

  saveAgentRunWorkflowLinks(links: AgentRunWorkflowLink[]): void {
    this.saveCollection("agentRunWorkflowLinks", links);
  }

  listAgentRunWorkflowLinks(): AgentRunWorkflowLink[] {
    return this.listCollection("agentRunWorkflowLinks");
  }

  listAgentRunsForWorkflowObject(ref: WorkflowObjectRef): AgentRun[] {
    const runIds = new Set(
      this.listAgentRunWorkflowLinks()
        .filter((link) => link.objectType === ref.objectType && link.objectId === ref.objectId)
        .map((link) => link.agentRunId),
    );

    return this.listAgentRuns().filter((run) => runIds.has(run.id));
  }

  private saveCollection<K extends WorkflowCollectionKey>(key: K, incoming: WorkflowRepositoryState[K]): void {
    this.writeState((state) => ({
      ...state,
      [key]: upsertById(
        state[key] as Array<{ id: string }>,
        incoming as Array<{ id: string }>,
      ) as WorkflowRepositoryState[K],
    }));
  }

  private listCollection<K extends WorkflowCollectionKey>(key: K): WorkflowRepositoryState[K] {
    return [...this.readState()[key]] as WorkflowRepositoryState[K];
  }

  private readState(): WorkflowRepositoryState {
    if (!existsSync(this.filePath)) {
      return createEmptyWorkflowRepositoryState();
    }

    const raw = readFileSync(this.filePath, "utf8").trim();
    if (!raw) {
      return createEmptyWorkflowRepositoryState();
    }

    const parsed = JSON.parse(raw) as Partial<WorkflowRepositoryState>;
    return normalizeWorkflowRepositoryState(parsed);
  }

  private writeState(updater: (state: WorkflowRepositoryState) => WorkflowRepositoryState): void {
    const nextState = updater(this.readState());
    mkdirSync(dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}
