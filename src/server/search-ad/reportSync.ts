import { getReportColumns } from "@/features/search-ad/domain/reportColumnSchemas";
import { parseSearchAdReport } from "@/features/search-ad/domain/parseSearchAdReport";
import { isSearchAdReportType } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdReportType } from "@/features/search-ad/domain/types";
import { downloadSearchAdReport, listSearchAdReportJobs } from "@/lib/integrations/search-ad/reports";
import { getSearchAdCredentials } from "@/lib/integrations/search-ad/client";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import { rebuildAndSaveSearchAdRuleResults, saveDownloadedReport } from "@/lib/persistence/searchAdRepository";

type ReportSyncInput = {
  statDate: string;
  reportTypes?: SearchAdReportType[];
};

export async function syncBuiltSearchAdReports(input: ReportSyncInput) {
  if (!getSearchAdCredentials()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_CREDENTIALS_MISSING",
      message: "네이버 검색광고 API 설정이 필요합니다.",
    };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_DATABASE_MISSING",
      message: "보고서 원본을 저장할 DB 연결이 필요합니다.",
    };
  }

  const reportTypes = input.reportTypes ?? ["AD", "EXPKEYWORD", "SHOPPINGKEYWORD_DETAIL"];
  const jobs = await listSearchAdReportJobs();
  const targetJobs = jobs.filter((job) => {
    const reportType = job.reportTp;
    return (
      job.status === "BUILT" &&
      isSearchAdReportType(reportType) &&
      reportTypes.includes(reportType) &&
      normalizeStatDate(job.statDt) === input.statDate &&
      Boolean(job.downloadUrl)
    );
  });

  const failed: Array<{ reportJobId: string; message: string }> = [];
  let downloaded = 0;
  let parsed = 0;

  for (const job of targetJobs) {
    try {
      const reportType = job.reportTp as SearchAdReportType;
      const download = await downloadSearchAdReport(job.downloadUrl!);
      const parsedReport = parseSearchAdReport(reportType, download.text, {
        reportFileId: `report-${job.reportJobId}`,
        sourceDate: input.statDate,
        strictColumnCount: true,
      });
      await saveDownloadedReport({
        providerReportJobId: String(job.reportJobId),
        reportType,
        statDate: input.statDate,
        status: job.status,
        downloadUrl: job.downloadUrl,
        rawText: download.text,
        checksum: parsedReport.checksum,
        parserVersion: parsedReport.parserVersion,
        rawRows: parsedReport.rows,
        normalizedRows: parsedReport.normalizedRows,
      });
      downloaded += 1;
      parsed += 1;
    } catch (error) {
      failed.push({
        reportJobId: String(job.reportJobId),
        message: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }

  const ruleRebuild = parsed > 0 ? await rebuildAndSaveSearchAdRuleResults() : { saved: 0 };

  return {
    ok: true as const,
    data: {
      statDate: input.statDate,
      jobsSeen: jobs.length,
      targetJobs: targetJobs.length,
      downloaded,
      parsed,
      ruleResults: ruleRebuild.saved,
      failed,
      knownColumnCounts: Object.fromEntries(reportTypes.map((reportType) => [reportType, getReportColumns(reportType).length])),
    },
  };
}

function normalizeStatDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  return value.slice(0, 10);
}
