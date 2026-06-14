import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProductImageStudioProjectArchive,
  ProductImageStudioProjectDetailArchive,
  ProductImageStudioResultArchive,
} from "@/components/product-image-studio/ProductImageStudioArchive";
import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";
import type { ProductImageStudioProjectRecord } from "@/lib/persistence/productImageStudioRepository";
import { manualProductionSettings } from "./manualProductionSettings";

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

describe("product image studio result archive UI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders project archive cards and Korean empty states", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectArchive, {
        projects: [projectSummary()],
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

  it("renders canonical designs and legacy projects routes with the design navigation active", async () => {
    // Given: the archive routes read existing project data from the local page loader.
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(archiveRouteFetch);
    const [{ default: DesignsPage }, { default: ProjectsPage }] = await Promise.all([
      import("@/app/product-image-studio/designs/page"),
      import("@/app/product-image-studio/projects/page"),
    ]);

    // When: both the canonical and legacy list routes are rendered.
    const designsHtml = renderToStaticMarkup(await DesignsPage());
    const projectsHtml = renderToStaticMarkup(await ProjectsPage());

    // Then: both routes show the 디자인 IA and avoid the old primary archive label.
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
    // Given: one saved design has generated archive results.
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.spyOn(globalThis, "fetch").mockImplementation(archiveRouteFetch);
    const [{ default: DesignDetailPage }, { default: ProjectDetailPage }] = await Promise.all([
      import("@/app/product-image-studio/designs/[id]/page"),
      import("@/app/product-image-studio/projects/[id]/page"),
    ]);
    const props = { params: Promise.resolve({ id: "project-1" }) };

    // When: both the canonical and legacy detail routes are rendered.
    const designDetailHtml = renderToStaticMarkup(await DesignDetailPage(props));
    const projectDetailHtml = renderToStaticMarkup(await ProjectDetailPage(props));

    // Then: both detail routes keep the 디자인 nav item current and show design-focused copy.
    for (const html of [designDetailHtml, projectDetailHtml]) {
      expect(html).toContain("디자인 결과");
      expect(html).toContain("봄 초대장 세트");
      expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/designs"/);
      expect(html).not.toContain("프로젝트 보관함");
      expect(html).not.toContain("리소스");
      expect(html).not.toContain("API_KEY");
    }
  });

  it("renders all-result archive metadata and download actions", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioResultArchive, { results: [archiveItem()] }));

    expect(html).toContain("활동");
    expect(html).toContain("상품컷 갤러리");
    expect(html).toContain("최근 생성 이미지");
    expect(html).not.toContain("결과 보관함");
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

  it("keeps archive CSS flat, stable, and neutral with one blue accent", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioArchive.module.css"),
      "utf8",
    );
    const forbiddenTokens = ["lime", "mint", "purple", "orange", "#d9ff62", "--studio-lime", "#f4f2ee", "rgba(", "box-shadow", "linear-gradient"] as const;
    const allowedHexColors = new Set(["#0070f3", "#171717", "#404040", "#666666", "#d4d4d4", "#e5e5e5", "#ededed", "#fafafa", "#ffffff"]);
    const resultGridRules = Array.from(css.matchAll(/\.resultGrid\s*\{(?<body>[^}]*)\}/g), (match) => match.groups?.body ?? "");
    const resultGridRule = resultGridRules.find((rule) => rule.includes("grid-template-columns")) ?? "";
    const headingRule = css.match(/\.heading\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const projectCardRule = css.match(/\.projectCard\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const resultCardRule = css.match(/\.resultCard\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const summaryStripRule = css.match(/\.summaryStrip\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const cssHexColors = Array.from(css.matchAll(/#[0-9a-fA-F]{3,8}/g), (match) => match[0].toLowerCase());

    for (const token of forbiddenTokens) {
      expect(css).not.toContain(token);
    }
    for (const color of cssHexColors) {
      expect(allowedHexColors.has(color)).toBe(true);
    }
    expect(headingRule).not.toContain("background:");
    expect(headingRule).not.toContain("border:");
    expect(summaryStripRule).not.toContain("background:");
    expect(summaryStripRule).not.toContain("border:");
    expect(projectCardRule).toContain("min-height: 184px;");
    expect(resultCardRule).toContain("height: 100%;");
    expect(resultGridRule).not.toContain("justify-content: start;");
    expect(resultGridRule).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));");
  });

  it("groups project detail results by output type and exposes ZIP download", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectDetailArchive, {
        project: projectRecord(),
        results: [
          archiveItem("set-1", "set_combined"),
          archiveItem("card-1", "card_single"),
          archiveItem("seal-1", "seal_sticker_single"),
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

function projectSummary(): ProductImageStudioProjectSummary {
  return {
    cardFormat: "folded_card",
    createdAt: "2026-06-11T00:00:00.000Z",
    id: "project-1",
    latestResultAt: "2026-06-11T00:04:00.000Z",
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    resultCount: 2,
    updatedAt: "2026-06-11T00:01:00.000Z",
    zipDownloadUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
  };
}

function projectRecord(): ProductImageStudioProjectRecord {
  return {
    cardFormat: "folded_card",
    createdAt: "2026-06-11T00:00:00.000Z",
    id: "project-1",
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    productionSettings: manualProductionSettings("folded_card"),
    qualityMode: "draft",
    ratios: ["1:1"],
    requestedCardPoses: ["folded_closed"],
    requestedOutputs: ["set_combined", "card_single", "seal_sticker_single"],
    updatedAt: "2026-06-11T00:01:00.000Z",
  };
}

function archiveItem(
  resultId = "result-1",
  outputType: ProductImageStudioResultArchiveItem["outputType"] = "card_single",
): ProductImageStudioResultArchiveItem {
  return {
    cardPose: outputType === "card_single" ? "folded_closed" : undefined,
    createdAt: "2026-06-11T00:04:00.000Z",
    downloadUrl: `/api/product-image-studio/projects/project-1/results/${resultId}/download`,
    generationId: "generation-1",
    height: 1200,
    model: "gpt-image-1",
    outputType,
    previewUrl: `/api/product-image-studio/projects/project-1/results/${resultId}/preview`,
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "openai",
    ratio: "1:1",
    resultId,
    width: 1200,
  };
}

const archiveRouteFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/api/product-image-studio/projects")) {
    return jsonResponse({
      ok: true,
      projects: [projectSummary()],
    });
  }

  if (url.endsWith("/api/product-image-studio/projects/project-1/results")) {
    return jsonResponse({
      ok: true,
      project: projectRecord(),
      results: [archiveItem()],
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
