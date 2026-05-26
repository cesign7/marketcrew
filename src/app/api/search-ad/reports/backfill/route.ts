import { NextResponse } from "next/server";
import { isSearchAdReportType } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdReportType } from "@/features/search-ad/domain/types";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { runSearchAdReportBackfill } from "@/server/search-ad/reportBackfill";
import { getSearchAdReportBackfillJob, startSearchAdReportBackfillJob } from "@/server/search-ad/reportBackfillJob";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 10_000 });
  if (proxied) {
    return proxied;
  }

  try {
    const url = new URL(request.url);
    const result = await getSearchAdReportBackfillJob(url.searchParams.get("runId") ?? undefined);
    return NextResponse.json(result);
  } catch (error) {
    const message = getBackfillErrorMessage(error);
    return NextResponse.json({ ok: false, code: "SEARCH_AD_BACKFILL_STATUS_FAILED", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 120_000 });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as {
    background?: boolean;
    createMissing?: boolean;
    dryRun?: boolean;
    fromDate?: string;
    maxCreates?: number;
    maxDailyCreates?: number;
    maxDates?: number;
    maxDownloads?: number;
    maxHourlyCreates?: number;
    rateLimitBackoffMs?: number;
    reportTypes?: string[];
    requestDelayMs?: number;
    skipSaved?: boolean;
    toDate?: string;
  };

  try {
    const reportTypes = body.reportTypes?.filter(isSearchAdReportType) as SearchAdReportType[] | undefined;
    const input = {
      createMissing: body.createMissing === true,
      dryRun: body.dryRun ?? true,
      fromDate: body.fromDate,
      maxCreates: positiveInteger(body.maxCreates),
      maxDailyCreates: positiveInteger(body.maxDailyCreates),
      maxDates: positiveInteger(body.maxDates),
      maxDownloads: positiveInteger(body.maxDownloads),
      maxHourlyCreates: positiveInteger(body.maxHourlyCreates),
      rateLimitBackoffMs: positiveInteger(body.rateLimitBackoffMs),
      reportTypes,
      requestDelayMs: positiveInteger(body.requestDelayMs),
      skipSaved: body.skipSaved === true,
      toDate: body.toDate,
    };

    if (body.background === true) {
      const result = await startSearchAdReportBackfillJob(input);
      return NextResponse.json(result, { status: result.ok ? 202 : 500 });
    }

    const result = await runSearchAdReportBackfill({
      ...input,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === "SEARCH_AD_CREDENTIALS_MISSING" ? 503 : 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = getBackfillErrorMessage(error);
    return NextResponse.json({ ok: false, code: "SEARCH_AD_BACKFILL_INVALID_REQUEST", message }, { status: 400 });
  }
}

function positiveInteger(value: number | undefined) {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    return undefined;
  }

  return value;
}

function getBackfillErrorMessage(error: unknown) {
  if (error instanceof AggregateError && error.errors.length > 0) {
    return error.errors
      .map((item) => (item instanceof Error && item.message ? item.message : String(item)))
      .filter(Boolean)
      .join(" / ");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "백필 작업을 계산하지 못했습니다.";
}
