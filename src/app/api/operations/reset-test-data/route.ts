import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    return proxied;
  }

  const { handleGetResetTestData } = await import("@/server/backend-api/reset-test-data");
  return handleGetResetTestData();
}

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    if (proxied.status >= 200 && proxied.status < 300) {
      await clearAgendaRoomViewModelCache();
    }
    return proxied;
  }

  const { handlePostResetTestData } = await import("@/server/backend-api/reset-test-data");
  const response = await handlePostResetTestData(request);
  if (response.status >= 200 && response.status < 300) {
    await clearAgendaRoomViewModelCache({ remoteWorkflowState: false });
  }

  return response;
}
