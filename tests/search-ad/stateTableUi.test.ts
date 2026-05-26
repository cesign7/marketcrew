import { describe, expect, it } from "vitest";
import {
  buildStateTogglePreviewRequest,
  getSearchAdStateSortHeaders,
  getStateTableTargetLabel,
  getStateToggleAriaLabel,
} from "@/components/search-ad/SearchAdStateTable";
import type { SearchAdStateRecord } from "@/features/search-ad/domain/types";

describe("search ad state table UI helpers", () => {
  it("캠페인 토글은 캠페인 대상 미리보기 요청과 캠페인 문구를 만든다", () => {
    const record = stateRecord({
      name: "스티커씨_파워링크",
      providerId: "cmp-a001",
      targetType: "campaign",
      userLock: false,
    });

    expect(buildStateTogglePreviewRequest(record, "campaign")).toEqual({
      requestedAction: "turn_off",
      targetId: "cmp-a001",
      targetType: "campaign",
    });
    expect(getStateToggleAriaLabel(record, "campaign")).toBe("스티커씨_파워링크 캠페인 끄기");
    expect(getStateTableTargetLabel("campaign")).toBe("캠페인");
  });

  it("상태 테이블은 광고그룹과 같은 정렬 헤더를 제공한다", () => {
    expect(getSearchAdStateSortHeaders().map((header) => header.label)).toEqual([
      "이름",
      "브랜드",
      "광고유형",
      "현재 상태",
      "입찰",
      "일예산",
      "수집 시간",
    ]);
  });
});

function stateRecord(overrides: Partial<SearchAdStateRecord>): SearchAdStateRecord {
  return {
    adProductType: "powerlink",
    brandKey: "stickersee",
    collectedAt: "2026-05-26T08:00:00+09:00",
    id: "state",
    name: "운영 단위",
    providerId: "provider-state",
    targetType: "adgroup",
    userLock: false,
    ...overrides,
  };
}
