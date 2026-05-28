import { describe, expect, it } from "vitest";
import { extractSearchAdAdExtensionEvidence, getSearchAdAdExtensionTypeLabel } from "@/features/search-ad/domain/adExtensionEvidence";

describe("search ad ad extension evidence", () => {
  it("네이버 확장소재 종류를 한국어로 보여준다", () => {
    expect(getSearchAdAdExtensionTypeLabel("SHOPPING_EXTRA")).toBe("쇼핑 부가정보");
    expect(getSearchAdAdExtensionTypeLabel("TALK")).toBe("네이버 톡톡");
  });

  it("확장소재 내용이 없으면 종류와 짧은 고유번호로 구분한다", () => {
    expect(
      extractSearchAdAdExtensionEvidence({
        nccAdExtensionId: "ext-a001-02-000000124735420",
        type: "SHOPPING_EXTRA",
        adExtension: null,
      }),
    ).toMatchObject({
      extensionDisplayLabel: "쇼핑 부가정보 · 고유번호 735420",
      extensionLabel: "쇼핑 부가정보",
      extensionShortId: "고유번호 735420",
      extensionTypeLabel: "쇼핑 부가정보",
    });
  });

  it("확장소재 문구가 있으면 종류와 문구를 함께 보여준다", () => {
    expect(
      extractSearchAdAdExtensionEvidence({
        nccAdExtensionId: "ext-a001-02-000000137987291",
        type: "DESCRIPTION",
        adExtension: JSON.stringify({ description: "오늘 주문 가능" }),
      }),
    ).toMatchObject({
      extensionContentLabel: "오늘 주문 가능",
      extensionDisplayLabel: "설명 확장 · 오늘 주문 가능",
      extensionLabel: "오늘 주문 가능",
    });
  });
});
