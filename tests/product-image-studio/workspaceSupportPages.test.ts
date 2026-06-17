import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProductImageStudioActivityWorkspacePage,
  ProductImageStudioBatchWorkspacePage,
  ProductImageStudioInviteWorkspacePage,
  ProductImageStudioLibraryWorkspacePage,
  ProductImageStudioProductSpecsWorkspacePage,
  ProductImageStudioTemplatesWorkspacePage,
  ProductImageStudioUploadsWorkspacePage,
  ProductImageStudioUsageWorkspacePage,
} from "@/components/product-image-studio/ProductImageStudioWorkspaceSupportPages";
import type { ProductImageStudioResultArchiveItem } from "@/lib/persistence/productImageStudioArchiveReadModels";

type WorkspaceSupportPageCase = {
  readonly activeHref: string;
  readonly expectedActiveHref?: string;
  readonly html: string;
  readonly label: string;
  readonly requiresCompactPrimitives?: boolean;
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
        requiresCompactPrimitives: true,
        requiredCopy: ["일괄처리", "작업 묶음", "파일 점검", "공통 설정", "예약 검토"],
      },
      {
        activeHref: "/product-image-studio/activity",
        expectedActiveHref: "/product-image-studio/results",
        html: renderToStaticMarkup(createElement(ProductImageStudioActivityWorkspacePage, { results: [] })),
        label: "activity",
        requiredCopy: ["활동", "최근 생성 결과", "저장된 활동이 아직 없습니다"],
      },
      {
        activeHref: "/product-image-studio/templates",
        html: renderToStaticMarkup(createElement(ProductImageStudioTemplatesWorkspacePage)),
        label: "templates",
        requiresCompactPrimitives: true,
        requiredCopy: ["상품템플릿", "기본 구성", "카드 세트", "봉투", "봉합스티커", "대표이미지"],
      },
      {
        activeHref: "/product-image-studio/uploads",
        html: renderToStaticMarkup(createElement(ProductImageStudioUploadsWorkspacePage)),
        label: "uploads",
        requiredCopy: ["업로드"],
      },
      {
        activeHref: "/product-image-studio/specs",
        expectedActiveHref: "/product-image-studio/library",
        html: renderToStaticMarkup(createElement(ProductImageStudioProductSpecsWorkspacePage)),
        label: "specs",
        requiredCopy: ["상품 규격", "개별 규격", "세트 규격", "아이콘으로 규격 추가", "카드(접이식)", "엽서(비접이)"],
      },
      {
        activeHref: "/product-image-studio/usage",
        html: renderToStaticMarkup(createElement(ProductImageStudioUsageWorkspacePage)),
        label: "usage",
        requiresCompactPrimitives: true,
        requiredCopy: ["사용량", "이번 달", "이미지 생성", "업로드 보관", "다운로드"],
      },
      {
        activeHref: "/product-image-studio/library",
        html: renderToStaticMarkup(createElement(ProductImageStudioLibraryWorkspacePage)),
        label: "library",
        requiresCompactPrimitives: true,
        requiredCopy: ["라이브러리", "자료 바로가기", "목업", "배경/소품", "용지·재질", "상품 규격"],
      },
      {
        activeHref: "/product-image-studio/invite",
        html: renderToStaticMarkup(createElement(ProductImageStudioInviteWorkspacePage)),
        label: "invite",
        requiresCompactPrimitives: true,
        requiredCopy: ["회원초대", "UI 전용", "이메일", "역할", "초대 메일은 발송하지 않습니다."],
      },
    ];

    // Then: every page exposes its route-specific copy, active nav item, and no fake saved-data wording.
    for (const pageCase of cases) {
      for (const copy of pageCase.requiredCopy) {
        expect(pageCase.html, pageCase.label).toContain(copy);
      }
      if (pageCase.requiresCompactPrimitives) {
        expect(pageCase.html, pageCase.label).toContain('data-saas-page-header="true"');
        expect(pageCase.html, pageCase.label).toContain('data-saas-card-grid="true"');
      }
      expectActiveNavHref(pageCase.html, pageCase.expectedActiveHref ?? pageCase.activeHref);
      expect(pageCase.html, pageCase.label).not.toMatch(FORBIDDEN_FAKE_DATA_COPY_PATTERN);
      expect(pageCase.html, pageCase.label).not.toContain("Photoroom");
      expect(pageCase.html, pageCase.label).not.toContain("Vercel");
    }
  });

  it("keeps invite as a UI-only draft form without a real send path", () => {
    // Given: the invite page is only a workspace planning surface.
    const html = renderToStaticMarkup(createElement(ProductImageStudioInviteWorkspacePage));
    const inviteForm =
      Array.from(html.matchAll(/<form[\s\S]*?<\/form>/g), (match) => match[0]).find((formHtml) =>
        formHtml.includes('data-invite-ui-only="true"'),
      ) ?? "";

    // Then: it may collect draft text, but it cannot submit to an email/account route.
    expect(inviteForm).toContain('data-invite-ui-only="true"');
    expect(inviteForm).toContain('type="email"');
    expect(inviteForm).toContain('inputMode="email"');
    expect(inviteForm).toContain('type="button"');
    expect(inviteForm).not.toContain('type="submit"');
    expect(inviteForm).not.toMatch(/\saction=/);
    expect(inviteForm).not.toMatch(/\smethod=/);
    expect(inviteForm).not.toContain("/api/");
  });

  it("uses actionable focused-flow cards for batch and template support pages", () => {
    // Given: batch and template support pages should direct operators to existing focused flows.
    const cases = [
      {
        expectedHrefs: [
          "/product-image-studio/uploads",
          "/product-image-studio/ai-tools",
          "/product-image-studio/results",
        ],
        html: renderToStaticMarkup(createElement(ProductImageStudioBatchWorkspacePage)),
        label: "batch",
      },
      {
        expectedHrefs: [
          "/product-image-studio/library",
          "/product-image-studio/ai-tools",
          "/product-image-studio/results",
        ],
        html: renderToStaticMarkup(createElement(ProductImageStudioTemplatesWorkspacePage)),
        label: "templates",
      },
    ] as const;

    // Then: cards expose real links and do not present disabled "coming soon" actions.
    for (const pageCase of cases) {
      for (const href of pageCase.expectedHrefs) {
        expect(pageCase.html, pageCase.label).toContain(`href="${href}"`);
      }
      expect(pageCase.html, pageCase.label).not.toContain('data-saas-action-kind="disabled"');
      expect(pageCase.html, pageCase.label).not.toContain('data-saas-card-state="disabled"');
      expect(pageCase.html, pageCase.label).not.toContain("준비 중");
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
    promptPreview: null,
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "image-provider",
    ratio: "1:1",
    resultId: "result-1",
    width: 1200,
    workflow: null,
  };
}
