import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";
import type { ProductImageStudioProjectRecord } from "@/lib/persistence/productImageStudioRepository";
import { manualProductionSettings } from "./manualProductionSettings";

export function resultArchiveProjectSummary(): ProductImageStudioProjectSummary {
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

export function resultArchiveProjectRecord(): ProductImageStudioProjectRecord {
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

export function resultArchiveItem(
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
    promptPreview: null,
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "openai",
    ratio: "1:1",
    resultId,
    width: 1200,
    workflow: null,
  };
}

export const resultArchiveRouteFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/api/product-image-studio/projects")) {
    return resultArchiveJsonResponse({
      ok: true,
      projects: [resultArchiveProjectSummary()],
    });
  }

  if (url.endsWith("/api/product-image-studio/projects/project-1/results")) {
    return resultArchiveJsonResponse({
      ok: true,
      project: resultArchiveProjectRecord(),
      results: [resultArchiveItem()],
    });
  }

  return resultArchiveJsonResponse({ ok: false });
};

function resultArchiveJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
