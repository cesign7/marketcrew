import { searchAdDownload, searchAdFetch } from "./client";
import { isSearchAdReportType } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdReportStatus, SearchAdReportType } from "@/features/search-ad/domain/types";

export type SearchAdReportJob = {
  reportJobId: number | string;
  reportTp: string;
  statDt: string;
  status: SearchAdReportStatus;
  downloadUrl?: string;
};

export async function listSearchAdReportJobs() {
  const jobs = await searchAdFetch<SearchAdReportJob[]>("/stat-reports");
  return jobs.filter((job) => isSearchAdReportType(job.reportTp));
}

export async function createSearchAdReportJob(reportType: SearchAdReportType, statDate: string) {
  return searchAdFetch<SearchAdReportJob>("/stat-reports", {
    body: JSON.stringify({
      reportTp: reportType,
      statDt: statDate.replaceAll("-", ""),
    }),
    method: "POST",
  });
}

export async function downloadSearchAdReport(downloadUrl: string) {
  return searchAdDownload(downloadUrl);
}
