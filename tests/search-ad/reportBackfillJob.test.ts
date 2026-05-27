import { afterEach, describe, expect, it, vi } from "vitest";
import { SEARCH_AD_BACKFILL_SAFETY_LIMITS } from "@/features/search-ad/domain/backfillSafety";
import { getAllowedCreatesForCycle, getNextDelayMs, getProgressMessage, shouldAutoResumeBackfillRun } from "@/server/search-ad/reportBackfillJob";
import type { SearchAdBackfillRunSuccess } from "@/server/search-ad/reportBackfill";
import type { SearchAdBackfillRunRecord } from "@/lib/persistence/searchAdRepository";

describe("search ad report backfill background scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("생성 상한에 걸려도 저장 가능한 보고서가 남으면 다운로드 배치를 바로 이어간다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T07:48:44.000Z"));

    const result = buildBackfillResult({
      created: 40,
      downloadable: 89,
      downloaded: 40,
      missing: 404,
      skippedDownloads: 49,
    });
    const safetyWindow = {
      createdThisHour: 80,
      hourStartedAt: "2026-05-26T07:40:03.916Z",
    };

    expect(getNextDelayMs(result, safetyWindow, buildSafetyLimits())).toBe(2_000);
    expect(getProgressMessage(result, safetyWindow, buildSafetyLimits())).toContain("다운로드 배치를 바로 이어갑니다");
  });

  it("저장 가능한 보고서가 없고 생성 또는 준비 중 보고서가 있으면 길게 기다린다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T07:48:44.000Z"));

    const result = buildBackfillResult({
      created: 40,
      downloadable: 0,
      downloaded: 0,
      missing: 404,
      skippedDownloads: 0,
    });
    const safetyWindow = {
      createdThisHour: 80,
      hourStartedAt: "2026-05-26T07:40:03.916Z",
    };

    expect(getNextDelayMs(result, safetyWindow, buildSafetyLimits())).toBe(60_000);
    expect(getProgressMessage(result, safetyWindow, buildSafetyLimits())).toContain("네이버가 보고서를 생성");
  });

  it("배포 재시작 뒤 오래 갱신되지 않은 running 작업은 조회 시 자동 재개 대상이 된다", () => {
    const now = Date.parse("2026-05-26T13:00:00.000Z");

    expect(
      shouldAutoResumeBackfillRun(
        buildRun({
          status: "running",
          updatedAt: "2026-05-26T12:55:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
    expect(
      shouldAutoResumeBackfillRun(
        buildRun({
          status: "running",
          updatedAt: "2026-05-26T12:59:30.000Z",
        }),
        now,
      ),
    ).toBe(false);
  });

  it("대기 작업은 다음 시도 시간이 지난 뒤에만 자동 재개한다", () => {
    const run = buildRun({
      resultJson: { job: { nextAttemptAt: "2026-05-26T13:01:00.000Z" } },
      status: "waiting",
      updatedAt: "2026-05-26T12:55:00.000Z",
    });

    expect(shouldAutoResumeBackfillRun(run, Date.parse("2026-05-26T13:00:30.000Z"))).toBe(false);
    expect(shouldAutoResumeBackfillRun(run, Date.parse("2026-05-26T13:01:00.000Z"))).toBe(true);
  });

  it("전체 백필은 계속 진행하되 한 사이클 생성량은 보고서 목록 재조회 범위보다 작게 끊는다", () => {
    const safetyWindow = {
      createdThisHour: 0,
      hourStartedAt: "2026-05-26T13:00:00.000Z",
    };

    expect(getAllowedCreatesForCycle(safetyWindow, buildSafetyLimits())).toBe(80);
    expect(getAllowedCreatesForCycle(safetyWindow, { ...buildSafetyLimits(), maxCreates: 30 })).toBe(30);
  });
});

function buildSafetyLimits() {
  return {
    maxCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun,
    maxDownloads: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun,
    maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
    rateLimitBackoffMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs,
    requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
  };
}

function buildBackfillResult(summary: Partial<SearchAdBackfillRunSuccess["data"]["summary"]>): SearchAdBackfillRunSuccess {
  return {
    data: {
      plan: {
        fromDate: "2025-05-26",
        items: [],
        retentionStarts: { AD: "2025-05-26" },
        reportTypes: ["AD"],
        toDate: "2025-08-30",
        totalItems: summary.planned ?? 542,
        truncatedDates: 267,
      },
      results: [],
      summary: {
        alreadySaved: 50,
        createLimit: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun,
        created: summary.created ?? 0,
        downloadable: summary.downloadable ?? 0,
        downloaded: summary.downloaded ?? 0,
        failed: 0,
        maxDownloads: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun,
        maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
        missing: summary.missing ?? 0,
        noData: summary.noData ?? 0,
        parsed: summary.downloaded ?? 0,
        pending: 0,
        planned: summary.planned ?? 542,
        rateLimitBackoffMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs,
        rateLimited: 0,
        requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
        ruleResults: 0,
        skippedDownloads: summary.skippedDownloads ?? 0,
      },
    },
    ok: true,
  };
}

function buildRun(overrides: Partial<SearchAdBackfillRunRecord>): SearchAdBackfillRunRecord {
  return {
    completedAt: undefined,
    createdAt: "2026-05-26T12:50:00.000Z",
    errorMessage: undefined,
    id: "search-ad-backfill-test",
    inputJson: {
      createMissing: true,
      dryRun: false,
      reportTypes: ["AD"],
      skipSaved: true,
    },
    resultJson: undefined,
    startedAt: "2026-05-26T12:50:00.000Z",
    status: "running",
    updatedAt: "2026-05-26T12:55:00.000Z",
    ...overrides,
  };
}
