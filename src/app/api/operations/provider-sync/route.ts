import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    await clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { handleProviderSync } = await import("@/server/backend-api/provider-sync");
  return handleProviderSync();
}
