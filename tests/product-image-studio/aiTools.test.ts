import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiToolsPage from "@/app/product-image-studio/ai-tools/page";
import ProductStagingPage from "@/app/product-image-studio/ai-tools/product-staging/page";
import { ProductImageStudioAiToolsHub } from "@/components/product-image-studio/ProductImageStudioAiTools";

const TOOL_NAMES = [
  "상품 설정샷 생성",
  "AI 이미지 생성기",
  "SVG 변환",
  "배경/소품 생성",
  "비율 변경",
  "비슷한 이미지 생성",
  "목업 합성",
  "상세 이미지 블록",
] as const;

const TOOL_IDS = [
  "product-staging",
  "image-generator",
  "svg-conversion",
  "background-props",
  "ratio-resize",
  "similar-image",
  "mockup-composite",
  "detail-page-blocks",
] as const;

const RUNNABLE_TOOL_IDS = ["product-staging", "image-generator", "svg-conversion"] as const;
const PLANNED_TOOL_IDS = ["background-props", "ratio-resize", "similar-image", "mockup-composite", "detail-page-blocks"] as const;

describe("product image studio AI tools routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders eight modal-first AI tool cards with hydration-gated buttons", () => {
    // Given: the AI tools hub is the entry point for image creation tools.
    const html = renderToStaticMarkup(createElement(AiToolsPage));

    // Then: all planned tools are visible in Korean and every card opens a modal before navigation.
    expect(countOccurrences(html, "data-ai-tool-card=")).toBe(8);
    expect(html).toContain("8개 도구");
    expect(html).toContain('data-ai-tool-hydrated="false"');
    expect(html).not.toContain("상세페이지 이미지 블록 생성");
    for (const toolName of TOOL_NAMES) {
      expect(html).toContain(toolName);
    }
    expect(html).toContain('data-saas-card-grid="true"');
    expect(countOccurrences(html, 'data-saas-action-card="')).toBe(8);
    for (const toolId of RUNNABLE_TOOL_IDS) {
      const cardHtml = extractToolCardHtml(html, toolId);
      expect(cardHtml).toContain('data-ai-tool-card-ready="false"');
      expect(cardHtml).toContain('data-ai-tool-state="modal"');
      expect(cardHtml).toContain("disabled");
      expect(cardHtml).toContain("열기");
      expect(cardHtml).not.toContain('aria-disabled="true"');
      expect(cardHtml).not.toContain("href=");
    }
    for (const toolId of PLANNED_TOOL_IDS) {
      const cardHtml = extractToolCardHtml(html, toolId);
      expect(cardHtml).toContain('data-ai-tool-card-ready="false"');
      expect(cardHtml).toContain('data-ai-tool-state="planned"');
      expect(cardHtml).toContain("disabled");
      expect(cardHtml).toContain("준비 중");
      expect(cardHtml).not.toContain("href=");
    }

    const detailBlocksCardHtml = extractToolCardHtml(html, "detail-page-blocks");
    expect(detailBlocksCardHtml).toContain("상세 이미지 블록");
    expect(countKoreanCharacters("상세 이미지 블록")).toBeLessThanOrEqual(7);
  });

  it("keeps card buttons briefly disabled until client handlers are hydrated", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioAiToolsHub));
    const svgCardHtml = extractToolCardHtml(html, "svg-conversion");

    expect(html).toContain('data-ai-tool-hydrated="false"');
    expect(svgCardHtml).toContain('data-ai-tool-card-ready="false"');
    expect(svgCardHtml).toContain('aria-label="SVG 변환 열기"');
    expect(svgCardHtml).toContain("disabled");
    expect(svgCardHtml).not.toContain('aria-disabled="true"');
  });

  it("opens runnable tools in the shared in-modal workspace without page navigation links", () => {
    for (const toolId of RUNNABLE_TOOL_IDS) {
      const html = renderToStaticMarkup(createElement(ProductImageStudioAiToolsHub, { initialToolId: toolId }));

      expect(html, toolId).toContain('role="dialog"');
      expect(html, toolId).toContain('data-ai-tool-background="true"');
      expect(html, toolId).toContain('aria-hidden="true"');
      expect(html, toolId).toContain("inert");
      expect(html, toolId).toContain('data-ai-tool-workspace="true"');
      expect(html, toolId).toContain('data-ai-tool-result-panel="true"');
      expect(html, toolId).toContain("오른쪽 미리보기");
      expect(html, toolId).toContain("업로드하면 이 영역에서 바로 확인합니다.");
      expect(html, toolId).not.toContain("작업 화면 열기");
      expect(html, toolId).not.toContain('href="/product-image-studio/ai-tools/product-staging"');
      expect(html, toolId).not.toContain('href="/product-image-studio/ai-tools/image-generator"');
    }
  });

  it("opens route-like generation tools with shared prompt, quality, size, and count controls", () => {
    const productStagingHtml = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, { initialToolId: "product-staging" }),
    );
    const imageGeneratorHtml = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, { initialToolId: "image-generator" }),
    );

    expect(productStagingHtml).toContain("상품 설정샷 생성");
    expect(productStagingHtml).toContain("프롬프트");
    expect(productStagingHtml).toContain("추가 지시");
    expect(productStagingHtml).toContain("모델");
    expect(productStagingHtml).toContain('data-ai-tool-size-trigger="true"');
    expect(productStagingHtml).toContain('data-ai-tool-quality-trigger="true"');
    expect(productStagingHtml).toContain("정사각형 1:1");
    expect(productStagingHtml).toContain("1k");
    expect(productStagingHtml).toContain("4컷");
    expect(productStagingHtml).not.toContain("8컷");
    expect(productStagingHtml).toContain('data-ai-tool-choice-group="product-kind"');
    expect(productStagingHtml).toContain('data-ai-tool-choice-group="scene-style"');
    expect(productStagingHtml).toContain("소품 밀도");
    expect(productStagingHtml).not.toContain('aria-label="AI 작업 선택"');

    expect(imageGeneratorHtml).toContain("AI 이미지 생성기");
    expect(imageGeneratorHtml).toContain("프롬프트");
    expect(imageGeneratorHtml).toContain("추가 지시");
    expect(imageGeneratorHtml).toContain("모델");
    expect(imageGeneratorHtml).toContain('data-ai-tool-size-trigger="true"');
    expect(imageGeneratorHtml).toContain('data-ai-tool-quality-trigger="true"');
    expect(imageGeneratorHtml).toContain("2컷");
    expect(imageGeneratorHtml).toContain("4컷");
    expect(imageGeneratorHtml).not.toContain("8컷");
    expect(imageGeneratorHtml).toContain('data-ai-tool-choice-group="image-type"');
    expect(imageGeneratorHtml).toContain('data-ai-tool-choice-group="render-style"');
  });

  it("renders real tool-specific upload inputs and a large size preview surface", () => {
    const productStagingHtml = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, { initialToolId: "product-staging" }),
    );
    const imageGeneratorHtml = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, { initialToolId: "image-generator" }),
    );

    expect(productStagingHtml).toContain('data-ai-tool-upload-slot="card-design"');
    expect(productStagingHtml).toContain('data-ai-tool-upload-input="card-design"');
    expect(productStagingHtml).toContain('type="file"');
    expect(productStagingHtml).toContain("카드 디자인");
    expect(productStagingHtml).toContain("봉투 디자인");
    expect(productStagingHtml).toContain("봉합스티커");
    expect(productStagingHtml).toContain('data-ai-tool-size-preview="true"');
    expect(productStagingHtml).toContain('data-ai-tool-size-preview-frame="true"');
    expect(productStagingHtml).toContain('data-output-ratio="1:1"');

    expect(imageGeneratorHtml).toContain('data-ai-tool-upload-slot="reference-image"');
    expect(imageGeneratorHtml).toContain('data-ai-tool-upload-input="reference-image"');
    expect(imageGeneratorHtml).toContain("참고 이미지");
    expect(imageGeneratorHtml).not.toContain('data-ai-tool-upload-slot="envelope-design"');
  });

  it("keeps future tool cards visible but out of fake generation workflows", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioAiToolsHub, { initialToolId: "background-props" }));
    const dialogHtml = extractDialogHtml(html);

    expect(dialogHtml).toContain('role="dialog"');
    expect(dialogHtml).toContain("배경/소품 생성");
    expect(dialogHtml).toContain("준비 중");
    expect(dialogHtml).toContain("워크플로를 곧 연결할 예정입니다.");
    expect(dialogHtml).not.toContain('data-ai-tool-workspace="true"');
    expect(dialogHtml).not.toContain("프롬프트");
    expect(dialogHtml).not.toContain("추가 지시");
    expect(dialogHtml).not.toContain("생성하기");
    expect(dialogHtml).not.toContain("작업 계획 저장");
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

function extractDialogHtml(html: string): string {
  const roleStart = html.indexOf('role="dialog"');
  expect(roleStart).toBeGreaterThanOrEqual(0);

  const dialogStart = html.lastIndexOf("<section", roleStart);
  expect(dialogStart).toBeGreaterThanOrEqual(0);
  return html.slice(dialogStart);
}

function countKoreanCharacters(value: string): number {
  return Array.from(value.replaceAll(" ", "")).length;
}
