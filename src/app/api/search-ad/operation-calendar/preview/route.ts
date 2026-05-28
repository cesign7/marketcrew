import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdOperationCalendarPreview } from "@/lib/persistence/searchAdRepository";
import type { SearchAdHoliday } from "@/features/search-ad/domain/operationCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const url = new URL(request.url);
  const data = await getSearchAdOperationCalendarPreview({ date: url.searchParams.get("date") ?? undefined });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    holidays?: SearchAdHoliday[];
  };
  const data = await getSearchAdOperationCalendarPreview({
    date: body.date,
    holidays: Array.isArray(body.holidays) ? body.holidays : undefined,
  });
  return NextResponse.json({ ok: true, data });
}
