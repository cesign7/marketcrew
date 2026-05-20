import { describe, expect, it } from "vitest";
import { evaluatePerformanceDataQuality } from "./performance-quality";

describe("evaluatePerformanceDataQuality", () => {
  it("requires keyword snapshots before keyword diagnosis can run", () => {
    expect(
      evaluatePerformanceDataQuality({
        keywordSnapshotCount: 0,
        performanceRowCount: 0,
        latestPerformanceRun: null,
        now: new Date("2026-05-20T00:00:00.000Z"),
      }),
    ).toMatchObject({
      status: "NO_KEYWORDS",
      canDiagnose: false,
      title: "키워드 목록이 필요합니다",
    });
  });

  it("blocks proposals when stats sync has no performance rows", () => {
    expect(
      evaluatePerformanceDataQuality({
        keywordSnapshotCount: 2879,
        performanceRowCount: 0,
        latestPerformanceRun: {
          status: "SUCCEEDED",
          startedAt: new Date("2026-05-20T00:00:00.000Z"),
          finishedAt: new Date("2026-05-20T00:03:00.000Z"),
          errorMessage: null,
        },
        now: new Date("2026-05-20T00:10:00.000Z"),
      }),
    ).toMatchObject({
      status: "NO_PERFORMANCE_ROWS",
      canDiagnose: false,
      title: "성과 데이터가 비어 있습니다",
    });
  });

  it("marks old performance data as stale", () => {
    expect(
      evaluatePerformanceDataQuality({
        keywordSnapshotCount: 20,
        performanceRowCount: 10,
        latestPerformanceRun: {
          status: "SUCCEEDED",
          startedAt: new Date("2026-05-15T00:00:00.000Z"),
          finishedAt: new Date("2026-05-15T00:03:00.000Z"),
          errorMessage: null,
        },
        now: new Date("2026-05-20T00:00:00.000Z"),
      }),
    ).toMatchObject({
      status: "STALE_PERFORMANCE",
      canDiagnose: true,
      title: "성과 데이터가 오래됐습니다",
    });
  });

  it("allows diagnosis when keyword and performance data are fresh", () => {
    expect(
      evaluatePerformanceDataQuality({
        keywordSnapshotCount: 20,
        performanceRowCount: 10,
        latestPerformanceRun: {
          status: "SUCCEEDED",
          startedAt: new Date("2026-05-20T00:00:00.000Z"),
          finishedAt: new Date("2026-05-20T00:03:00.000Z"),
          errorMessage: null,
        },
        now: new Date("2026-05-20T12:00:00.000Z"),
      }),
    ).toMatchObject({
      status: "READY",
      canDiagnose: true,
      title: "진단 준비 완료",
    });
  });
});
