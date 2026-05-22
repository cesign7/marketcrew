import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
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
import {
  normalizeWorkflowRepositoryState,
  upsertById,
  type WorkflowCollectionKey,
  type WorkflowRepositoryState,
} from "./workflow-state";

const bridgeScriptPath = resolve(process.cwd(), "scripts", "postgres-workflow-bridge.mjs");
const DEFAULT_POSTGRES_STATE_CACHE_TTL_MS = 15_000;

type CachedWorkflowRepositoryState = {
  expiresAt: number;
  state: WorkflowRepositoryState;
};

const sharedStateCache = getSharedStateCache();

declare global {
  // eslint-disable-next-line no-var
  var __marketcrewPostgresStateCache: Map<string, CachedWorkflowRepositoryState> | undefined;
}

export function createPostgresMarketingWorkflowRepository(databaseUrl: string): MarketingWorkflowRepository {
  return new PostgresMarketingWorkflowRepository(databaseUrl);
}

export function clearPostgresWorkflowStateCache(databaseUrl?: string): void {
  if (databaseUrl) {
    sharedStateCache.delete(databaseUrl);
    return;
  }

  sharedStateCache.clear();
}

class PostgresMarketingWorkflowRepository implements MarketingWorkflowRepository {
  private cachedState: WorkflowRepositoryState | undefined;

  constructor(private readonly databaseUrl: string) {}

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
    const state = this.readState();
    const runIds = new Set(
      state.agentRunWorkflowLinks
        .filter((link) => link.objectType === ref.objectType && link.objectId === ref.objectId)
        .map((link) => link.agentRunId),
    );

    return state.agentRuns.filter((run) => runIds.has(run.id));
  }

  private saveCollection<K extends WorkflowCollectionKey>(key: K, incoming: WorkflowRepositoryState[K]): void {
    const currentState = this.readState();
    const nextCollection = upsertById(
      currentState[key] as Array<{ id: string }>,
      incoming as Array<{ id: string }>,
    ) as WorkflowRepositoryState[K];

    this.runBridge("save-collection", key, JSON.stringify(nextCollection));
    this.cachedState = {
      ...currentState,
      [key]: nextCollection,
    };
    writeSharedStateCache(this.databaseUrl, this.cachedState);
  }

  private listCollection<K extends WorkflowCollectionKey>(key: K): WorkflowRepositoryState[K] {
    return [...this.readState()[key]] as WorkflowRepositoryState[K];
  }

  private readState(): WorkflowRepositoryState {
    if (!this.cachedState) {
      const sharedState = readSharedStateCache(this.databaseUrl);
      if (sharedState) {
        this.cachedState = sharedState;
        return this.cachedState;
      }

      const output = this.runBridge("read-state");
      this.cachedState = normalizeWorkflowRepositoryState(JSON.parse(output));
      writeSharedStateCache(this.databaseUrl, this.cachedState);
    }

    return this.cachedState;
  }

  private runBridge(operation: "read-state" | "save-collection", collection?: WorkflowCollectionKey, input?: string): string {
    return execFileSync(process.execPath, [bridgeScriptPath, operation, ...(collection ? [collection] : [])], {
      encoding: "utf8",
      env: {
        ...process.env,
        MARKETCREW_DATABASE_URL: this.databaseUrl,
      },
      input,
      maxBuffer: 1024 * 1024 * 64,
    });
  }
}

function readSharedStateCache(databaseUrl: string): WorkflowRepositoryState | undefined {
  const ttlMs = getPostgresStateCacheTtlMs();
  if (ttlMs <= 0) {
    return undefined;
  }

  const cached = sharedStateCache.get(databaseUrl);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    sharedStateCache.delete(databaseUrl);
    return undefined;
  }

  return cached.state;
}

function writeSharedStateCache(databaseUrl: string, state: WorkflowRepositoryState): void {
  const ttlMs = getPostgresStateCacheTtlMs();
  if (ttlMs <= 0) {
    sharedStateCache.delete(databaseUrl);
    return;
  }

  sharedStateCache.set(databaseUrl, {
    expiresAt: Date.now() + ttlMs,
    state,
  });
}

function getPostgresStateCacheTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const rawValue = env.MARKETCREW_POSTGRES_STATE_CACHE_TTL_MS;
  if (!rawValue) {
    return DEFAULT_POSTGRES_STATE_CACHE_TTL_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_POSTGRES_STATE_CACHE_TTL_MS;
}

function getSharedStateCache(): Map<string, CachedWorkflowRepositoryState> {
  globalThis.__marketcrewPostgresStateCache ??= new Map<string, CachedWorkflowRepositoryState>();
  return globalThis.__marketcrewPostgresStateCache;
}
