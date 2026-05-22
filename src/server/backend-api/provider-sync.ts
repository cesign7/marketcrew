import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { syncReadOnlyProviderSyncReports } from "@/lib/integrations/providers/read-only-sync";
import { persistProviderSyncReports } from "@/lib/persistence/workflow-store";
import { createBackendWorkflowRepository } from "./repository";

export async function handleProviderSync() {
  const checkedAt = new Date().toISOString();
  const providerSyncReports = await syncReadOnlyProviderSyncReports(process.env, checkedAt);
  const repository = createBackendWorkflowRepository();
  persistProviderSyncReports(repository, providerSyncReports);
  await clearAgendaRoomViewModelCache();

  return NextResponse.json({
    checkedAt,
    providerSyncReports,
  });
}
