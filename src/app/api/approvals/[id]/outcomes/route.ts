import { proxyRequestToBackend } from "@/lib/backend/proxy";

type OutcomeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: OutcomeRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleApprovalOutcomes } = await import("@/server/backend-api/approval-outcomes");
  return handleApprovalOutcomes(context);
}
