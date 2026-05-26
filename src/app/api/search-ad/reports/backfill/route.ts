import { NextResponse } from "next/server";
import { isSearchAdReportType } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdReportType } from "@/features/search-ad/domain/types";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { runSearchAdReportBackfill } from "@/server/search-ad/reportBackfill";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true, timeoutMs: 120_000 });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as {
    createMissing?: boolean;
    dryRun?: boolean;
    fromDate?: string;
    maxCreates?: number;
    maxDates?: number;
    maxDownloads?: number;
    reportTypes?: string[];
    skipSaved?: boolean;
    toDate?: string;
  };

  try {
    const result = await runSearchAdReportBackfill({
      createMissing: body.createMissing === true,
      dryRun: body.dryRun ?? true,
      fromDate: body.fromDate,
      maxCreates: positiveInteger(body.maxCreates),
      maxDates: positiveInteger(body.maxDates),
      maxDownloads: positiveInteger(body.maxDownloads),
      reportTypes: body.reportTypes?.filter(isSearchAdReportType) as SearchAdReportType[] | undefined,
      skipSaved: body.skipSaved === true,
      toDate: body.toDate,
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
