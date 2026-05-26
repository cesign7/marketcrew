import { describe, expect, it, vi } from "vitest";
import { buildSearchAdReportBackfillPlan, runSearchAdReportBackfill } from "@/server/search-ad/reportBackfill";

describe("buildSearchAdReportBackfillPlan", () => {
  it("보고서 종류별 보관 기간으로 기본 백필 범위를 만든다", () => {
    const plan = buildSearchAdReportBackfillPlan({
      reportTypes: ["AD", "SHOPPINGKEYWORD_DETAIL", "SHOPPINGKEYWORD_CONVERSION_DETAIL"],
      todayKst: "2026-05-26",
    });

    expect(plan.fromDate).toBe("2025-05-26");
    expect(plan.toDate).toBe("2026-05-25");
    expect(plan.items.filter((item) => item.reportType === "AD")).toHaveLength(365);
    expect(plan.items.filter((item) => item.reportType === "SHOPPINGKEYWORD_DETAIL")).toHaveLength(180);
    expect(plan.items.filter((item) => item.reportType === "SHOPPINGKEYWORD_CONVERSION_DETAIL")).toHaveLength(45);
    expect(plan.items[0]).toEqual({ reportType: "AD", statDate: "2025-05-26" });
  });

  it("명시한 날짜 범위와 날짜 수 제한을 우선한다", () => {
    const plan = buildSearchAdReportBackfillPlan({
      fromDate: "2026-05-20",
      maxDates: 2,
      reportTypes: ["AD", "EXPKEYWORD"],
      toDate: "2026-05-25",
      todayKst: "2026-05-26",
    });

    expect(plan.items).toEqual([
      { reportType: "AD", statDate: "2026-05-20" },
      { reportType: "EXPKEYWORD", statDate: "2026-05-20" },
      { reportType: "AD", statDate: "2026-05-21" },
      { reportType: "EXPKEYWORD", statDate: "2026-05-21" },
    ]);
    expect(plan.truncatedDates).toBe(4);
  });
});

describe("runSearchAdReportBackfill", () => {
  it("dry run에서는 기존, 누락, 다운로드 가능 작업을 분류하고 외부 변경을 하지 않는다", async () => {
    const createJob = vi.fn();
    const downloadReport = vi.fn();
    const saveReport = vi.fn();

    const result = await runSearchAdReportBackfill({
      dependencies: {
        createJob,
        credentialsReady: () => true,
        databaseReady: () => true,
        downloadReport,
        listSavedReportKeys: async () => [],
        listJobs: async () => [
          {
            downloadUrl: "/report-download?authtoken=a",
            reportJobId: "job-ad",
            reportTp: "AD",
            statDt: "20260525",
            status: "BUILT",
          },
        ],
        rebuildRules: async () => ({ saved: 0 }),
        saveReport,
      },
      dryRun: true,
      fromDate: "2026-05-25",
      reportTypes: ["AD", "EXPKEYWORD"],
      toDate: "2026-05-25",
      todayKst: "2026-05-26",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.data.summary).toMatchObject({
      created: 0,
      downloadable: 1,
      downloaded: 0,
      missing: 1,
      planned: 2,
    });
    expect(createJob).not.toHaveBeenCalled();
    expect(downloadReport).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("이미 저장된 보고서는 건너뛰고 다음 남은 날짜부터 처리한다", async () => {
    const result = await runSearchAdReportBackfill({
      dependencies: {
        createJob: vi.fn(),
        credentialsReady: () => true,
        databaseReady: () => true,
        downloadReport: vi.fn(),
        listJobs: async () => [],
        listSavedReportKeys: async () => [
          { reportType: "AD", statDate: "2026-05-20" },
          { reportType: "AD", statDate: "2026-05-21" },
        ],
        rebuildRules: async () => ({ saved: 0 }),
        saveReport: vi.fn(),
      },
      dryRun: true,
      fromDate: "2026-05-20",
      maxDates: 2,
      reportTypes: ["AD"],
      skipSaved: true,
      toDate: "2026-05-25",
      todayKst: "2026-05-26",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.data.plan).toMatchObject({
      fromDate: "2026-05-22",
      toDate: "2026-05-23",
      totalItems: 2,
      truncatedDates: 2,
    });
    expect(result.data.summary).toMatchObject({
      alreadySaved: 2,
      missing: 2,
      planned: 2,
    });
  });
});
