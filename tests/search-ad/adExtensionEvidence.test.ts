import { describe, expect, it } from "vitest";
import { extractSearchAdAdExtensionEvidence, getSearchAdAdExtensionTypeLabel } from "@/features/search-ad/domain/adExtensionEvidence";

describe("search ad ad extension evidence", () => {
  it("네이버 확장소재 종류를 한국어로 보여준다", () => {
    expect(getSearchAdAdExtensionTypeLabel("SHOPPING_EXTRA")).toBe("쇼핑 부가정보");
    expect(getSearchAdAdExtensionTypeLabel("POWER_LINK_IMAGE")).toBe("파워링크 이미지");
    expect(getSearchAdAdExtensionTypeLabel("IMAGE_SUB_LINKS")).toBe("이미지 추가 링크");
    expect(getSearchAdAdExtensionTypeLabel("TALK")).toBe("네이버 톡톡");
  });

  it("확장소재 내용이 없으면 화면 라벨에는 종류만 보여주고 고유번호는 별도 값으로 남긴다", () => {
    expect(
      extractSearchAdAdExtensionEvidence({
        nccAdExtensionId: "ext-a001-02-000000124735420",
        type: "SHOPPING_EXTRA",
        adExtension: null,
      }),
    ).toMatchObject({
      extensionDisplayLabel: "쇼핑 부가정보",
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

  it("파워링크 이미지 확장소재는 원문 경로 대신 이미지 소재로 보여준다", () => {
    expect(
      extractSearchAdAdExtensionEvidence({
        nccAdExtensionId: "ext-a001-02-000000157571490",
        type: "POWER_LINK_IMAGE",
        adExtension: JSON.stringify({
          imagePath: "/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
          imageWidth: 214,
          imageHeight: 214,
        }),
      }),
    ).toMatchObject({
      extensionDisplayLabel: "파워링크 이미지 · 이미지 소재 214x214",
      extensionImagePath: "/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
      extensionImageUrl: "https://searchad-phinf.pstatic.net/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
      extensionLabel: "이미지 소재 214x214",
      extensionTypeLabel: "파워링크 이미지",
    });
  });

  it("이미지 추가 링크 확장소재는 배열형 원문에서 이름과 이미지를 함께 뽑는다", () => {
    expect(
      extractSearchAdAdExtensionEvidence({
        nccAdExtensionId: "ext-a001-01-000000315151873",
        type: "IMAGE_SUB_LINKS",
        adExtension: [
          {
            name: "디자인초대장",
            final: "https://coffeeprint.co.kr/shop/list.php?ca_id=3010",
            imagePath: "/MjAyNTA4MjJfOTEg/MDAxNzU1ODQ5NjEzNDUx.jpg",
          },
          {
            name: "사진초대장",
            final: "https://coffeeprint.co.kr/shop/list.php?ca_id=3020",
            imagePath: "/MjAyNTA4MjJfMzgg/MDAxNzU1ODQ5NjEzNDYz.jpg",
          },
        ],
      }),
    ).toMatchObject({
      extensionContentLabel: "디자인초대장",
      extensionDisplayLabel: "이미지 추가 링크 · 디자인초대장",
      extensionImagePath: "/MjAyNTA4MjJfOTEg/MDAxNzU1ODQ5NjEzNDUx.jpg",
      extensionImageUrl: "https://searchad-phinf.pstatic.net/MjAyNTA4MjJfOTEg/MDAxNzU1ODQ5NjEzNDUx.jpg",
      extensionLabel: "디자인초대장",
      extensionTypeLabel: "이미지 추가 링크",
    });
  });
});
