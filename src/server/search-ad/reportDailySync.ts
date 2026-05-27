import { ALL_SEARCH_AD_REPORT_TYPES } from "@/features/search-ad/domain/reportRetention";
import type { SearchAdReportScheduleRunKind } from "@/features/search-ad/domain/reportSchedule";
import { getPreviousSearchAdReportStatDate } from "@/features/search-ad/domain/reportSchedule";
import { runSearchAdReportBackfill } from "./reportBackfill";

type SearchAdDailyReportSyncInput = {
  mode: SearchAdReportScheduleRunKind;
  now?: Date;
  statDate?: string;
};

export async function runSearchAdDailyReportSync(input: SearchAdDailyReportSyncInput) {
  const statDate = input.statDate ?? getPreviousSearchAdReportStatDate(input.now);
  const result = await runSearchAdReportBackfill({
    createMissing: true,
    dryRun: false,
    fromDate: statDate,
    maxCreates: ALL_SEARCH_AD_REPORT_TYPES.length,
    maxDates: 1,
    maxDownloads: ALL_SEARCH_AD_REPORT_TYPES.length,
    reportTypes: ALL_SEARCH_AD_REPORT_TYPES,
    requestDelayMs: 500,
    skipSaved: true,
    toDate: statDate,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    data: {
      ...result.data,
      mode: input.mode,
      statDate,
    },
  };
}
