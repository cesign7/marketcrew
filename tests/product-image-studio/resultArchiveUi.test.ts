import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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

describe("product image studio result archive UI", () => {
  it("renders project archive cards and Korean empty states", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProjectArchive, {
        projects: [projectSummary()],
      }),
    );
    const emptyHtml = renderToStaticMarkup(createElement(ProductImageStudioProjectArchive, { projects: [] }));

    expect(html).toContain("프로젝트");
    expect(html).toContain("비주얼 보관함");
    expect(html).toContain("봄 초대장 세트");
    expect(html).toContain("결과 2개");
    expect(html).toContain("상세 보기");
    expect(html).toContain("/product-image-studio/projects/project-1");
    expect(html).toContain("ZIP 다운로드");
    expect(emptyHtml).toContain("저장된 프로젝트가 없습니다.");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("secret");
  });

  it("renders all-result archive metadata and download actions", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioResultArchive, { results: [archiveItem()] }));

    expect(html).toContain("결과 보관함");
    expect(html).toContain("상품컷 갤러리");
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

  it("keeps result cards in full-width balanced columns at desktop widths", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioArchive.module.css"),
      "utf8",
    );
    const resultGridRules = Array.from(css.matchAll(/\.resultGrid\s*\{(?<body>[^}]*)\}/g), (match) => match.groups?.body ?? "");
    const resultGridRule = resultGridRules.find((rule) => rule.includes("grid-template-columns")) ?? "";

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

    expect(html).toContain("프로젝트 결과");
    expect(html).toContain("세트컷");
    expect(html).toContain("카드 단독컷");
    expect(html).toContain("봉합스티커 단독컷");
    expect(html).toContain("프로젝트 ZIP 다운로드");
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
