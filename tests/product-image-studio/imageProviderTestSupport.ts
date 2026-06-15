import { Buffer } from "node:buffer";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import type {
  CardDisplayPose,
  CardFormat,
  ProductImageStudioAssetRole,
  ProductImageStudioOutputType,
  ProductImageStudioQualityMode,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import { buildProductImageStudioPromptContext } from "@/features/product-image-studio/server/imageProvider";
import { manualCardOnlyProductionSettings, manualProductionSettings } from "./manualProductionSettings";

export type PromptGeneratorResolution = "0.5k" | "1k" | "2k";

export type PromptContextOptions = {
  readonly qualityMode?: ProductImageStudioQualityMode;
  readonly ratio?: ProductImageStudioRatioPreset;
  readonly resolution?: PromptGeneratorResolution;
};

export function foldedProviderPromptContext(assetRoles: readonly ProductImageStudioAssetRole[]) {
  return buildProductImageStudioPromptContext({
    assetRoles,
    cardPose: "folded_open_spread",
    concept: readProductImageStudioConcept("minimal-studio"),
    outputType: "set_combined",
    project: providerProject("folded_card", ["folded_closed", "folded_open_spread", "folded_standing"]),
    qualityMode: "high",
    ratio: "1:1",
  });
}

export function postcardProviderPromptContext(assetRoles: readonly ProductImageStudioAssetRole[], options: PromptContextOptions = {}) {
  const context = buildProductImageStudioPromptContext({
    assetRoles,
    cardPose: "postcard_front_flat",
    concept: readProductImageStudioConcept("minimal-studio"),
    outputType: "set_combined",
    project: providerProject("postcard_flat", ["postcard_front_flat"]),
    qualityMode: options.qualityMode ?? "draft",
    ratio: options.ratio ?? "4:5",
  });

  return options.resolution ? { ...context, resolution: options.resolution } : context;
}

export function singleCardOpenAiPromptContext(options: PromptContextOptions = {}) {
  const context = buildProductImageStudioPromptContext({
    assetRoles: ["folded_card_outer_front"],
    cardPose: "folded_closed",
    concept: readProductImageStudioConcept("minimal-studio"),
    outputType: "card_single",
    project: providerProject("folded_card", ["folded_closed"], ["card_single"]),
    qualityMode: options.qualityMode ?? "draft",
    ratio: options.ratio ?? "1:1",
  });

  return options.resolution ? { ...context, resolution: options.resolution } : context;
}

export function providerPromptContextForConcept(conceptId: string) {
  return buildProductImageStudioPromptContext({
    assetRoles: ["postcard_front", "envelope_front", "seal_sticker"],
    cardPose: "postcard_front_flat",
    concept: readProductImageStudioConcept(conceptId),
    outputType: "set_combined",
    project: providerProject("postcard_flat", ["postcard_front_flat"]),
    qualityMode: "draft",
    ratio: "4:5",
  });
}

export function providerProject(
  cardFormat: CardFormat,
  requestedCardPoses: readonly CardDisplayPose[],
  requestedOutputs: readonly ProductImageStudioOutputType[] = ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
) {
  return {
    cardFormat,
    createdAt: "2026-06-11T00:00:00.000Z",
    id: `${cardFormat}-project`,
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    qualityMode: "draft",
    productionSettings: manualProductionSettings(cardFormat),
    ratios: ["1:1", "4:5"],
    requestedCardPoses,
    requestedOutputs,
    updatedAt: "2026-06-11T00:00:00.000Z",
  } as const;
}

export async function createProviderRouteProjectId(cardFormat: CardFormat): Promise<string> {
  const response = await createProject(
    new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
      body: JSON.stringify({
        cardFormat,
        name: "봄 초대장 세트",
        productType: "card_envelope_seal_set",
        productionSettings: manualProductionSettings(cardFormat),
        qualityMode: "draft",
        ratios: ["1:1"],
        requestedCardPoses: cardFormat === "folded_card" ? ["folded_closed"] : ["postcard_front_flat"],
        requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") {
    return body.id;
  }
  throw new Error("project id missing");
}

export function providerRouteUploadRequest(projectId: string, role: ProductImageStudioAssetRole): Request {
  const formData = new FormData();
  formData.set("role", role);
  formData.set("file", new File([Buffer.from("uploaded card bytes")], "card-front.png", { type: "image/png" }));

  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets`, {
    body: formData,
    method: "POST",
  });
}

export async function uploadProviderRouteAsset(projectId: string, role: ProductImageStudioAssetRole): Promise<Response> {
  return uploadAsset(providerRouteUploadRequest(projectId, role), {
    params: Promise.resolve({ id: projectId }),
  });
}

export function readProductImageStudioConcept(id: string) {
  const concept = listCardSetConceptRecommendations().find((candidate) => candidate.id === id);
  if (!concept) {
    throw new Error(`concept missing: ${id}`);
  }
  return concept;
}

export function manualCardOnlySettingsForProviderRoute() {
  return manualCardOnlyProductionSettings();
}

export function manualSettingsForProviderRoute(cardFormat: CardFormat) {
  return manualProductionSettings(cardFormat);
}
