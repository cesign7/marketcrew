import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resultArchiveRouteFetch } from "./resultArchiveTestSupport";

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

  it("renders canonical designs and legacy projects routes with the design navigation active", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(resultArchiveRouteFetch);
    const [{ default: DesignsPage }, { default: ProjectsPage }] = await Promise.all([
      import("@/app/product-image-studio/designs/page"),
      import("@/app/product-image-studio/projects/page"),
    ]);

    const designsHtml = renderToStaticMarkup(await DesignsPage());
    const projectsHtml = renderToStaticMarkup(await ProjectsPage());

    for (const html of [designsHtml, projectsHtml]) {
      expect(html).toContain("디자인");
      expect(html).toContain("봄 초대장 세트");
      expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/designs"/);
      expect(html).not.toContain("프로젝트 보관함");
      expect(html).not.toContain("Photoroom");
      expect(html).not.toContain("Vercel");
    }
  });

  it("renders canonical designs detail and legacy project detail routes with design copy", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(resultArchiveRouteFetch);
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
      expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/designs"/);
      expect(html).not.toContain("프로젝트 보관함");
      expect(html).not.toContain("리소스");
      expect(html).not.toContain("API_KEY");
    }
  });
});
