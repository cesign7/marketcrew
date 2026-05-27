import { NextResponse } from "next/server";
import { parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdKeywordCleanupView } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const url = new URL(request.url);
  const data = await getSearchAdKeywordCleanupView(parseSearchAdFilters(Object.fromEntries(url.searchParams)));
  return NextResponse.json({ ok: true, data });
}
