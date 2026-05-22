import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { syncReadOnlyProviderSyncReports } from "@/lib/integrations/providers/read-only-sync";
import { createLocalWorkflowRepository, persistProviderSyncReports } from "@/lib/persistence/workflow-store";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    clearAgendaRoomViewModelCache();
    return proxied;
  }

  const checkedAt = new Date().toISOString();
  const providerSyncReports = await syncReadOnlyProviderSyncReports(process.env, checkedAt);
  const repository = createLocalWorkflowRepository();
  persistProviderSyncReports(repository, providerSyncReports);
  clearAgendaRoomViewModelCache();

  return NextResponse.json({
    checkedAt,
    providerSyncReports,
  });
}
