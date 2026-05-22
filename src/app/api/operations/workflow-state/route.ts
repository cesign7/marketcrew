import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/operations/workflow-state", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleWorkflowState } = await import("@/server/backend-api/workflow-state");
  return handleWorkflowState();
}
