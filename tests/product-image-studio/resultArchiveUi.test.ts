import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioProjectArchive,
  ProductImageStudioProjectDetailArchive,
  ProductImageStudioResultArchive,
} from "@/components/product-image-studio/ProductImageStudioArchive";
import {
  resultArchiveItem,
  resultArchiveProjectRecord,
  resultArchiveProjectSummary,
} from "./resultArchiveTestSupport";

describe("product image studio result archive UI", () => {
  it("renders project archive cards and Korean empty states", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectArchive, {
        projects: [resultArchiveProjectSummary()],
      }),
    );
    const emptyHtml = renderToStaticMarkup(createElement(ProductImageStudioProjectArchive, { projects: [] }));

    expect(html).toContain("내 콘텐츠");
    expect(html).toContain("디자인");
    expect(html).not.toContain("프로젝트 보관함");
    expect(html).not.toContain("리소스");
    expect(html).toContain("디자인별 제작 기록");
    expect(html).toContain("봄 초대장 세트");
    expect(html).toContain("결과 2개");
    expect(html).toContain("상세 보기");
    expect(html).toContain("새 디자인");
    expect(html).toContain("/product-image-studio/designs/project-1");
    expect(html).toContain("/product-image-studio/ai-tools/product-staging");
    expect(html).toContain("ZIP 다운로드");
    expect(emptyHtml).toContain("저장된 디자인이 없습니다.");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("secret");
  });

  it("renders all-result archive metadata and download actions", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioResultArchive, { results: [resultArchiveItem()] }));

    expect(html).toContain("결과 보관함");
    expect(html).toContain("최근 생성 이미지");
    expect(html).not.toContain("상품컷 갤러리");
    expect(html).not.toContain("리소스");
    expect(html).toContain("봄 초대장 세트");
    expect(html).toContain("카드 단독컷");
    expect(html).toContain("1:1");
    expect(html).toContain("openai");
    expect(html).toContain("gpt-image-1");
    expect(html).toContain("미리보기");
    expect(html).toContain("다운로드");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/preview");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/download");
    expect(html).not.toContain("GEMINI_API_KEY");
  });

  it("keeps legacy card, envelope, and seal archive labels unchanged", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectDetailArchive, {
        project: resultArchiveProjectRecord(),
        results: [
          resultArchiveItem("set-1", "set_combined"),
          resultArchiveItem("card-1", "card_single"),
          resultArchiveItem("envelope-1", "envelope_single"),
          resultArchiveItem("seal-1", "seal_sticker_single"),
        ],
      }),
    );

    expect(html).toContain("세트컷");
    expect(html).toContain("카드 단독컷");
    expect(html).toContain("봉투 단독컷");
    expect(html).toContain("봉합스티커 단독컷");
  });

  it("renders image-generator workflow archive copy with prompt preview", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioResultArchive, {
        results: [
          {
            ...resultArchiveItem("generated-1", "card_single"),
            cardPose: undefined,
            model: "gpt-image-2",
            projectName: "AI 이미지 생성기 - 흰 배경의 고급 문구",
            promptPreview: "흰 배경의 고급 문구 사진",
            workflow: "image_generator",
          },
        ],
      }),
    );

    expect(html).toContain("AI 이미지 생성기");
    expect(html).toContain("AI 생성 이미지");
    expect(html).toContain("흰 배경의 고급 문구 사진");
    expect(html).not.toContain("카드 자세");
  });

  it("renders converted SVG results with preview and .svg download actions", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioResultArchive, {
        results: [
          {
            ...resultArchiveItem("svg-result", "seal_sticker_single"),
            contentType: "image/svg+xml",
            downloadUrl: "/api/product-image-studio/projects/project-1/results/svg-result/download",
            model: "sharp-local-vectorizer",
            previewUrl: "/api/product-image-studio/projects/project-1/results/svg-result/preview",
            promptPreview: '<img src=x onerror="alert(1)">',
            provider: "local",
            workflow: "svg_conversion",
          },
          resultArchiveItem("png-result", "card_single"),
        ],
      }),
    );

    expect(html).toContain("SVG 변환");
    expect(html).toContain("미리보기");
    expect(html).not.toContain("SVG 미리보기");
    expect(html).toContain("SVG 다운로드");
    expect(html).toContain('download="svg-result.svg"');
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/svg-result/download");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/png-result/download");
    expect(html).toContain("카드 단독컷");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
  });

  it("escapes hostile SVG archive card text and sanitizes the download filename", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioResultArchive, {
        results: [
          {
            ...resultArchiveItem('../evil"><script>alert(1)</script>', "seal_sticker_single"),
            contentType: "image/svg+xml",
            downloadUrl: "/api/product-image-studio/projects/project-1/results/evil/download",
            projectName: '원본"><svg onload=alert(1)>',
            provider: "local",
            workflow: "svg_conversion",
          },
        ],
      }),
    );

    expect(html).toContain("SVG 변환");
    expect(html).toContain("원본&quot;&gt;&lt;svg onload=alert(1)&gt;");
    expect(html).toContain('download="evil-script-alert-1-script.svg"');
    expect(html).not.toContain('download="../evil');
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<svg onload=alert(1)>");
  });

  it("exposes SVG download links with an explicit role-friendly accessible label", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioResultArchive, {
        results: [
          {
            ...resultArchiveItem("svg-result", "seal_sticker_single"),
            contentType: "image/svg+xml",
            downloadUrl: "/api/product-image-studio/projects/project-1/results/svg-result/download",
            provider: "local",
            workflow: "svg_conversion",
          },
          resultArchiveItem("png-result", "card_single"),
        ],
      }),
    );

    expect(html).toMatch(/<a[^>]*aria-label="SVG 다운로드"[^>]*href="\/api\/product-image-studio\/projects\/project-1\/results\/svg-result\/download"[^>]*>/);
    expect(html).not.toMatch(/<a[^>]*aria-label="SVG 다운로드"[^>]*href="\/api\/product-image-studio\/projects\/project-1\/results\/png-result\/download"[^>]*>/);
    expect(html.match(/<a[^>]*(?:aria-label="[^"]*SVG[^"]*"|>[^<]*SVG[^<]*<\/a>)/g)).toHaveLength(1);
  });

  it("groups project detail results by output type and exposes ZIP download", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectDetailArchive, {
        project: resultArchiveProjectRecord(),
        results: [
          resultArchiveItem("set-1", "set_combined"),
          resultArchiveItem("card-1", "card_single"),
          resultArchiveItem("seal-1", "seal_sticker_single"),
        ],
      }),
    );

    expect(html).toContain("디자인 결과");
    expect(html).toContain("세트컷");
    expect(html).toContain("카드 단독컷");
    expect(html).toContain("봉합스티커 단독컷");
    expect(html).toContain("디자인 ZIP 다운로드");
    expect(html).toContain("/api/product-image-studio/projects/project-1/downloads.zip");
    expect(html).not.toContain("API_KEY");
  });
});
