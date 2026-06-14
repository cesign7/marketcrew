import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioShell,
  getProductImageStudioNavItems,
} from "@/components/product-image-studio/ProductImageStudioShell";

const EXPECTED_NAV_ITEMS = [
  { href: "/product-image-studio", label: "홈" },
  { href: "/product-image-studio/ai-tools", label: "AI 도구" },
  { href: "/product-image-studio/batch", label: "일괄처리" },
  { href: "/product-image-studio/activity", label: "활동" },
  { href: "/product-image-studio/designs", label: "디자인" },
  { href: "/product-image-studio/templates", label: "템플릿" },
  { href: "/product-image-studio/uploads", label: "업로드" },
  { href: "/product-image-studio/usage", label: "사용량" },
  { href: "/product-image-studio/settings", label: "환경설정" },
] as const;

describe("product image studio shell", () => {
  it("renders grouped workspace navigation without old primary labels or unrelated brand text", () => {
    // Given: the product image workspace shell is rendered for the home route.
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

    // Then: the workspace chrome exposes the requested Korean IA and no unrelated product copy.
    expect(html).toContain("상품 이미지 스튜디오");
    expect(html).toContain("마켓크루");
    expect(html).toContain("작업");
    expect(html).toContain("내 콘텐츠");
    expect(html).toContain("관리");
    for (const item of EXPECTED_NAV_ITEMS) {
      expect(html).toContain(item.label);
    }
    expect(html).toMatch(/aria-label="상품 이미지 스튜디오 메뉴"[\s\S]*<strong>디자인<\/strong>/);
    expect(html).toMatch(/aria-label="상품 이미지 스튜디오 메뉴"[\s\S]*<strong>활동<\/strong>/);
    expect(html).not.toMatch(/<strong>프로젝트<\/strong>|<strong>결과<\/strong>/);
    expect(html).toContain("상품명, 디자인, 생성 항목 검색");
    expect(html).not.toContain("상품명, 프로젝트, 생성 결과 검색");
    expect(html).toContain("새 상품컷");
    expect(html).toContain('href="/product-image-studio/ai-tools/product-staging"');
    expect(html).toContain("카드 세트 프로젝트");
    expect(html).not.toContain("side-nav");
    expect(html).not.toContain("네이버 검색광고");
    expect(html).not.toContain("Lovable");
    expect(html).not.toContain("Photoroom");
    expect(html).not.toContain("Vercel");
    expect(html).not.toContain("브랜드");
    expect(html).not.toContain("광고유형");
  });

  it("renders workspace switcher, usage badge, notification, and account controls", () => {
    // Given: the product image workspace shell is rendered for a management route.
    const html = renderToStaticMarkup(
      createElement(
        ProductImageStudioShell,
        {
          activePath: "/product-image-studio/usage",
          children: createElement("section", null, "사용량 본문"),
          description: "이번 달 생성 흐름을 확인합니다.",
          title: "사용량",
        },
      ),
    );

    // Then: the static shell frame exposes the compact workspace controls requested for Todo 5.
    expect(html).toContain('aria-label="작업공간 전환"');
    expect(html).toContain("인쇄물 상품컷");
    expect(html).toContain("이번 달 사용량");
    expect(html).toContain("24 / 100장");
    expect(html).toContain('aria-label="알림"');
    expect(html).toContain("운영 계정");
    expect(html).toContain("관리자");
    expect(html).toContain("로그아웃");
  });

  it("keeps workspace navigation in the requested flattened order", () => {
    // Given: tests need a stable public navigation contract.
    const navItems = getProductImageStudioNavItems();

    // Then: all nine labels are returned in the exact requested order.
    expect(navItems).toEqual(EXPECTED_NAV_ITEMS);
  });

  it("marks the deepest matching studio navigation item as active", () => {
    // Given: a nested design detail path is active.
    const html = renderToStaticMarkup(
      createElement(
        ProductImageStudioShell,
        {
          activePath: "/product-image-studio/designs/design-1",
          children: createElement("section", null, "디자인 상세"),
          description: "디자인 결과를 확인합니다.",
          title: "디자인",
        },
      ),
    );

    // Then: the deepest matching design link is current, not the home link.
    expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/designs"/);
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/product-image-studio"/);
  });

  it("keeps nested page stacks full width inside the studio workspace", () => {
    // Given: the shell CSS is the layout contract for nested route content.
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioShell.module.css"),
      "utf8",
    );

    // Then: nested stacks can fill the content well.
    expect(css).toContain(".workspace :global(.page-stack)");
    expect(css).toContain("width: 100%;");
    expect(css).toContain(".sidebar");
    expect(css).toContain(".topBar");
    expect(css).toContain(".contentWell");
    expect(css).toContain("overflow-x: auto;");
    expect(css).toContain(".navGroup { display: contents; }");
  });

  it("keeps shell design tokens neutral with the single blue accent", () => {
    // Given: the shell CSS defines the product image workspace visual system.
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioShell.module.css"),
      "utf8",
    );

    // Then: the requested blue token exists and forbidden accent families are absent.
    expect(css).toContain("--studio-blue: #0070f3");
    expect(css).not.toMatch(/lime|mint|purple|orange|#d9ff62|--studio-lime/i);
  });
});
