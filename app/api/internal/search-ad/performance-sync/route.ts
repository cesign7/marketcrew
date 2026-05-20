import {
  DEFAULT_PERFORMANCE_BACKFILL_DAYS,
  DEFAULT_PERFORMANCE_BACKFILL_KEYWORD_LIMIT,
  DEFAULT_PERFORMANCE_BACKFILL_MAX_DAYS_PER_RUN,
  MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS,
  syncNaverSearchAdPerformanceBackfill,
} from "@/lib/integrations/naver-search-ad/backfill";
import { sanitizeSearchAdErrorMessage } from "@/lib/integrations/naver-search-ad/errors";
import { authorizePerformanceSchedulerRequest } from "@/lib/integrations/naver-search-ad/scheduler-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SchedulerBody = Partial<{
  mode: "daily" | "backfill";
  days: number;
  maxDaysPerRun: number;
  keywordLimit: number;
}>;

export async function POST(request: Request) {
  const auth = authorizePerformanceSchedulerRequest(
    request.headers.get("authorization"),
  );

  if (!auth.ok) {
    return Response.json(
      { ok: false, status: "UNAUTHORIZED", errorMessage: auth.error },
      { status: auth.status },
    );
  }

  try {
    const body = await readSchedulerBody(request);
    const mode = body.mode === "backfill" ? "backfill" : "daily";
    const result = await syncNaverSearchAdPerformanceBackfill({
      days:
        mode === "daily"
          ? 1
          : toBoundedPositiveInteger(
              body.days,
              DEFAULT_PERFORMANCE_BACKFILL_DAYS,
              MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS,
            ),
      maxDaysPerRun:
        mode === "daily"
          ? 1
          : toBoundedPositiveInteger(
              body.maxDaysPerRun,
              DEFAULT_PERFORMANCE_BACKFILL_MAX_DAYS_PER_RUN,
              MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS,
            ),
      keywordLimit: toBoundedPositiveInteger(
        body.keywordLimit,
        DEFAULT_PERFORMANCE_BACKFILL_KEYWORD_LIMIT,
        10000,
      ),
      syncKind: mode === "daily" ? "scheduled-daily" : "scheduled-backfill",
    });

    return Response.json({
      ok: result.status === "SUCCEEDED" || result.status === "SKIPPED",
      status: result.status,
      syncRunId: result.id,
      keywordsCount: result.keywordsCount,
      snapshotsCount: result.snapshotsCount,
      since: result.since,
      until: result.until,
      statDates: result.statDates,
      remainingDays: result.backfillWindow.remainingDays,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        status: "FAILED",
        errorMessage: sanitizeSearchAdErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

async function readSchedulerBody(request: Request): Promise<SchedulerBody> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  const parsed = JSON.parse(text) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Scheduler request body must be a JSON object.");
  }

  return parsed as SchedulerBody;
}

function toBoundedPositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric < 1) {
    throw new Error("Scheduler numeric options must be positive integers.");
  }

  return Math.min(numeric, maximum);
}
