import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleOperationsViewModel } = await import("@/server/backend-api/operations-view-model");
  return handleOperationsViewModel();
}
