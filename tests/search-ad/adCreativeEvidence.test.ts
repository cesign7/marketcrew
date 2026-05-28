import { describe, expect, it } from "vitest";
import { extractSearchAdProductEvidence, extractSearchAdTextEvidence } from "@/features/search-ad/domain/adCreativeEvidence";

describe("extractSearchAdProductEvidence", () => {
  it("쇼핑검색 광고 원문에서 상품명, 대표 이미지, 스토어 정보를 추출한다", () => {
    const evidence = extractSearchAdProductEvidence({
      ad: {},
      referenceData: {
        imageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
        lowPrice: "2500",
        mallName: "모카프린트",
        mallProductId: "6985720295",
        mobilePrice: "2500",
        productName: "1406 추석선물카드 감사 명절연하인사카드",
        productTitle: "1406 추석선물카드 감사 명절연하인사카드",
        purchaseCnt: "120",
        reviewCountSum: "42",
        scoreInfo: "4.9",
      },
    });

    expect(evidence).toMatchObject({
      productName: "1406 추석선물카드 감사 명절연하인사카드",
      productImageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
      mallName: "모카프린트",
      mallProductId: "6985720295",
      lowPrice: "2500",
      mobilePrice: "2500",
      reviewCountSum: "42",
      purchaseCnt: "120",
      scoreInfo: "4.9",
    });
  });

  it("이미지 URL 후보가 없어도 상품명은 보존한다", () => {
    expect(
      extractSearchAdProductEvidence({
        ad: {
          productName: "생일 스티커",
        },
      }),
    ).toMatchObject({
      productName: "생일 스티커",
      productImageUrl: undefined,
      mallName: undefined,
      mallProductId: undefined,
    });
  });
});

describe("extractSearchAdTextEvidence", () => {
  it("파워링크 광고 원문에서 제목, 설명, 표시 URL을 추출한다", () => {
    const evidence = extractSearchAdTextEvidence({
      type: "TEXT_45",
      ad: {
        headline: "{keyword:추석선물카드} 전문 커피프린트",
        description: "추석선물카드제작! 기업맞춤 컬러로고 무료, 대량할인, 1일배송",
        pc: {
          display: "http://www.coffeeprint.co.kr",
          final: "https://coffeeprint.co.kr/shop/list.php?ca_id=90",
        },
        mobile: {
          display: "http://m.coffeeprint.co.kr",
          final: "https://coffeeprint.co.kr/shop/list.php?ca_id=90",
        },
      },
    });

    expect(evidence).toEqual({
      headline: "{keyword:추석선물카드} 전문 커피프린트",
      description: "추석선물카드제작! 기업맞춤 컬러로고 무료, 대량할인, 1일배송",
      pcDisplayUrl: "http://www.coffeeprint.co.kr",
      mobileDisplayUrl: "http://m.coffeeprint.co.kr",
      adType: "TEXT_45",
    });
  });

  it("중첩 광고 문구가 없으면 원문 상위 필드를 보완값으로 쓴다", () => {
    expect(
      extractSearchAdTextEvidence({
        name: "커피쿠폰 제작",
        description: "대량 주문 가능",
        pcDisplayUrl: "http://coffeeprint.co.kr",
        adType: "TEXT_45",
      }),
    ).toEqual({
      headline: "커피쿠폰 제작",
      description: "대량 주문 가능",
      pcDisplayUrl: "http://coffeeprint.co.kr",
      mobileDisplayUrl: undefined,
      adType: "TEXT_45",
    });
  });
});
