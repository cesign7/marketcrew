import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

type EvidenceRequestRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: EvidenceRequestRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    await clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { handleEvidenceRequestPatch } = await import("@/server/backend-api/evidence-request");
  return handleEvidenceRequestPatch(request, context);
}
