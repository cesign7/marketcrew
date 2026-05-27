import { describe, expect, it } from "vitest";
import { getNextSearchAdReportScheduleRun, getPreviousSearchAdReportStatDate, getSearchAdReportScheduleStatus } from "@/features/search-ad/domain/reportSchedule";

describe("search ad report schedule", () => {
  it("오전 7시 전에는 당일 7시 1차 저장을 다음 실행으로 본다", () => {
    const next = getNextSearchAdReportScheduleRun(new Date("2026-05-27T21:00:00.000Z"));

    expect(next.run.kind).toBe("primary");
    expect(next.runAt.toISOString()).toBe("2026-05-27T22:00:00.000Z");
  });

  it("오전 7시 후에는 당일 8시 재확인을 다음 실행으로 본다", () => {
    const next = getNextSearchAdReportScheduleRun(new Date("2026-05-27T22:30:00.000Z"));

    expect(next.run.kind).toBe("retry");
    expect(next.runAt.toISOString()).toBe("2026-05-27T23:00:00.000Z");
  });

  it("오전 8시 후에는 다음날 7시 1차 저장을 다음 실행으로 본다", () => {
    const next = getNextSearchAdReportScheduleRun(new Date("2026-05-27T23:30:00.000Z"));

    expect(next.run.kind).toBe("primary");
    expect(next.runAt.toISOString()).toBe("2026-05-28T22:00:00.000Z");
  });

  it("보고서 기준일은 한국시간 전일로 표시한다", () => {
    expect(getPreviousSearchAdReportStatDate(new Date("2026-05-27T23:30:00.000Z"))).toBe("2026-05-27");
  });

  it("화면에 필요한 자동 저장 상태를 만든다", () => {
    const status = getSearchAdReportScheduleStatus(new Date("2026-05-27T21:00:00.000Z"));

    expect(status.primaryRunLabel).toBe("매일 오전 7시");
    expect(status.retryRunLabel).toBe("매일 오전 8시");
    expect(status.reportTypeCount).toBe(10);
    expect(status.targetStatDate).toBe("2026-05-27");
  });
});
