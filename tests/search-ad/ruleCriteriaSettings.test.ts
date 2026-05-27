import { describe, expect, it } from "vitest";
import { normalizeSearchAdRuleCriteriaInput, sortSearchAdRuleCriteria } from "@/features/search-ad/domain/ruleCriteriaSettings";

describe("rule criteria settings", () => {
  it("화면 입력값을 저장 가능한 성과 기준으로 정규화한다", () => {
    const criteria = normalizeSearchAdRuleCriteriaInput({
      id: "criteria-coffeeprint-powerlink",
      brandKey: "coffeeprint",
      adProductType: "powerlink",
      periodDays: "30",
      minImpressions: "1,000",
      minClicks: "20",
      minCost: "15000",
      targetCpa: "",
      targetRoas: "250",
      enabled: false,
    });

    expect(criteria).toMatchObject({
      enabled: false,
      minImpressions: 1000,
      periodDays: 30,
      targetCpa: null,
      targetRoas: 250,
    });
  });

  it("브랜드와 광고유형을 고정 순서로 정렬한다", () => {
    const sorted = sortSearchAdRuleCriteria([
      createCriteria("criteria-stickersee-shopping", "stickersee", "shopping_search"),
      createCriteria("criteria-coffeeprint-powerlink", "coffeeprint", "powerlink"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["criteria-coffeeprint-powerlink", "criteria-stickersee-shopping"]);
  });

  it("잘못된 기간은 저장 전에 막는다", () => {
    expect(() =>
      normalizeSearchAdRuleCriteriaInput({
        id: "criteria-coffeeprint-powerlink",
        brandKey: "coffeeprint",
        adProductType: "powerlink",
        periodDays: "0",
        minImpressions: "100",
        minClicks: "10",
        minCost: "10000",
        targetCpa: "25000",
        targetRoas: "250",
        enabled: true,
      }),
    ).toThrow("기준 기간");
  });
});

function createCriteria(id: string, brandKey: "coffeeprint" | "stickersee", adProductType: "powerlink" | "shopping_search") {
  return {
    adProductType,
    brandKey,
    enabled: true,
    id,
    minClicks: 10,
    minCost: 10000,
    minImpressions: 100,
    periodDays: 30,
    targetCpa: 25000,
    targetRoas: 250,
  };
}
