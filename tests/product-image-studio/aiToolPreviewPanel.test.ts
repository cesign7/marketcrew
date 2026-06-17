import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findProductImageStudioAiTool } from "@/components/product-image-studio/ProductImageStudioAiToolLookup";
import { ProductImageStudioAiToolPreviewPanel } from "@/components/product-image-studio/ProductImageStudioAiToolPreviewPanel";
import type { ProductImageStudioImageGeneratorResultPreview } from "@/features/product-image-studio/client/imageGeneratorApi";

describe("product image studio AI tool preview panel", () => {
  it("names generated preview, image download, and SVG download actions in Korean", () => {
    // Given: the API returned every generated-result URL.
    const html = renderGeneratedPreviewPanel("ready", "생성 이미지가 준비되었습니다.");

    // Then: the generated result is separate from uploads and exposes explicit Korean action names.
    expect(html).toContain("생성 미리보기");
    expect(html).toContain("이미지 다운로드");
    expect(html).toContain("SVG 다운로드");
    expect(html).toContain('data-ai-tool-generated-download="true"');
    expect(html).toContain('data-ai-tool-generated-vector="true"');
  });

  it("keeps the partial-result message visible next to generated cards", () => {
    // Given: the provider returned only part of the requested result set.
    const html = renderGeneratedPreviewPanel("partial", "일부 이미지만 준비되었습니다.");

    // Then: the panel does not flatten partial output into a normal ready state.
    expect(html).toContain("일부 완료");
    expect(html).toContain("일부 이미지만 준비되었습니다.");
  });
});

function renderGeneratedPreviewPanel(phase: "partial" | "ready", message: string): string {
  const tool = findProductImageStudioAiTool("image-generator");
  if (tool === null) {
    throw new Error("AI image generator fixture is missing.");
  }

  return renderToStaticMarkup(
    createElement(ProductImageStudioAiToolPreviewPanel, {
      countLabel: "2컷",
      generatedResults: [generatedResult()],
      message,
      phase,
      quality: "1k",
      ratioLabel: "정사각형 1:1",
      ratioValue: "1:1",
      tool,
      uploadedCount: 0,
    }),
  );
}

function generatedResult(): ProductImageStudioImageGeneratorResultPreview {
  return {
    downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
    generationRequestId: "generation-1",
    id: "result-1",
    label: "AI 생성 이미지",
    previewUrl: "/api/product-image-studio/projects/project-1/results/result-1/preview.png",
    ratio: "1:1",
    vectorSvgUrl: "/api/product-image-studio/projects/project-1/results/result-1/vector.svg",
  };
}
