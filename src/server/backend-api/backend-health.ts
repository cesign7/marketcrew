import { NextResponse } from "next/server";
import { readPostgresWorkflowRepositoryState } from "@/lib/persistence/postgres-read-model";
import {
  buildWorkflowStateSummary,
  getWorkflowDatabaseUrl,
  getWorkflowRepositoryMode,
  getWorkflowStoreLabel,
} from "@/lib/persistence/workflow-store";
import { createBackendWorkflowRepository } from "./repository";

export async function handleBackendHealth() {
  const repositoryMode = getWorkflowRepositoryMode();
  let counts: Record<string, number> | undefined;
  if (repositoryMode === "file") {
    const repository = createBackendWorkflowRepository();
    const summary = buildWorkflowStateSummary(repository, getWorkflowStoreLabel(), repositoryMode);
    counts = {
      approvalRequests: summary.counts.approvalRequests,
      providerSyncReports: summary.counts.providerSyncReports,
      agentRuns: summary.counts.agentRuns,
    };
  }

  const databaseUrl = getWorkflowDatabaseUrl();
  if (repositoryMode === "db" && databaseUrl) {
    const state = await readPostgresWorkflowRepositoryState(databaseUrl, {
      ...process.env,
      MARKETCREW_POSTGRES_READ_MODEL_CACHE_TTL_MS: "1000",
    });
    counts = {
      approvalRequests: state.approvalRequests.length,
      providerSyncReports: state.providerSyncReports.length,
      agentRuns: state.agentRuns.length,
    };
  }

  return NextResponse.json({
    ok: repositoryMode === "file" || Boolean(databaseUrl),
    service: "marketcrew-api",
    repositoryMode,
    counts,
  });
}
