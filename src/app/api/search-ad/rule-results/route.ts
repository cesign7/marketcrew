import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdRuleResultsView } from "@/lib/persistence/searchAdRepository";
import { parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const url = new URL(request.url);
  const data = await getSearchAdRuleResultsView(parseSearchAdFilters(Object.fromEntries(url.searchParams)));
  return NextResponse.json({ ok: true, data });
}
