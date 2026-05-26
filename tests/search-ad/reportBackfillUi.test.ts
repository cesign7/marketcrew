import { describe, expect, it } from "vitest";
import {
  BACKFILL_REPORT_TYPE_OPTIONS,
  buildBackfillRequestBody,
  buildBackgroundBackfillRequestBody,
  createFullBackfillFormState,
  getBackfillResultMessage,
  getBackfillSafetyDescription,
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
    const body = buildBackfillRequestBody({
      ...form,
      mode: "preview",
    });
    expect(body).toMatchObject({
      dryRun: true,
      fromDate: "2025-05-26",
      maxCreates: 3650,
      maxDates: 365,
      maxDownloads: 3650,
      maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
      rateLimitBackoffMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs,
      requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
      skipSaved: true,
      toDate: "2026-05-25",
    });
    expect(body).not.toHaveProperty("maxDailyCreates");
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
    expect(getBackfillStatusLabel("download_skipped")).toBe("다음 배치 대기");
    expect(getBackfillStatusLabel("downloadable")).toBe("저장 가능");
    expect(getBackfillStatusLabel("missing")).toBe("생성 필요");
    expect(getBackfillStatusLabel("pending", "NONE")).toBe("파일 없음");
    expect(getBackfillStatusLabel("rate_limited")).toBe("속도 제한");
  });

  it("이전 작업에 저장된 maxDownloads 문구도 화면에서는 다음 배치 안내로 보정한다", () => {
    expect(
      getBackfillResultMessage({
        message: "maxDownloads 제한으로 이번 실행에서는 다운로드하지 않았습니다.",
        status: "download_skipped",
      }),
    ).toBe("마켓크루 다운로드 안전 상한에 도달해 다음 자동 배치에서 이어서 저장합니다.");
  });

  it("네이버가 파일 없음 상태를 반환한 보고서는 계속 대기처럼 보이지 않게 설명한다", () => {
    expect(
      getBackfillResultMessage({
        providerStatus: "NONE",
        status: "pending",
      }),
    ).toBe("네이버가 다운로드 파일을 제공하지 않아 저장할 원본이 없습니다.");
  });

  it("안전 기준 안내는 마켓크루 건수 상한 대신 긴 요청 간격을 설명한다", () => {
    const description = getBackfillSafetyDescription({
      maxCreates: 3650,
      maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
    });

    expect(description).toContain("40건/시간당 80건 상한은 쓰지 않고");
    expect(description).toContain("요청 사이 긴 대기 시간");
    expect(description).not.toContain("하루");
  });

  it("긴 기간도 전체 날짜를 한 번에 계획한다", () => {
    expect(
      getQuickBackfillLimits({
        fromDate: "2026-01-01",
        reportTypes: createFullBackfillFormState("2026-05-26").reportTypes,
        toDate: "2026-04-30",
      }),
    ).toMatchObject({
      maxCreates: 1200,
      maxDates: 120,
      maxDownloads: 1200,
      maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
      requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
      selectedDates: 120,
      truncatedDates: 0,
    });
    expect(
      getQuickBackfillLimits({
        fromDate: "2026-01-01",
        reportTypes: createFullBackfillFormState("2026-05-26").reportTypes,
        toDate: "2026-04-30",
      }),
    ).not.toHaveProperty("maxDailyCreates");
  });

  it("보고서 복구는 설정 안에서만 관리하고 왼쪽 메뉴에는 노출하지 않는다", () => {
    expect(getMarketingNavItems()).not.toContainEqual({ href: "/reports/backfill", label: "보고서 복구" });
    expect(getMarketingNavItems()).toContainEqual({ href: "/settings", label: "설정" });
  });
});
