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
    return proxied;
  }

  const { handlePutAiOperationsSettings } = await import("@/server/backend-api/ai-operations-settings");
  return handlePutAiOperationsSettings(request);
}
