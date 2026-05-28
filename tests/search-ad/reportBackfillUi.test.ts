import { describe, expect, it } from "vitest";
import {
  BACKFILL_REPORT_TYPE_OPTIONS,
  buildBackfillRequestBody,
  buildBackgroundBackfillRequestBody,
  createFullBackfillFormState,
  getBackfillCompletionChecklist,
  getBackfillProgressView,
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

  it("백필 진행률은 저장 완료와 파일 없음 누적을 함께 반영한다", () => {
    const view = getBackfillProgressView(
      {
        createdAt: "2026-05-27T04:00:00.000Z",
        id: "run-1",
        resultJson: {},
        status: "running",
        updatedAt: "2026-05-27T04:09:30.000Z",
      },
      {
        alreadySaved: 50,
        created: 0,
        createLimit: 80,
        downloadable: 20,
        downloaded: 20,
        failed: 0,
        maxDownloads: 100,
        maxHourlyCreates: 100000,
        missing: 0,
        noData: 5,
        parsed: 20,
        pending: 0,
        planned: 100,
        rateLimitBackoffMs: 600000,
        rateLimited: 0,
        requestDelayMs: 3000,
        ruleResults: 0,
        skippedDownloads: 0,
      },
      Date.parse("2026-05-27T04:10:00.000Z"),
    );

    expect(view).toMatchObject({
      completionPercent: 50,
      doneCount: 75,
      headline: "저장 진행 중",
      remainingCount: 75,
      stale: false,
      tone: "good",
      totalCount: 150,
    });
  });

  it("백필 진행 카드에서는 10분 이상 갱신이 없을 때만 멈춤 확인으로 올린다", () => {
    const baseRun = {
      createdAt: "2026-05-27T04:00:00.000Z",
      id: "run-1",
      resultJson: {},
      status: "running" as const,
      updatedAt: "2026-05-27T04:00:00.000Z",
    };
    const summary = {
      alreadySaved: 50,
      created: 0,
      createLimit: 80,
      downloadable: 0,
      downloaded: 0,
      failed: 0,
      maxDownloads: 100,
      maxHourlyCreates: 100000,
      missing: 50,
      noData: 0,
      parsed: 0,
      pending: 0,
      planned: 100,
      rateLimitBackoffMs: 600000,
      rateLimited: 0,
      requestDelayMs: 3000,
      ruleResults: 0,
      skippedDownloads: 0,
    };

    expect(getBackfillProgressView(baseRun, summary, Date.parse("2026-05-27T04:09:59.000Z")).stale).toBe(false);
    expect(getBackfillProgressView(baseRun, summary, Date.parse("2026-05-27T04:10:00.000Z"))).toMatchObject({
      headline: "멈춤 확인 필요",
      stale: true,
      tone: "danger",
    });
  });

  it("백필 완료 후 확인 순서는 저장 보고서와 규칙 결과 상태를 나눠 보여준다", () => {
    const checklist = getBackfillCompletionChecklist({
      alreadySaved: 100,
      created: 0,
      createLimit: 80,
      downloadable: 0,
      downloaded: 10,
      failed: 0,
      maxDownloads: 100,
      maxHourlyCreates: 100000,
      missing: 0,
      noData: 2,
      parsed: 10,
      pending: 0,
      planned: 0,
      rateLimitBackoffMs: 600000,
      rateLimited: 0,
      requestDelayMs: 3000,
      ruleResults: 7,
      skippedDownloads: 0,
    });

    expect(checklist.map((item) => item.title)).toEqual(["보고서 보관함 확인", "규칙 결과 재계산", "검색어 성과 점검", "남은 보고서 처리"]);
    expect(checklist[1]).toMatchObject({ label: "완료", status: "done" });
    expect(checklist[3]).toMatchObject({ label: "완료", status: "done" });
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

  it("보고서 보관 점검은 설정 안에서만 관리하고 왼쪽 메뉴에는 노출하지 않는다", () => {
    expect(getMarketingNavItems()).not.toContainEqual({ href: "/reports/backfill", label: "보고서 복구" });
    expect(getMarketingNavItems()).toContainEqual({ href: "/settings", label: "설정" });
  });
});
