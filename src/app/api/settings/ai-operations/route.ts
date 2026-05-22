import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleGetAiOperationsSettings } = await import("@/server/backend-api/ai-operations-settings");
  return handleGetAiOperationsSettings();
}

export async function PUT(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    if (proxied.status >= 200 && proxied.status < 300) {
      const { clearAgendaRoomViewModelCache } = await import("@/features/agenda-room/loadAgendaRoomViewModel");
      await clearAgendaRoomViewModelCache();
    }
    return proxied;
  }

  const { handlePutAiOperationsSettings } = await import("@/server/backend-api/ai-operations-settings");
  const response = await handlePutAiOperationsSettings(request);
  if (response.status >= 200 && response.status < 300) {
    const { clearAgendaRoomViewModelCache } = await import("@/features/agenda-room/loadAgendaRoomViewModel");
    await clearAgendaRoomViewModelCache();
  }

  return response;
}
