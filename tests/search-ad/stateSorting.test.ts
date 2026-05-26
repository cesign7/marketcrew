import { describe, expect, it } from "vitest";
import { sortSearchAdStateRecords } from "@/features/search-ad/domain/stateSorting";
import type { SearchAdStateRecord } from "@/features/search-ad/domain/types";

describe("search ad state sorting", () => {
  it("기본 정렬은 브랜드, 광고유형, 이름 오름차순이다", () => {
    const sorted = sortSearchAdStateRecords([
      stateRecord({ id: "3", brandKey: "stickersee", adProductType: "shopping_search", name: "ㄴ 쇼핑" }),
      stateRecord({ id: "1", brandKey: "coffeeprint", adProductType: "powerlink", name: "ㄷ 파워" }),
      stateRecord({ id: "2", brandKey: "coffeeprint", adProductType: "powerlink", name: "ㄱ 파워" }),
      stateRecord({ id: "4", brandKey: "stickersee", adProductType: "powerlink", name: "ㄴ 파워" }),
    ]);

    expect(sorted.map((record) => record.id)).toEqual(["2", "1", "4", "3"]);
  });

  it("이름 헤더를 누르면 이름 기준으로 정렬할 수 있다", () => {
    const sorted = sortSearchAdStateRecords(
      [
        stateRecord({ id: "1", name: "가 광고그룹" }),
        stateRecord({ id: "2", name: "다 광고그룹" }),
        stateRecord({ id: "3", name: "나 광고그룹" }),
      ],
      { key: "name", direction: "desc" },
    );

    expect(sorted.map((record) => record.id)).toEqual(["2", "3", "1"]);
  });
});

function stateRecord(overrides: Partial<SearchAdStateRecord>): SearchAdStateRecord {
  return {
    id: "state",
    targetType: "adgroup",
    providerId: "grp-state",
    brandKey: "stickersee",
    adProductType: "powerlink",
    name: "광고그룹",
    userLock: false,
    collectedAt: "2026-05-26T08:00:00+09:00",
    ...overrides,
  };
}
