export const SEARCH_AD_BACKFILL_SAFETY_LIMITS = {
  maxCreatesPerRun: 40,
  maxDownloadsPerRun: 40,
  maxCreatesPerHour: 80,
  maxCreatesPerDay: 300,
  requestDelayMs: 750,
  rateLimitBackoffMs: 5 * 60 * 1000,
} as const;

export type SearchAdBackfillSafetyInput = {
  maxCreates?: number;
  maxDailyCreates?: number;
  maxDownloads?: number;
  maxHourlyCreates?: number;
  rateLimitBackoffMs?: number;
  requestDelayMs?: number;
};

export type SearchAdBackfillSafetyLimits = {
  maxCreates: number;
  maxDailyCreates: number;
  maxDownloads: number;
  maxHourlyCreates: number;
  rateLimitBackoffMs: number;
  requestDelayMs: number;
};

export function resolveSearchAdBackfillSafetyLimits(input: SearchAdBackfillSafetyInput = {}): SearchAdBackfillSafetyLimits {
  return {
    maxCreates: clampInteger(input.maxCreates, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun, 0, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun),
    maxDailyCreates: clampInteger(input.maxDailyCreates, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerDay, 1, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerDay),
    maxDownloads: clampInteger(input.maxDownloads, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun, 0, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun),
    maxHourlyCreates: clampInteger(input.maxHourlyCreates, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour, 1, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour),
    rateLimitBackoffMs: clampInteger(input.rateLimitBackoffMs, SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs, 60_000, 60 * 60_000),
    requestDelayMs: clampInteger(input.requestDelayMs, SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs, 500, 30_000),
  };
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  const integer = Number(value);
  return Math.min(max, Math.max(min, integer));
}
