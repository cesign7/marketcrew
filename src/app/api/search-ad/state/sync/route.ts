import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { syncSearchAdState } from "@/server/search-ad/stateSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    return proxied;
  }

  const result = await syncSearchAdState();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "SEARCH_AD_CREDENTIALS_MISSING" ? 503 : 500 });
  }

  return NextResponse.json(result);
}
