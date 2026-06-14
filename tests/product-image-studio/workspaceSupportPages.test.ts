import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioActivityWorkspacePage,
  ProductImageStudioBatchWorkspacePage,
  ProductImageStudioTemplatesWorkspacePage,
  ProductImageStudioUploadsWorkspacePage,
  ProductImageStudioUsageWorkspacePage,
} from "@/components/product-image-studio/ProductImageStudioWorkspaceSupportPages";
import type { ProductImageStudioResultArchiveItem } from "@/lib/persistence/productImageStudioArchiveReadModels";

type WorkspaceSupportPageCase = {
  readonly activeHref: string;
  readonly html: string;
  readonly label: string;
  readonly requiredCopy: readonly string[];
};

const FORBIDDEN_FAKE_DATA_COPY_PATTERN = /샘플 데이터|예시 데이터|가짜|더미|임시 저장/i;

describe("product image studio workspace support pages", () => {
  it("renders all support pages with Korean copy and the correct active shell item", () => {
    // Given: the five Todo 8 support pages are statically rendered through the shared shell.
    const cases: readonly WorkspaceSupportPageCase[] = [
      {
        activeHref: "/product-image-studio/batch",
        html: renderToStaticMarkup(createElement(ProductImageStudioBatchWorkspacePage)),
        label: "batch",
        requiredCopy: ["일괄처리", "파일을 끌어오거나 선택", "파일을 올리면 활성화됩니다"],
      },
      {
        activeHref: "/product-image-studio/activity",
        html: renderToStaticMarkup(createElement(ProductImageStudioActivityWorkspacePage, { results: [] })),
        label: "activity",
        requiredCopy: ["활동", "최근 생성 결과", "저장된 활동이 아직 없습니다"],
      },
      {
        activeHref: "/product-image-studio/templates",
        html: renderToStaticMarkup(createElement(ProductImageStudioTemplatesWorkspacePage)),
        label: "templates",
        requiredCopy: ["템플릿", "카드 세트", "봉투", "봉합스티커", "대표이미지"],
      },
      {
        activeHref: "/product-image-studio/uploads",
        html: renderToStaticMarkup(createElement(ProductImageStudioUploadsWorkspacePage)),
        label: "uploads",
        requiredCopy: ["업로드", "업로드 라이브러리", "디자인과 템플릿 작업에 연결합니다"],
      },
      {
        activeHref: "/product-image-studio/usage",
        html: renderToStaticMarkup(createElement(ProductImageStudioUsageWorkspacePage)),
        label: "usage",
        requiredCopy: ["사용량", "이번 달 사용량", "저장된 사용량 기록이 아직 없습니다"],
      },
    ];

    // Then: every page exposes its route-specific copy, active nav item, and no fake saved-data wording.
    for (const pageCase of cases) {
      for (const copy of pageCase.requiredCopy) {
        expect(pageCase.html, pageCase.label).toContain(copy);
      }
      expectActiveNavHref(pageCase.html, pageCase.activeHref);
      expect(pageCase.html, pageCase.label).not.toMatch(FORBIDDEN_FAKE_DATA_COPY_PATTERN);
      expect(pageCase.html, pageCase.label).not.toContain("Photoroom");
      expect(pageCase.html, pageCase.label).not.toContain("Vercel");
    }
  });

  it("renders activity from existing result archive data without inventing project updates", () => {
    // Given: the activity page receives real archive loader data from the route.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioActivityWorkspacePage, {
        results: [archiveItem()],
      }),
    );

    // Then: existing result and project activity are shown while the empty state is removed.
    expect(html).toContain("봄 초대장 세트");
    expect(html).toContain("카드 단독컷");
    expect(html).toContain("프로젝트 업데이트");
    expect(html).toContain("생성 결과 1개");
    expect(html).toContain('href="/product-image-studio/designs/project-1"');
    expect(html).not.toContain('href="/product-image-studio/projects/project-1"');
    expect(html).not.toContain("저장된 활동이 아직 없습니다");
    expect(html).not.toMatch(FORBIDDEN_FAKE_DATA_COPY_PATTERN);
  });
});

function expectActiveNavHref(html: string, href: string): void {
  const escapedHref = href.replaceAll("/", "\\/");
  expect(html).toMatch(new RegExp(`aria-current="page"[^>]*href="${escapedHref}"`));
}

function archiveItem(): ProductImageStudioResultArchiveItem {
  return {
    cardPose: "folded_closed",
    createdAt: "2026-06-11T00:04:00.000Z",
    downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
    generationId: "generation-1",
    height: 1200,
    model: "generation-model",
    outputType: "card_single",
    previewUrl: "/api/product-image-studio/projects/project-1/results/result-1/preview",
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "image-provider",
    ratio: "1:1",
    resultId: "result-1",
    width: 1200,
  };
}
