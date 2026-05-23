import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductGrowthOpportunityPanel } from "../../src/components/agenda-room/ProductGrowthOpportunityPanel";
import type { ProductGrowthOpportunityView } from "../../src/features/agenda-room/types";

describe("ProductGrowthOpportunityPanel", () => {
  it("상품 이미지를 먼저 보여주고 긴 상품명은 짧게 접되 전체 이름을 hover 정보로 보관한다", () => {
    const html = renderToString(createElement(ProductGrowthOpportunityPanel, { opportunities: [buildOpportunity()] }));

    expect(html).toContain("product-opportunity-thumb");
    expect(html).toContain('src="https://cdn.example.test/products/long-sticker.jpg"');
    expect(html).toContain('alt="생일축하스티커 상품 이미지"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('title="생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품 키워드 확장 후보"');
    expect(html).toContain(">생일축하스티커 감사 문구 맞춤 제작형 스마트스토어...<");
    expect(html).toContain('title="생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품"');
    expect(html).toContain(">생일축하스티커 감사 문구 맞춤...<");
    expect(html).toContain('title="생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품 추천 키워드"');
    expect(html).toContain(">생일축하스티커 감사 문구 맞춤 제...<");
    expect(html).toContain('title="대표 상품 생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품"');
    expect(html).toContain(">대표 상품 생일축하스티커 감사 문구 맞춤 제...<");
    expect(html).toContain("product-opportunity-title-popover");
  });
});

function buildOpportunity(): ProductGrowthOpportunityView {
  return {
    id: "product-growth-long-title",
    owner: "그로",
    kindLabel: "키워드 확장",
    confidenceLabel: "승인 가능",
    title: "생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품 키워드 확장 후보",
    targetLabel: "생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품",
    productImageUrl: "https://cdn.example.test/products/long-sticker.jpg",
    productImageAlt: "생일축하스티커 상품 이미지",
    summary: "상위 판매 상품과 검색광고 키워드를 연결한 후보입니다.",
    keywords: ["생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품 추천 키워드", "감사 문구 스티커"],
    evidenceLabels: ["스마트스토어 주문 100건", "대표 상품 생일축하스티커 감사 문구 맞춤 제작형 스마트스토어 상품"],
    nextAction: "그로가 검색광고 키워드 초안을 작성",
    guardrail: "외부 반영 잠금 전까지 차단",
    sourceReportIds: ["연동 수집 기록 1"],
  };
}
