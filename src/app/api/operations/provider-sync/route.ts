import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { handleProviderSync } = await import("@/server/backend-api/provider-sync");
  return handleProviderSync();
}
