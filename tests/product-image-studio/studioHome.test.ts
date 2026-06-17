import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductImageStudioPage from "@/app/product-image-studio/page";

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(
      new Headers([
        ["cookie", "studio_session=fixture"],
        ["x-forwarded-host", "marketcrew.app"],
        ["x-forwarded-proto", "https"],
      ]),
    ),
}));

describe("product image studio home", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the workspace home with creation entry points and recent sections", async () => {
    // Given: the home route can read existing archive data through the local page loader.
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(homeArchiveFetch);

    // When: the product image studio root page is rendered.
    const html = renderToStaticMarkup(await ProductImageStudioPage());

    // Then: the page is a home dashboard, not the direct wizard screen.
    expect(html).toContain("홈");
    expect(html).toContain('data-saas-page-header="true"');
    expect(html).toContain("작업 현황");
    expect(html).toContain("작업 바로가기");
    expect(html).toContain("새 상품컷");
    expect(html).toContain("AI 도구");
    expect(countOccurrences(html, 'data-saas-action-card="')).toBe(4);
    expect(html).toContain('data-saas-action-card="new-product-cut"');
    expect(html).toContain('data-saas-action-card="ai-tools"');
    expect(html).toContain('data-saas-action-card="uploads"');
    expect(html).toContain('data-saas-action-card="library"');
    expect(html).not.toContain('data-saas-action-card="batch"');
    expect(html).not.toContain('data-saas-action-card="templates"');
    expect(html).not.toContain('data-saas-action-card="usage"');
    expect(html).not.toContain('data-saas-action-card="invite"');
    expect(html).not.toContain('data-saas-action-card="settings"');
    expect(html).toContain("라이브러리");
    expect(html).toContain("회원초대");
    expect(html).toContain("환경설정");
    expect(html).toContain("최근 디자인");
    expect(html).toContain("봄 초대장 세트");
    expect(html).toContain("사용량");
    expect(html).toContain('href="/product-image-studio/ai-tools/product-staging"');
    expect(html).toContain('href="/product-image-studio/uploads"');
    expect(html).toContain('href="/product-image-studio/library"');
    expect(html).toContain('href="/product-image-studio/invite"');
    expect(html).toContain('href="/product-image-studio/settings"');
    expect(html).toContain('href="/product-image-studio/designs/project-1"');
    expect(html).not.toContain('href="/product-image-studio/projects/project-1"');
    expect(html).not.toContain("디자인 파일을 올리고 상품 설정샷 생성 흐름으로 바로 이어갑니다.");
    expect(html).not.toContain("추천 AI 도구");
    expect(html).not.toContain("Photoroom");
    expect(html).not.toContain("Vercel");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

const homeArchiveFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/api/product-image-studio/projects")) {
    return jsonResponse({
      ok: true,
      projects: [
        {
          cardFormat: "folded_card",
          createdAt: "2026-06-11T00:00:00.000Z",
          id: "project-1",
          latestResultAt: "2026-06-11T00:04:00.000Z",
          name: "봄 초대장 세트",
          productType: "card_envelope_seal_set",
          resultCount: 2,
          updatedAt: "2026-06-11T00:01:00.000Z",
          zipDownloadUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
        },
      ],
    });
  }

  if (url.endsWith("/api/product-image-studio/results")) {
    return jsonResponse({
      ok: true,
      results: [
        {
          cardPose: "folded_closed",
          createdAt: "2026-06-11T00:04:00.000Z",
          downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
          generationId: "generation-1",
          height: 1200,
          model: "gpt-image-1",
          outputType: "card_single",
          previewUrl: "/api/product-image-studio/projects/project-1/results/result-1/preview",
          projectId: "project-1",
          projectName: "봄 초대장 세트",
          projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
          provider: "openai",
          ratio: "1:1",
          resultId: "result-1",
          width: 1200,
        },
      ],
    });
  }

  return jsonResponse({ ok: false });
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
