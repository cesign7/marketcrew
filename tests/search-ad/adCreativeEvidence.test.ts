import { describe, expect, it } from "vitest";
import { extractSearchAdProductEvidence } from "@/features/search-ad/domain/adCreativeEvidence";

describe("extractSearchAdProductEvidence", () => {
  it("쇼핑검색 광고 원문에서 상품명, 대표 이미지, 스토어 정보를 추출한다", () => {
    const evidence = extractSearchAdProductEvidence({
      ad: {},
      referenceData: {
        imageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
        mallName: "모카프린트",
        mallProductId: "6985720295",
        productName: "1406 추석선물카드 감사 명절연하인사카드",
        productTitle: "1406 추석선물카드 감사 명절연하인사카드",
      },
    });

    expect(evidence).toEqual({
      productName: "1406 추석선물카드 감사 명절연하인사카드",
      productImageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
      mallName: "모카프린트",
      mallProductId: "6985720295",
    });
  });

  it("이미지 URL 후보가 없어도 상품명은 보존한다", () => {
    expect(
      extractSearchAdProductEvidence({
        ad: {
          productName: "생일 스티커",
        },
      }),
    ).toEqual({
      productName: "생일 스티커",
      productImageUrl: undefined,
      mallName: undefined,
      mallProductId: undefined,
    });
  });
});
