import { join } from "node:path";
import { runAgendaCycle } from "../application/agenda-cycle";
import { recordProviderSyncAgentRuns } from "../application/agent-run-recorder";
import { buildProviderSignalAgendaArtifacts } from "../application/provider-signal-agenda";
import type { ProviderSyncReport } from "../domain";
import type { MarketingWorkflowRepository } from "../application/workflow-repository";
import { SampleProviderAdapter } from "../integrations/sample/provider";
import { createFileMarketingWorkflowRepository } from "./file-repository";
import { createPostgresMarketingWorkflowRepository } from "./postgres-repository";

export type WorkflowRepositoryMode = "file" | "db";

export type WorkflowStateSummary = {
  repositoryMode: WorkflowRepositoryMode;
  storePath: string;
  databaseLabel?: string;
  counts: {
    signals: number;
    keywordDemandSnapshots: number;
    searchTrendSnapshots: number;
    approvalRequests: number;
    ownerDecisions: number;
    preflightChecks: number;
    executionResults: number;
    performanceCheckpoints: number;
    outcomeReports: number;
    followUpInternalTasks: number;
    providerSyncReports: number;
    agentRuns: number;
    agentRunWorkflowLinks: number;
  };
  recent: {
    keywordDemandSnapshotIds: string[];
    searchTrendSnapshotIds: string[];
    approvalRequestIds: string[];
    ownerDecisionIds: string[];
    executionResultIds: string[];
    outcomeReportIds: string[];
    followUpTaskIds: string[];
    providerSyncReportIds: string[];
    agentRunIds: string[];
  };
};

export function createLocalWorkflowRepository(env: NodeJS.ProcessEnv = process.env): MarketingWorkflowRepository {
  const repositoryMode = getWorkflowRepositoryMode(env);
  if (repositoryMode === "db") {
    const databaseUrl = getWorkflowDatabaseUrl(env);
    if (!databaseUrl) {
      throw new Error("MARKETCREW_REPOSITORY_MODE=db에는 MARKETCREW_DATABASE_URL 또는 DATABASE_URL이 필요합니다.");
    }

    return createPostgresMarketingWorkflowRepository(databaseUrl);
  }

  return createFileMarketingWorkflowRepository(getWorkflowStorePath(env));
}

export function getWorkflowRepositoryMode(env: NodeJS.ProcessEnv = process.env): WorkflowRepositoryMode {
  const rawMode = (env.MARKETCREW_REPOSITORY_MODE ?? "file").trim().toLowerCase();
  if (rawMode === "file") {
    return "file";
  }
  if (rawMode === "db" || rawMode === "postgres" || rawMode === "postgresql") {
    return "db";
  }

  throw new Error(`지원하지 않는 MARKETCREW_REPOSITORY_MODE입니다: ${rawMode}`);
}

export function getWorkflowStorePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.MARKETCREW_WORKFLOW_STORE_PATH ?? join(process.cwd(), ".marketcrew", "workflow-store.json");
}

export function getWorkflowDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.MARKETCREW_DATABASE_URL ?? env.DATABASE_URL;
}

export function getWorkflowStoreLabel(env: NodeJS.ProcessEnv = process.env): string {
  if (getWorkflowRepositoryMode(env) === "db") {
    const databaseUrl = getWorkflowDatabaseUrl(env);
    return databaseUrl ? maskConnectionUrl(databaseUrl) : "postgresql://missing";
  }

  return getWorkflowStorePath(env);
}

export function seedSampleWorkflowIfEmpty(repository: MarketingWorkflowRepository): void {
  if (repository.listApprovalRequests().some((approval) => approval.id === "approval-agenda-season-plan-buddha-gift-card")) {
    return;
  }

  runAgendaCycle({
    sampleProvider: new SampleProviderAdapter(),
    repository,
  });
}

