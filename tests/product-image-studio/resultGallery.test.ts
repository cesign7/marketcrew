import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioResultGallery } from "@/components/product-image-studio/ProductImageStudioResultGallery";
import {
  groupProductImageStudioResultsForGallery,
  type ProductImageStudioGalleryResult,
} from "@/features/product-image-studio/domain/resultGallery";
import { PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES, type CardDisplayPose, type ProductImageStudioOutputType } from "@/features/product-image-studio/domain/types";
import { readProductImageStudioGenerationResponse } from "@/features/product-image-studio/domain/generationWorkflow";
import { createInitialProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";

describe("product image studio result gallery", () => {
  it("groups combined and separate outputs without collapsing result buckets", () => {
    const wizardState = createInitialProductImageStudioWizardState();
    const results = [
      resultPreview("set-1", "generation-1", "set_combined", "folded_closed"),
      resultPreview("card-1", "generation-1", "card_single", "folded_closed"),
      resultPreview("envelope-1", "generation-1", "envelope_single"),
      resultPreview("seal-1", "generation-1", "seal_sticker_single"),
      resultPreview("set-2", "generation-2", "set_combined", "folded_closed"),
      resultPreview("card-2", "generation-2", "card_single", "folded_closed"),
    ] satisfies readonly ProductImageStudioGalleryResult[];

    const groups = groupProductImageStudioResultsForGallery(results, wizardState);
    const setGroup = groups.find((group) => group.key === "set");
    const cardGroup = groups.find((group) => group.key === "card");
    const envelopeGroup = groups.find((group) => group.key === "envelope");
    const sealGroup = groups.find((group) => group.key === "seal");

    expect(groups.map((group) => group.label)).toEqual(["세트컷", "카드", "봉투", "봉합스티커"]);
    expect(setGroup?.items).toHaveLength(2);
    expect(cardGroup?.items).toHaveLength(2);
    expect(envelopeGroup?.items).toHaveLength(1);
    expect(sealGroup?.items).toHaveLength(1);
    expect(cardGroup?.items.map((item) => item.versionLabel)).toEqual(["원본안", "비교안 2"]);
    expect(cardGroup?.items.map((item) => item.detailLabel)).toEqual([
      "접이식 카드 - 접은 카드 닫힌 컷",
      "접이식 카드 - 접은 카드 닫힌 컷",
    ]);
  });

  it("renders Korean sections, empty states, card pose labels, and compare labels", () => {
    const wizardState = createInitialProductImageStudioWizardState();
    const results = [
      resultPreview("set-1", "generation-1", "set_combined", "folded_closed"),
      resultPreview("card-1", "generation-1", "card_single", "folded_closed"),
      resultPreview("card-2", "generation-2", "card_single", "folded_closed"),
    ] satisfies readonly ProductImageStudioGalleryResult[];

    const html = renderToStaticMarkup(createElement(ProductImageStudioResultGallery, { results, wizardState }));

    expect(html).toContain("결과 갤러리");
    expect(html).toContain("상품컷 미리보기");
    expect(html).toContain("세트컷");
    expect(html).toContain("카드");
    expect(html).toContain("봉투");
    expect(html).toContain("봉합스티커");
    expect(html).toContain("세트 구성");
    expect(html).toContain("목록용");
    expect(html).toContain("접이식 카드 - 접은 카드 닫힌 컷");
    expect(html).toContain("원본안");
    expect(html).toContain("비교안 2");
    expect(html).toContain("아직 봉투 결과가 없습니다.");
    expect(html).toContain("아직 봉합스티커 결과가 없습니다.");
  });

  it("renders result preview images when the generation response includes preview URLs", () => {
    const wizardState = createInitialProductImageStudioWizardState();
    const results = [
      {
        ...resultPreview("card-1", "generation-1", "card_single", "folded_closed"),
        previewUrl: "/api/product-image-studio/projects/project-1/results/card-1/preview",
      },
    ] satisfies readonly ProductImageStudioGalleryResult[];

    const html = renderToStaticMarkup(createElement(ProductImageStudioResultGallery, { results, wizardState }));

    expect(html).toContain('src="/api/product-image-studio/projects/project-1/results/card-1/preview"');
    expect(html).toContain('alt="card_single 원본안"');
  });

  it("keeps generation metadata needed by the result gallery when reading API responses", () => {
    const state = readProductImageStudioGenerationResponse({
      data: {
        generation: { id: "generation-1", status: "ready" },
        results: PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.map((outputType) => ({
          cardPose: outputType === "card_single" ? "folded_closed" : undefined,
          generationRequestId: "generation-1",
          id: `result-${outputType}`,
          outputType,
          previewUrl: `/api/product-image-studio/projects/project-1/results/result-${outputType}/preview`,
          ratio: "1:1",
        })),
      },
      ok: true,
    });

    expect(state.results.map((result) => result.generationRequestId)).toEqual([
      "generation-1",
      "generation-1",
      "generation-1",
      "generation-1",
    ]);
    expect(state.results.find((result) => result.outputType === "card_single")?.cardPose).toBe("folded_closed");
    expect(state.results.find((result) => result.outputType === "card_single")?.previewUrl).toBe(
      "/api/product-image-studio/projects/project-1/results/result-card_single/preview",
    );
  });
});

function resultPreview(
  id: string,
  generationRequestId: string,
  outputType: ProductImageStudioOutputType,
  cardPose?: CardDisplayPose,
): ProductImageStudioGalleryResult {
  return {
    cardPose,
    generationRequestId,
    id,
    label: outputType,
    outputType,
    ratio: "1:1",
  };
}
