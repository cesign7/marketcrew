import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioShell,
  getProductImageStudioNavItems,
} from "@/components/product-image-studio/ProductImageStudioShell";

describe("product image studio shell", () => {
  it("renders a studio-specific shell without Search Ad filter text", () => {
    const html = renderToStaticMarkup(
      createElement(
        ProductImageStudioShell,
        {
          activePath: "/product-image-studio",
          children: createElement("section", { className: "content-panel" }, "카드 세트 프로젝트"),
          description: "인쇄물 디자인을 상품 사진으로 준비합니다.",
          title: "상품 이미지 스튜디오",
        },
      ),
    );

    expect(html).toContain("상품 이미지 스튜디오");
    expect(html).toContain("마켓크루");
    expect(html).toContain("카드 세트 프로젝트");
    expect(html).not.toContain("네이버 검색광고");
    expect(html).not.toContain("브랜드");
    expect(html).not.toContain("광고유형");
  });

  it("keeps studio navigation separate from Search Ad navigation", () => {
    const navItems = getProductImageStudioNavItems();

    expect(navItems).toEqual([
      { href: "/product-image-studio", label: "스튜디오" },
      { href: "/product-image-studio/projects", label: "프로젝트" },
      { href: "/product-image-studio/results", label: "결과 보관함" },
      { href: "/product-image-studio/settings", label: "이미지 설정" },
    ]);
  });

  it("marks the deepest matching studio navigation item as active", () => {
    const html = renderToStaticMarkup(
      createElement(
        ProductImageStudioShell,
        {
          activePath: "/product-image-studio/projects/project-1",
          children: createElement("section", null, "프로젝트 상세"),
          description: "프로젝트 결과를 확인합니다.",
          title: "프로젝트",
        },
      ),
    );

    expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/projects"/);
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/product-image-studio"/);
  });
});
