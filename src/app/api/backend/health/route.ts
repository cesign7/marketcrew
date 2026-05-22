import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/backend/health", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleBackendHealth } = await import("@/server/backend-api/backend-health");
  return handleBackendHealth();
}
