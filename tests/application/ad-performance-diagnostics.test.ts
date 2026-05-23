import { describe, expect, it } from "vitest";
import { buildAdPerformanceDiagnoses } from "../../src/lib/application/ad-performance-diagnostics";
import type { SearchAdPerformanceSnapshot } from "../../src/lib/domain";

const GENERATED_AT = "2026-05-23T08:00:00.000Z";

describe("buildAdPerformanceDiagnoses", () => {
  it("클릭은 있는데 주문이 없는 키워드와 목표 CPA 초과 키워드를 데이터 규칙으로 판정한다", () => {
    const diagnoses = buildAdPerformanceDiagnoses({
      snapshots: [
        buildSnapshot({
          id: "ad-perf-no-order",
          keyword: "생일 답례품",
          clicks: 64,
          cost: 38400,
          conversions: 0,
          revenue: 0,
          targetCpa: 12000,
        }),
        buildSnapshot({
          id: "ad-perf-high-cpa",
          keyword: "스티커 제작",
          clicks: 80,
          cost: 90000,
          conversions: 3,
          revenue: 120000,
          targetCpa: 18000,
        }),
      ],
      generatedAt: GENERATED_AT,
    });

    expect(diagnoses.map((diagnosis) => diagnosis.kind)).toEqual(
      expect.arrayContaining(["CLICKS_NO_ORDER", "HIGH_CPA"]),
    );
    expect(diagnoses.find((diagnosis) => diagnosis.kind === "CLICKS_NO_ORDER")).toMatchObject({
      character: "gro",
      dataConfidence: "READY_TO_APPROVE",
      severity: "HIGH",
      recommendedAction: expect.stringContaining("일시중지"),
      evidenceIds: ["ad-perf-no-order"],
    });
    expect(diagnoses.find((diagnosis) => diagnosis.kind === "HIGH_CPA")?.summary).toContain("목표 CPA");
  });

  it("기기와 시간대별 전환율 차이를 데이터 규칙으로 판정한다", () => {
    const diagnoses = buildAdPerformanceDiagnoses({
      snapshots: [
        buildSnapshot({
          id: "ad-perf-pc",
          keyword: "생일축하스티커",
          device: "PC",
          clicks: 80,
          conversions: 8,
          cost: 40000,
          revenue: 240000,
        }),
        buildSnapshot({
          id: "ad-perf-mobile",
          keyword: "생일축하스티커",
          device: "MOBILE",
          clicks: 120,
          conversions: 2,
          cost: 72000,
          revenue: 60000,
        }),
        buildSnapshot({
          id: "ad-perf-evening",
          keyword: "답례품 스티커",
          timeSlot: "18-23",
          clicks: 75,
          conversions: 0,
          cost: 52000,
          revenue: 0,
        }),
        buildSnapshot({
          id: "ad-perf-daytime",
          keyword: "답례품 스티커",
          timeSlot: "09-17",
          clicks: 60,
          conversions: 5,
          cost: 30000,
          revenue: 180000,
        }),
      ],
      generatedAt: GENERATED_AT,
    });

    expect(diagnoses.map((diagnosis) => diagnosis.kind)).toEqual(
      expect.arrayContaining(["DEVICE_GAP", "TIME_SLOT_GAP"]),
    );
    expect(diagnoses.find((diagnosis) => diagnosis.kind === "DEVICE_GAP")?.summary).toContain("모바일");
    expect(diagnoses.find((diagnosis) => diagnosis.kind === "TIME_SLOT_GAP")?.summary).toContain("18-23");
  });

  it("전환 추적이 확인되지 않은 성과는 조치안이 아니라 데이 확인이 필요한 근거로 표시한다", () => {
    const diagnoses = buildAdPerformanceDiagnoses({
      snapshots: [
        buildSnapshot({
          id: "ad-perf-unverified",
          keyword: "스티커 무료 도안",
          clicks: 92,
          cost: 31000,
          conversions: 0,
          revenue: 0,
          trackingVerified: false,
        }),
      ],
      generatedAt: GENERATED_AT,
    });

    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0]).toMatchObject({
      kind: "TRACKING_UNVERIFIED",
      character: "day",
      dataConfidence: "AD_TRACKING_UNVERIFIED",
      recommendedAction: expect.stringContaining("전환 추적"),
    });
  });
});

function buildSnapshot(overrides: Partial<SearchAdPerformanceSnapshot>): SearchAdPerformanceSnapshot {
  return {
    id: "ad-perf-sample",
    provider: "naver_search_ad",
    brandKey: "STICKERSEE",
    campaignName: "스티커씨 검색광고",
    adGroupName: "대표 상품",
    keyword: "생일축하스티커",
    device: "ALL",
    windowDays: 7,
    impressions: 1000,
    clicks: 40,
    cost: 20000,
    conversions: 2,
    revenue: 80000,
    targetCpa: 12000,
    targetRoas: 2.5,
    trackingVerified: true,
    collectedAt: GENERATED_AT,
    dataScope: "aggregate_only",
    ...overrides,
  };
}
