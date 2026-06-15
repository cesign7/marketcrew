import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiToolsPage from "@/app/product-image-studio/ai-tools/page";
import ProductStagingPage from "@/app/product-image-studio/ai-tools/product-staging/page";

const TOOL_NAMES = [
  "상품 설정샷 생성",
  "AI 이미지 생성기",
  "배경/소품 생성",
  "비율 변경",
  "비슷한 이미지 생성",
  "목업 합성",
  "상세페이지 이미지 블록 생성",
] as const;

const DISABLED_TOOL_IDS = [
  "background-props",
  "ratio-resize",
  "similar-image",
  "mockup-composite",
  "detail-page-blocks",
] as const;

describe("product image studio AI tools routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders seven AI tool cards with product staging and image generator enabled", () => {
    // Given: the AI tools hub is the entry point for image creation tools.
    const html = renderToStaticMarkup(createElement(AiToolsPage));

    // Then: all planned tools are visible in Korean, with only ready tools linked.
    expect(countOccurrences(html, "data-ai-tool-card=")).toBe(7);
    expect(html).toContain("7개 도구");
    for (const toolName of TOOL_NAMES) {
      expect(html).toContain(toolName);
    }
    expect(html).toContain('data-ai-tool-card="product-staging"');
    expect(html).toContain('href="/product-image-studio/ai-tools/product-staging"');
    expect(extractToolCardHtml(html, "product-staging")).toContain("바로 시작");
    expect(extractToolCardHtml(html, "product-staging")).not.toContain('aria-disabled="true"');
    expect(html).toContain('data-ai-tool-card="image-generator"');
    expect(html).toContain('href="/product-image-studio/ai-tools/image-generator"');
    expect(extractToolCardHtml(html, "image-generator")).toContain("바로 시작");
    expect(extractToolCardHtml(html, "image-generator")).not.toContain('aria-disabled="true"');

    for (const toolId of DISABLED_TOOL_IDS) {
      const cardHtml = extractToolCardHtml(html, toolId);
      expect(cardHtml).toContain("준비 중");
      expect(cardHtml).toContain('aria-disabled="true"');
      expect(cardHtml).not.toContain("href=");
    }
  });

  it("renders the product staging route with the existing wizard and provider status", async () => {
    // Given: local route rendering must not call remote provider settings during the test.
    vi.stubEnv("MARKETCREW_API_BASE_URL", "");
    vi.stubEnv("MARKETCREW_API_TOKEN", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");

    // When: the product staging tool route is rendered.
    const html = renderToStaticMarkup(await ProductStagingPage());

    // Then: the page reuses the existing status panel and wizard surface.
    expect(html).toContain("상품 설정샷 생성");
    expect(html).toContain("작업 상태");
    expect(html).toContain('data-status-badge="generation"');
    expect(html).toContain('data-status-badge="provider"');
    expect(html).toContain('aria-label="상품 이미지 프로젝트 위저드"');
    expect(html).toContain("프로젝트 이름");
    expect(html).toContain("콘셉트 추천");
    expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/ai-tools"/);
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("GEMINI_API_KEY");
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
  });
});

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function extractToolCardHtml(html: string, toolId: string): string {
  const marker = `data-ai-tool-card="${toolId}"`;
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextStart = html.indexOf('data-ai-tool-card="', start + marker.length);
  return nextStart === -1 ? html.slice(start) : html.slice(start, nextStart);
}
