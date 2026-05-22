import { NextResponse } from "next/server";
import { syncReadOnlyProviderSyncReports } from "@/lib/integrations/providers/read-only-sync";
import { createLocalWorkflowRepository, persistProviderSyncReports } from "@/lib/persistence/workflow-store";

export async function GET() {
  const checkedAt = new Date().toISOString();
  const providerSyncReports = await syncReadOnlyProviderSyncReports(process.env, checkedAt);
  const repository = createLocalWorkflowRepository();
  persistProviderSyncReports(repository, providerSyncReports);

  return NextResponse.json({
    checkedAt,
    providerSyncReports,
  });
}
