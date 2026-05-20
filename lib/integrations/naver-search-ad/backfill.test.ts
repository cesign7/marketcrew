import { describe, expect, it } from "vitest";
import {
  buildPerformanceBackfillProgress,
  buildPerformanceBackfillWindow,
  collectCompletedBackfillStatDates,
} from "./backfill";

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

  it("collects completed dates from stored rows and successful backfill runs", () => {
    expect(
      collectCompletedBackfillStatDates({
        storedStatDates: ["20260515", "2026-05-16"],
        syncRuns: [
          {
            status: "SUCCEEDED",
            rawJson: {
              mode: "performance-read-only",
              syncKind: "backfill",
              statDates: ["20260517", "20260518"],
            },
          },
          {
            status: "SUCCEEDED",
            rawJson: {
              mode: "performance-read-only",
              syncKind: "manual-recent",
              statDates: ["20260519"],
            },
          },
          {
            status: "FAILED",
            rawJson: {
              mode: "performance-read-only",
              syncKind: "backfill",
              statDates: ["20260520"],
            },
          },
        ],
      }),
    ).toEqual(["20260515", "20260516", "20260517", "20260518"]);
  });

  it("builds progress and the next missing backfill window", () => {
    expect(
      buildPerformanceBackfillProgress({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 10,
        maxDaysPerRun: 3,
        completedStatDates: ["20260510", "20260511", "20260512", "20260513"],
      }),
    ).toMatchObject({
      requestedDays: 10,
      completedDays: 4,
      missingDays: 6,
      percentComplete: 40,
      isComplete: false,
      nextSince: "2026-05-14",
      nextUntil: "2026-05-16",
      nextStatDates: ["20260514", "20260515", "20260516"],
      remainingAfterNextRun: 3,
    });
  });

  it("marks progress complete when every date in the lookback is done", () => {
    expect(
      buildPerformanceBackfillProgress({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 3,
        maxDaysPerRun: 3,
        completedStatDates: ["20260517", "20260518", "20260519"],
      }),
    ).toMatchObject({
      completedDays: 3,
      missingDays: 0,
      percentComplete: 100,
      isComplete: true,
      nextSince: null,
      nextUntil: null,
      nextStatDates: [],
    });
  });
});
