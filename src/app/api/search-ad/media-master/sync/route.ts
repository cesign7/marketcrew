import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { syncSearchAdMediaMaster } from "@/server/search-ad/mediaMasterSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 60_000 });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as { forceCreate?: boolean };
  const result = await syncSearchAdMediaMaster({ forceCreate: body.forceCreate === true });
  if (!result.ok) {
    const status = result.code === "SEARCH_AD_MEDIA_MASTER_NOT_READY" ? 202 : result.code === "SEARCH_AD_CREDENTIALS_MISSING" ? 503 : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
