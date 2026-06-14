import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioDownloadPanel,
  validateProductImageStudioDownloadDraft,
} from "@/components/product-image-studio/ProductImageStudioDownloadPanel";
import type { ProductImageStudioGenerationResultPreview } from "@/features/product-image-studio/domain/generationWorkflow";

describe("product image studio download UI", () => {
  it("renders ratio presets and keeps downloads disabled before a result exists", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioDownloadPanel, {
        onRegeneratedResult: () => undefined,
        projectId: null,
        results: [],
      }),
    );

    expect(html).toContain("상품컷 갤러리");
    expect(html).toContain("비율 변경");
    expect(html).toContain("1:1 상품 목록");
    expect(html).toContain("목록용");
    expect(html).toContain("4:5 대표용");
    expect(html).toContain("대표용");
    expect(html).toContain("3:4 상세 이미지");
    expect(html).toContain("상세페이지용");
    expect(html).toContain("16:9 확장 콘텐츠");
    expect(html).toContain("사용자 지정");
    expect(html).toContain("다운로드할 이미지가 없습니다.");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>ZIP 다운로드<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>개별 다운로드<\/button>/);
  });

  it("validates custom output dimensions before regeneration", () => {
    expect(
      validateProductImageStudioDownloadDraft({
        customHeight: "1500",
        customWidth: "1200",
        ratio: "custom",
      }),
    ).toEqual({
      customDimensions: { height: 1500, width: 1200 },
      ok: true,
      ratio: "custom",
    });
    expect(
      validateProductImageStudioDownloadDraft({
        customHeight: "1500.5",
        customWidth: "1200",
        ratio: "custom",
      }),
    ).toMatchObject({
      message: "사용자 지정 크기는 64px 이상 4096px 이하의 정수로 입력해 주세요.",
      ok: false,
    });
  });

  it("renders regenerate, individual download, and zip download controls when results exist", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioDownloadPanel, {
        onRegeneratedResult: () => undefined,
        projectId: "project-1",
        results: [resultPreview("result-1")],
      }),
    );

    expect(html).toContain("비율 변경 다시 만들기");
    expect(html).toContain("다시 만들기");
    expect(html).toContain("개별 다운로드");
    expect(html).toContain("ZIP 다운로드");
    expect(html).toContain("/api/product-image-studio/projects/project-1/downloads.zip");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/download");
    expect(html).toContain("원하는 비율을 선택한 뒤 다운로드하거나 새 크기로 다시 만들 수 있습니다.");
    expect(html).not.toContain("다운로드할 이미지가 없습니다.");
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>ZIP 다운로드<\/button>/);
  });
});

function resultPreview(id: string): ProductImageStudioGenerationResultPreview {
  return {
    generationRequestId: "generation-1",
    id,
    label: "세트컷",
    outputType: "set_combined",
    ratio: "1:1",
  };
}
