import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

type DecisionRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: DecisionRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { handleApprovalDecision } = await import("@/server/backend-api/approval-decision");
  return handleApprovalDecision(request, context);
}
