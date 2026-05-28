import { NextResponse } from "next/server";
import { parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdReportDetailView } from "@/lib/persistence/searchAdRepository";

type ReportDetailRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ReportDetailRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const data = await getSearchAdReportDetailView(normalizeRouteParam(id), parseSearchAdFilters(Object.fromEntries(url.searchParams)));
  if (!data) {
    return NextResponse.json({ ok: false, code: "SEARCH_AD_REPORT_NOT_FOUND", message: "보고서를 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}

function normalizeRouteParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
