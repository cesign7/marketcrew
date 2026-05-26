import { describe, expect, it } from "vitest";
import {
  BACKFILL_REPORT_TYPE_OPTIONS,
  buildBackfillRequestBody,
  buildBackgroundBackfillRequestBody,
  createFullBackfillFormState,
  getBackfillStatusLabel,
  getQuickBackfillLimits,
} from "@/components/search-ad/ReportBackfillPanel";
import { getMarketingNavItems } from "@/components/layout/MarketingShell";
import { SEARCH_AD_BACKFILL_SAFETY_LIMITS } from "@/features/search-ad/domain/backfillSafety";

describe("report backfill UI helpers", () => {
  it("전체 확인 요청은 오늘 기준 최대 범위와 전체 보고서 dry run 계획으로 만든다", () => {
    const form = createFullBackfillFormState("2026-05-26");

    expect(form.fromDate).toBe("2025-05-26");
    expect(form.toDate).toBe("2026-05-25");
    expect(form.reportTypes).toHaveLength(10);
    expect(
      buildBackfillRequestBody({
        ...form,
        mode: "preview",
      }),
    ).toMatchObject({
      dryRun: true,
      fromDate: "2025-05-26",
      maxCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun,
      maxDailyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerDay,
      maxDates: 92,
      maxDownloads: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun,
      maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
      rateLimitBackoffMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs,
      requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
      skipSaved: true,
      toDate: "2026-05-25",
    });
  });

  it("전체 저장 요청은 누락 생성과 저장 건너뛰기 기준을 함께 보낸다", () => {
    expect(
      buildBackgroundBackfillRequestBody({
        fromDate: "2026-05-19",
        mode: "recover-all",
        reportTypes: ["AD"],
        toDate: "2026-05-25",
      }),
    ).toMatchObject({ background: true, createMissing: true, dryRun: false, skipSaved: true });
  });

  it("화면에는 대표가 읽을 수 있는 보고서 이름과 상태명이 노출된다", () => {
    expect(BACKFILL_REPORT_TYPE_OPTIONS).toHaveLength(10);
    expect(BACKFILL_REPORT_TYPE_OPTIONS.map((option) => option.label)).toContain("쇼핑검색 검색어 상세 보고서");
    expect(getBackfillStatusLabel("downloadable")).toBe("저장 가능");
    expect(getBackfillStatusLabel("missing")).toBe("생성 필요");
    expect(getBackfillStatusLabel("rate_limited")).toBe("속도 제한");
  });

  it("긴 기간은 빠른 복구 배치로 나눠 처리한다", () => {
    expect(
      getQuickBackfillLimits({
        fromDate: "2026-01-01",
        reportTypes: createFullBackfillFormState("2026-05-26").reportTypes,
        toDate: "2026-04-30",
      }),
    ).toMatchObject({
      maxCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun,
      maxDailyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerDay,
      maxDates: 92,
      maxDownloads: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun,
      maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
      requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
      selectedDates: 120,
      truncatedDates: 28,
    });
  });

  it("보고서 복구는 설정 안에서만 관리하고 왼쪽 메뉴에는 노출하지 않는다", () => {
    expect(getMarketingNavItems()).not.toContainEqual({ href: "/reports/backfill", label: "보고서 복구" });
    expect(getMarketingNavItems()).toContainEqual({ href: "/settings", label: "설정" });
  });
});
