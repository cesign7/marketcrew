import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

type FollowUpRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: FollowUpRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    await clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { handleFollowUpPatch } = await import("@/server/backend-api/follow-up");
  return handleFollowUpPatch(request, context);
}
