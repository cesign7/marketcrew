import { NextResponse } from "next/server";
import { readPostgresWorkflowRepositoryState } from "@/lib/persistence/postgres-read-model";
import { getWorkflowDatabaseUrl, getWorkflowRepositoryMode } from "@/lib/persistence/workflow-store";

export async function handleBackendHealth() {
  const databaseUrl = getWorkflowDatabaseUrl();
  let counts: Record<string, number> | undefined;
  if (databaseUrl) {
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
    ok: Boolean(databaseUrl),
    service: "marketcrew-api",
    repositoryMode: getWorkflowRepositoryMode(),
    counts,
  });
}
