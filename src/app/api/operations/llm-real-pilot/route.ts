import { proxyRequestToBackend } from "@/lib/backend/proxy";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    return proxied;
  }

  const { handleLlmRealPilot } = await import("@/server/backend-api/llm-real-pilot");
  return handleLlmRealPilot();
}
