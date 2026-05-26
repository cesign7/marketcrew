export const SEARCH_AD_BACKFILL_SAFETY_LIMITS = {
  maxCreatesPerRun: 10_000,
  maxDownloadsPerRun: 10_000,
  maxCreatesPerHour: 100_000,
  requestDelayMs: 3_000,
  rateLimitBackoffMs: 10 * 60 * 1000,
} as const;

export type SearchAdBackfillSafetyInput = {
  maxCreates?: number;
  maxDownloads?: number;
  maxHourlyCreates?: number;
  rateLimitBackoffMs?: number;
  requestDelayMs?: number;
};

export type SearchAdBackfillSafetyLimits = {
  maxCreates: number;
  maxDownloads: number;
  maxHourlyCreates: number;
  rateLimitBackoffMs: number;
  requestDelayMs: number;
};

export function resolveSearchAdBackfillSafetyLimits(input: SearchAdBackfillSafetyInput = {}): SearchAdBackfillSafetyLimits {
  return {
    maxCreates: clampInteger(input.maxCreates, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun, 0, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun),
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
