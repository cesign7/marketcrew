import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/auth/cron";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { runSearchAdOperationCalendar } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, code: "CRON_UNAUTHORIZED", message: "자동 운영 호출 권한이 없습니다." }, { status: 401 });
  }

  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 120_000 });
  if (proxied) {
    return proxied;
  }

  const url = new URL(request.url);
  const result = await runSearchAdOperationCalendar({
    date: url.searchParams.get("date") ?? undefined,
    dryRun: process.env.MARKETCREW_OPERATION_AUTOMATION_ENABLED !== "1" && process.env.SEARCH_AD_OPERATION_AUTOMATION_ENABLED !== "1",
  });
  return NextResponse.json({ ok: true, data: result });
}
