import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioProductSpecsWorkspacePage } from "@/components/product-image-studio/ProductImageStudioSpecLibrary";
import {
  createProductImageStudioSpecItem,
  createProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";

describe("product image studio product spec library UI", () => {
  it("renders individual product specs and spec sets with an icon-first creation flow", () => {
    const foldedCard = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:00:00.000Z",
      foldedSizeMm: { height: 150, width: 100 },
      foldDirection: "left_fold",
      id: "spec-folded-card",
      name: "A6 접이식 카드",
      openSizeMm: { height: 150, width: 200 },
      type: "folded_card",
    });
    const envelope = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:01:00.000Z",
      flapDirection: "top_flap",
      flapStyle: "jacket",
      id: "spec-envelope",
      name: "A6 자켓 봉투",
      sizeMm: { height: 160, width: 180 },
      type: "envelope",
    });
    const set = createProductImageStudioSpecSet({
      createdAt: "2026-06-12T00:02:00.000Z",
      id: "set-new-year",
      itemIds: [foldedCard.id, envelope.id],
      name: "연하장 세트",
    });

    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProductSpecsWorkspacePage, {
        initialItems: [foldedCard, envelope],
        initialSets: [set],
      }),
    );

    expect(html).toContain("상품 규격");
    expect(html).toContain("개별 규격");
    expect(html).toContain("세트 규격");
    expect(html).toContain("용지·재질");
    expect(html).toContain("아이콘으로 규격 추가");
    expect(html).toContain("규격 이름");
    expect(html).toContain("엽서(비접이)");
    expect(html).toContain("카드(접이식)");
    expect(html).toContain("봉투");
    expect(html).toContain("스티커");
    expect(html).toContain("명함");
    expect(html).toContain("접은 카드 가로(mm)");
    expect(html).not.toContain("종이 표면");
    expect(html).not.toContain("용지 두께(gsm)");
    expect(html).toContain("저장된 개별 규격");
    expect(html).toContain("A6 접이식 카드");
    expect(html).toContain("A6 자켓 봉투");
    expect(html).toContain("100 x 150mm");
    expect(html).toContain("규격 저장");
    expect(html).not.toContain("규격 저장/불러오기");

    const setHtml = renderToStaticMarkup(
      createElement(ProductImageStudioProductSpecsWorkspacePage, {
        initialActiveTab: "sets",
        initialItems: [foldedCard, envelope],
        initialSets: [set],
      }),
    );

    expect(setHtml).toContain("세트 만들기");
    expect(setHtml).toContain("저장된 세트");
    expect(setHtml).toContain("연하장 세트");
    expect(setHtml).toContain("카드(접이식) + 봉투");
  });
});