export function buildWorkflowStateSummary(
  repository: MarketingWorkflowRepository,
  storePath = getWorkflowStoreLabel(),
  repositoryMode = getWorkflowRepositoryMode(),
): WorkflowStateSummary {
  const approvalRequests = repository.listApprovalRequests();
  const keywordDemandSnapshots = repository.listKeywordDemandSnapshots();
  const searchTrendSnapshots = repository.listSearchTrendSnapshots();
  const ownerDecisions = repository.listOwnerDecisions();
  const executionResults = repository.listExecutionResults();
  const outcomeReports = repository.listOutcomeReports();
  const followUpInternalTasks = repository.listFollowUpInternalTasks();
  const providerSyncReports = repository.listProviderSyncReports();
  const agentRuns = repository.listAgentRuns();
  const agentRunWorkflowLinks = repository.listAgentRunWorkflowLinks();

  return {
    repositoryMode,
    storePath,
    databaseLabel: repositoryMode === "db" ? storePath : undefined,
    counts: {
      signals: repository.listSignals().length,
      keywordDemandSnapshots: keywordDemandSnapshots.length,
      searchTrendSnapshots: searchTrendSnapshots.length,
      approvalRequests: approvalRequests.length,
      ownerDecisions: ownerDecisions.length,
      preflightChecks: repository.listPreflightChecks().length,
      executionResults: executionResults.length,
      performanceCheckpoints: repository.listPerformanceCheckpoints().length,
      outcomeReports: outcomeReports.length,
      followUpInternalTasks: followUpInternalTasks.length,
      providerSyncReports: providerSyncReports.length,
      agentRuns: agentRuns.length,
      agentRunWorkflowLinks: agentRunWorkflowLinks.length,
    },
    recent: {
      keywordDemandSnapshotIds: recentIds(keywordDemandSnapshots),
      searchTrendSnapshotIds: recentIds(searchTrendSnapshots),
      approvalRequestIds: recentIds(approvalRequests),
      ownerDecisionIds: recentIds(ownerDecisions),
      executionResultIds: recentIds(executionResults),
      outcomeReportIds: recentIds(outcomeReports),
      followUpTaskIds: recentIds(followUpInternalTasks),
      providerSyncReportIds: recentIds(providerSyncReports),
      agentRunIds: recentIds(agentRuns),
    },
  };
}

export function persistProviderSyncReports(repository: MarketingWorkflowRepository, reports: ProviderSyncReport[]): void {
  repository.saveProviderSyncReports(reports);
  recordProviderSyncAgentRuns(repository, reports);

  const generatedSignals = reports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : []));
  const keywordDemandSnapshots = reports.flatMap((report) => report.keywordDemandSnapshots ?? []);
  const searchTrendSnapshots = reports.flatMap((report) => report.searchTrendSnapshots ?? []);

  if (generatedSignals.length > 0) {
    repository.saveSignals(generatedSignals);
  }
  if (keywordDemandSnapshots.length > 0) {
    repository.saveKeywordDemandSnapshots(keywordDemandSnapshots);
  }
  if (searchTrendSnapshots.length > 0) {
    repository.saveSearchTrendSnapshots(searchTrendSnapshots);
  }

  const providerAgendaArtifacts = buildProviderSignalAgendaArtifacts({
    signals: repository.listSignals(),
    providerSyncReports: repository.listProviderSyncReports(),
    generatedAt: reports[0]?.checkedAt ?? new Date().toISOString(),
  });
  if (providerAgendaArtifacts.agendaCandidates.length > 0) {
    repository.saveAgendaCandidates(providerAgendaArtifacts.agendaCandidates);
    repository.saveCharacterReports(providerAgendaArtifacts.characterReports);
    repository.saveApprovalRequests(providerAgendaArtifacts.approvalRequests);
    repository.savePerformanceCheckpoints(providerAgendaArtifacts.performanceCheckpoints);
  }
}

function recentIds(items: Array<{ id: string }>): string[] {
  return items.slice(-5).map((item) => item.id);
}

function maskConnectionUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) {
      parsed.password = "***";
    }

    return parsed.toString();
  } catch {
    return "postgresql://invalid-url";
  }
}
