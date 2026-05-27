import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_AD_OPERATION_STRATEGIES,
  getApprovalDelegationPolicy,
  getOperationStrategySummary,
  normalizeSearchAdOperationStrategyInput,
  sortSearchAdOperationStrategies,
} from "@/features/search-ad/domain/operationStrategies";

describe("search ad operation strategies", () => {
  it("시즌 그룹은 넓게 열고 충분한 표본 뒤 시간대를 좁히는 전략으로 표시한다", () => {
    const strategy = DEFAULT_SEARCH_AD_OPERATION_STRATEGIES.find((item) => item.id === "strategy-stickersee-season-powerlink");

    expect(strategy).toMatchObject({
      strategyType: "seasonal_expansion",
      initialScheduleLabel: "넓게 열고 시작",
      minimumDataDays: 7,
      minimumClicks: 50,
    });
    expect(getOperationStrategySummary(strategy!)).toContain("7일");
    expect(getOperationStrategySummary(strategy!)).toContain("50회");
  });

  it("승인/위임 정책은 첫 실행은 대표 승인으로 두고 반복 패턴만 위임한다", () => {
    expect(getApprovalDelegationPolicy("negative_keyword")).toMatchObject({
      firstRunOwner: "representative",
      repeatRunOwner: "moa",
      requiresPreview: true,
    });
    expect(getApprovalDelegationPolicy("targeting_adjustment")?.guardrail).toContain("시간대");
  });

  it("운영 전략은 브랜드, 광고유형, 전략 순서로 정렬한다", () => {
    const sorted = sortSearchAdOperationStrategies([
      DEFAULT_SEARCH_AD_OPERATION_STRATEGIES[2],
      DEFAULT_SEARCH_AD_OPERATION_STRATEGIES[0],
      DEFAULT_SEARCH_AD_OPERATION_STRATEGIES[1],
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "strategy-coffeeprint-powerlink",
      "strategy-stickersee-season-powerlink",
      "strategy-stickersee-shopping",
    ]);
  });

  it("저장 입력은 숫자 기준과 한국어 운영 문구를 정리한다", () => {
    expect(
      normalizeSearchAdOperationStrategyInput({
        ...DEFAULT_SEARCH_AD_OPERATION_STRATEGIES[1],
        minimumDataDays: "14",
        minimumClicks: "80",
        minimumCost: "50,000",
        narrowingRule: "  충분한 클릭 후 저효율 시간대부터 줄입니다.  ",
      }),
    ).toMatchObject({
      minimumDataDays: 14,
      minimumClicks: 80,
      minimumCost: 50000,
      narrowingRule: "충분한 클릭 후 저효율 시간대부터 줄입니다.",
    });
  });
});
