import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/auth/cron";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdReportScheduleStatus, type SearchAdReportScheduleRunKind } from "@/features/search-ad/domain/reportSchedule";
import { runSearchAdDailyReportSync } from "./reportDailySync";

export async function handleSearchAdDailySyncCron(request: Request, mode: SearchAdReportScheduleRunKind) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, code: "CRON_UNAUTHORIZED", message: "자동 수집 호출 권한이 없습니다." }, { status: 401 });
  }

  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 120_000 });
  if (proxied) {
    return proxied;
  }

  const url = new URL(request.url);
  if (url.searchParams.get("check") === "1") {
    return NextResponse.json({
      ok: true,
      data: {
        mode,
        reportSchedule: getSearchAdReportScheduleStatus(),
        status: "ready",
      },
    });
  }

  const result = await runSearchAdDailyReportSync({ mode });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "SEARCH_AD_CREDENTIALS_MISSING" ? 503 : 500 });
  }

  return NextResponse.json(result);
}
