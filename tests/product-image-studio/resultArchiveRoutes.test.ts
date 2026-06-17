import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resultArchiveItem, resultArchiveRouteFetch } from "./resultArchiveTestSupport";

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

describe("product image studio result archive routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders canonical designs and legacy projects routes with the result archive navigation active", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(resultArchiveRoutesFetch);
    const [{ default: DesignsPage }, { default: ProjectsPage }] = await Promise.all([
      import("@/app/product-image-studio/designs/page"),
      import("@/app/product-image-studio/projects/page"),
    ]);

    const designsHtml = renderToStaticMarkup(await DesignsPage());
    const projectsHtml = renderToStaticMarkup(await ProjectsPage());

    for (const html of [designsHtml, projectsHtml]) {
      expect(html).toContain("디자인");
      expect(html).toContain("봄 초대장 세트");
      expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/results"/);
      expect(html).not.toContain("프로젝트 보관함");
      expect(html).not.toContain("Photoroom");
      expect(html).not.toContain("Vercel");
    }
  });

  it("renders canonical designs detail and legacy project detail routes with design copy", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(resultArchiveRoutesFetch);
    const [{ default: DesignDetailPage }, { default: ProjectDetailPage }] = await Promise.all([
      import("@/app/product-image-studio/designs/[id]/page"),
      import("@/app/product-image-studio/projects/[id]/page"),
    ]);
    const props = { params: Promise.resolve({ id: "project-1" }) };

    const designDetailHtml = renderToStaticMarkup(await DesignDetailPage(props));
    const projectDetailHtml = renderToStaticMarkup(await ProjectDetailPage(props));

    for (const html of [designDetailHtml, projectDetailHtml]) {
      expect(html).toContain("디자인 결과");
      expect(html).toContain("봄 초대장 세트");
      expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/results"/);
      expect(html).not.toContain("프로젝트 보관함");
      expect(html).not.toContain("리소스");
      expect(html).not.toContain("API_KEY");
    }
  });

  it("keeps old workspace URLs renderable while adding library and UI-only invite routes", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    const fetchPaths: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      fetchPaths.push(getFetchPathname(input));
      return resultArchiveRoutesFetch(input, init);
    });
    const [
      { default: ActivityPage },
      { default: InvitePage },
      { default: LibraryPage },
      { default: ResultsPage },
      { default: SpecsPage },
      { default: TemplatesPage },
    ] = await Promise.all([
      import("@/app/product-image-studio/activity/page"),
      import("@/app/product-image-studio/invite/page"),
      import("@/app/product-image-studio/library/page"),
      import("@/app/product-image-studio/results/page"),
      import("@/app/product-image-studio/specs/page"),
      import("@/app/product-image-studio/templates/page"),
    ]);

    const [activityHtml, inviteHtml, libraryHtml, resultsHtml, specsHtml, templatesHtml] = await Promise.all([
      renderToStaticMarkup(await ActivityPage()),
      renderToStaticMarkup(InvitePage()),
      renderToStaticMarkup(LibraryPage()),
      renderToStaticMarkup(await ResultsPage()),
      renderToStaticMarkup(SpecsPage()),
      renderToStaticMarkup(TemplatesPage()),
    ]);

    expect(fetchPaths).toContain("/api/product-image-studio/results");
    expect(activityHtml).toContain("활동");
    expect(resultsHtml).toContain("결과 보관함");
    expect(resultsHtml).not.toMatch(/<h[12][^>]*>활동<\/h[12]>/);
    expect(resultsHtml).toContain("SVG 변환");
    expect(resultsHtml).toContain("SVG 다운로드");
    expect(resultsHtml).toContain('download="svg-result.svg"');
    expect(resultsHtml).toContain("/api/product-image-studio/projects/project-1/results/svg-result/download");
    expect(resultsHtml).toContain("/api/product-image-studio/projects/project-1/results/png-result/download");
    expect(specsHtml).toContain("상품 규격");
    expect(templatesHtml).toContain("템플릿");
    expect(libraryHtml).toContain("라이브러리");
    expect(libraryHtml).toContain("용지·재질");
    expect(libraryHtml).toContain('href="/product-image-studio/specs"');
    expect(inviteHtml).toContain("회원초대");
    expect(inviteHtml).toContain("초대 메일은 발송하지 않습니다.");
    const inviteForm = getInviteUiOnlyForm(inviteHtml);
    expect(inviteForm).toContain('type="button"');
    expect(inviteForm).not.toMatch(/\saction=/);
    expect(inviteForm).not.toMatch(/\smethod=/);
    expect(inviteForm).not.toContain('type="submit"');
    expect(inviteForm).not.toContain("/api/");
  });
});

const resultArchiveRoutesFetch: typeof fetch = async (input, init) => {
  const pathname = getFetchPathname(input);
  if (pathname === "/api/product-image-studio/results") {
    return resultArchiveJsonResponse({
      ok: true,
      results: [
        {
          ...resultArchiveItem("svg-result", "seal_sticker_single"),
          contentType: "image/svg+xml",
          model: "sharp-local-vectorizer",
          provider: "local",
          workflow: "svg_conversion",
        },
        resultArchiveItem("png-result", "card_single"),
      ],
    });
  }

  return resultArchiveRouteFetch(input, init);
};

function getFetchPathname(input: Parameters<typeof fetch>[0]): string {
  if (input instanceof Request) {
    return new URL(input.url).pathname;
  }
  return new URL(String(input), "https://marketcrew.app").pathname;
}

function resultArchiveJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function getInviteUiOnlyForm(html: string): string {
  return (
    Array.from(html.matchAll(/<form[\s\S]*?<\/form>/g), (match) => match[0]).find((formHtml) =>
      formHtml.includes('data-invite-ui-only="true"'),
    ) ?? ""
  );
}
