import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { handleLlmCostGovernance } = await import("@/server/backend-api/llm-cost-governance");
  return handleLlmCostGovernance();
}
