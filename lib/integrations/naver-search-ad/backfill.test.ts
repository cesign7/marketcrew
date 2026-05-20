import { describe, expect, it } from "vitest";
import { buildPerformanceBackfillWindow } from "./backfill";

describe("Naver Search Ad performance backfill planner", () => {
  it("builds the first 7 missing days from a 90 day lookback", () => {
    expect(
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 90,
        maxDaysPerRun: 7,
      }),
    ).toMatchObject({
      requestedDays: 90,
      maxDaysPerRun: 7,
      since: "2026-02-19",
      until: "2026-02-25",
      statDates: [
        "20260219",
        "20260220",
        "20260221",
        "20260222",
        "20260223",
        "20260224",
        "20260225",
      ],
      remainingDays: 83,
    });
  });

  it("skips dates that are already stored", () => {
    expect(
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 5,
        maxDaysPerRun: 3,
        completedStatDates: ["20260515", "20260516"],
      }),
    ).toMatchObject({
      since: "2026-05-17",
      until: "2026-05-19",
      statDates: ["20260517", "20260518", "20260519"],
      remainingDays: 0,
      skippedDates: ["20260515", "20260516"],
    });
  });

  it("rejects lookbacks beyond the StatReport detail report limit", () => {
    expect(() =>
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 181,
        maxDaysPerRun: 7,
      }),
    ).toThrow("180 days");
  });
});
