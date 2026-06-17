import { readFileSync, readdirSync } from "node:fs";
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
  { href: "/product-image-studio/templates", label: "상품템플릿" },
  { href: "/product-image-studio/uploads", label: "업로드" },
  { href: "/product-image-studio/library", label: "라이브러리" },
  { href: "/product-image-studio/results", label: "결과 보관함" },
  { href: "/product-image-studio/usage", label: "사용량" },
  { href: "/product-image-studio/invite", label: "회원초대" },
  { href: "/product-image-studio/settings", label: "환경설정" },
] as const;

const OBSOLETE_PRIMARY_NAV_LABELS = ["활동", "디자인", "템플릿", "상품 규격"] as const;

const SHELL_CSS_MODULE_PATTERN = /^ProductImageStudioShell(?:[A-Za-z]+)?\.module\.css$/;
const SHELL_CSS_MODULE_MAX_PURE_LOC = 250;
const PRODUCT_IMAGE_STUDIO_COMPONENT_DIR = join(process.cwd(), "src/components/product-image-studio");

describe("product image studio shell", () => {
  it("renders approved workspace navigation without old primary labels or unrelated brand text", () => {
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
    const linkSummaries = getShellLinkSummaries(html);
    expect(linkSummaries).toEqual(EXPECTED_NAV_ITEMS);
    for (const label of OBSOLETE_PRIMARY_NAV_LABELS) {
      expect(linkSummaries.map((item) => item.label)).not.toContain(label);
    }
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

    // Then: all visible labels are returned in the exact requested order.
    expect(navItems).toEqual(EXPECTED_NAV_ITEMS);
  });

  it("marks legacy archive paths under the visible result archive item", () => {
    // Given: a nested legacy design detail path is active.
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

    // Then: the visible result archive link is current, not the home link.
    expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/results"/);
    expect(html).not.toMatch(/aria-current="page"[^>]*href="\/product-image-studio"/);
  });

  it("keeps nested page stacks full width inside the studio workspace", () => {
    // Given: the shell CSS is the layout contract for nested route content.
    const css = readShellCssModules();

    // Then: nested stacks can fill the content well.
    expect(css).toContain(".workspace :global(.page-stack)");
    expect(css).toContain("width: 100%;");
    expect(css).toContain(".sidebar");
    expect(css).toContain(".topBar");
    expect(css).toContain(".contentWell");
    expect(css).toContain("overflow-x: auto;");
    expect(css).toMatch(/\.navGroup\s*{\s*display:\s*contents;/);
  });

  it("keeps shell design tokens neutral with the single blue accent", () => {
    // Given: the shell CSS defines the product image workspace visual system.
    const css = readShellCssModules();

    // Then: the requested blue token exists and forbidden accent families are absent.
    expect(css).toContain("--studio-blue: #0070f3");
    expect(css).not.toMatch(/lime|mint|purple|orange|#d9ff62|--studio-lime/i);
  });

  it("keeps every hand-edited shell CSS module under the pure LOC ceiling", () => {
    // Given: shell CSS is split by responsibility instead of growing one oversized module.
    const shellCssModuleFiles = getShellCssModuleFiles();

    // Then: every shell CSS module stays below the architectural ceiling.
    expect(shellCssModuleFiles).toContain("ProductImageStudioShell.module.css");
    for (const fileName of shellCssModuleFiles) {
      const css = readFileSync(join(PRODUCT_IMAGE_STUDIO_COMPONENT_DIR, fileName), "utf8");
      expect(countPureLoc(css), fileName).toBeLessThanOrEqual(SHELL_CSS_MODULE_MAX_PURE_LOC);
    }
  });
});

function readShellCssModules(): string {
  return getShellCssModuleFiles()
    .map((fileName) => readFileSync(join(PRODUCT_IMAGE_STUDIO_COMPONENT_DIR, fileName), "utf8"))
    .join("\n");
}

function getShellCssModuleFiles(): readonly string[] {
  return readdirSync(PRODUCT_IMAGE_STUDIO_COMPONENT_DIR)
    .filter((fileName) => SHELL_CSS_MODULE_PATTERN.test(fileName))
    .sort();
}

function countPureLoc(source: string): number {
  return source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("/*") && !trimmed.startsWith("*") && !trimmed.startsWith("//");
    }).length;
}

function getShellLinkSummaries(html: string): readonly { readonly href: string; readonly label: string }[] {
  return Array.from(html.matchAll(/<a[^>]*href="([^"]+)"[\s\S]*?<strong>([^<]+)<\/strong>/g)).map((match) => ({
    href: match[1] ?? "",
    label: match[2] ?? "",
  }));
}
