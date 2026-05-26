import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { isSearchAdReportType } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdReportType } from "@/features/search-ad/domain/types";
import { syncBuiltSearchAdReports } from "@/server/search-ad/reportSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 30_000 });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as {
    reportTypes?: string[];
    statDate?: string;
  };
  const statDate = body.statDate ?? getYesterdayKst();
  const reportTypes = body.reportTypes?.filter(isSearchAdReportType) as SearchAdReportType[] | undefined;
  const result = await syncBuiltSearchAdReports({ reportTypes, statDate });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "SEARCH_AD_CREDENTIALS_MISSING" ? 503 : 500 });
  }

  return NextResponse.json(result);
}

function getYesterdayKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - 1);
  return kst.toISOString().slice(0, 10);
}
