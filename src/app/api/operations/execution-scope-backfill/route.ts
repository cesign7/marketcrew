import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/operations/execution-scope-backfill", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleExecutionScopeBackfill } = await import("@/server/backend-api/execution-scope-backfill");
  return handleExecutionScopeBackfill(request, "preview");
}

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/operations/execution-scope-backfill", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleExecutionScopeBackfill } = await import("@/server/backend-api/execution-scope-backfill");
  return handleExecutionScopeBackfill(request, "apply");
}
