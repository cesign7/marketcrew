import { Buffer } from "node:buffer";
import { createDefaultProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import { getProductImageStudioDimensionsForRatio } from "@/features/product-image-studio/server/downloads";
import type { ProductImageStudioImageGeneratorPayload } from "@/features/product-image-studio/domain/imageGenerator";
import type { ProductImageStudioProviderImageResult, ResolvedProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";
import type { ProductImageStudioImageGeneratorPreparedReference } from "@/features/product-image-studio/server/imageGeneratorRoutePayload";
import type { ProductImageFileStore } from "@/features/product-image-studio/server/fileStore";
import type {
  ProductImageStudioGenerationRequestRecord,
  ProductImageStudioProjectRecord,
  ProductImageStudioRepository,
  ProductImageStudioResultRecord,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioImageGeneratorSuccessfulImage = {
  readonly image: ProductImageStudioProviderImageResult;
  readonly sequence: number;
};

export type PersistProductImageStudioImageGeneratorSuccessInput = {
  readonly failedCount: number;
  readonly fileStore: ProductImageFileStore;
  readonly payload: ProductImageStudioImageGeneratorPayload;
  readonly references: readonly ProductImageStudioImageGeneratorPreparedReference[];
  readonly repository: ProductImageStudioRepository;
  readonly resolvedProvider: Extract<ResolvedProductImageStudioImageProvider, { readonly kind: "enabled" }>;
  readonly successes: readonly ProductImageStudioImageGeneratorSuccessfulImage[];
};

export type PersistedProductImageStudioImageGeneratorSuccess = {
  readonly generation: ProductImageStudioGenerationRequestRecord;
  readonly project: ProductImageStudioProjectRecord;
  readonly results: readonly ProductImageStudioResultRecord[];
};

export const IMAGE_GENERATOR_QUALITY_MODE = "high";
export const IMAGE_GENERATOR_OUTPUT_TYPE = "card_single";
export const IMAGE_GENERATOR_CARD_POSE = "postcard_front_flat";

export async function persistProductImageStudioImageGeneratorSuccess(
  input: PersistProductImageStudioImageGeneratorSuccessInput,
): Promise<PersistedProductImageStudioImageGeneratorSuccess> {
  const project = await createImageGeneratorProject(input.repository, input.payload);
  await saveReferenceAssets(input.repository, input.fileStore, project.id, input.references);
  const generation = await createImageGeneratorGeneration(
    input.repository,
    project,
    input.payload,
    input.resolvedProvider,
    input.references.length,
  );
  const results = await saveGeneratedResults(input.repository, input.fileStore, project, generation, input.successes, input.payload);
  await input.repository.addUsageRecord({
    estimatedCostCents: 0,
    generationRequestId: generation.id,
    imageCount: input.successes.length,
    model: input.resolvedProvider.model,
    projectId: project.id,
    provider: input.resolvedProvider.provider.name,
    qualityMode: IMAGE_GENERATOR_QUALITY_MODE,
    usageSummary: {
      completedCount: input.successes.length,
      failedCount: input.failedCount,
      requestedCount: input.payload.count,
      workflow: "image_generator",
    },
  });

  return { generation, project, results };
}

async function createImageGeneratorProject(
  repository: ProductImageStudioRepository,
  payload: ProductImageStudioImageGeneratorPayload,
): Promise<ProductImageStudioProjectRecord> {
  return repository.createProject({
    cardFormat: "postcard_flat",
    name: `AI 이미지 생성기 - ${payload.prompt.slice(0, 24)}`,
    productType: "card_envelope_seal_set",
    productionSettings: createDefaultProductImageStudioProductionSettings("postcard_flat"),
    qualityMode: IMAGE_GENERATOR_QUALITY_MODE,
    ratios: [payload.ratio],
    requestedCardPoses: [IMAGE_GENERATOR_CARD_POSE],
    requestedOutputs: [IMAGE_GENERATOR_OUTPUT_TYPE],
  });
}

async function saveReferenceAssets(
  repository: ProductImageStudioRepository,
  fileStore: ProductImageFileStore,
  projectId: string,
  references: readonly ProductImageStudioImageGeneratorPreparedReference[],
): Promise<void> {
  for (const reference of references) {
    const saved = await fileStore.saveImage({
      bytes: reference.originalBytes,
      contentType: reference.storageContentType,
      originalFileName: reference.originalFileName,
      projectId,
      role: "reference_mood",
    });
    await repository.addAsset({
      byteSize: saved.byteSize,
      contentType: saved.contentType,
      originalFileName: saved.originalFileName,
      projectId,
      role: "reference_mood",
      storageKey: saved.storageKey,
    });
  }
}

function createImageGeneratorGeneration(
  repository: ProductImageStudioRepository,
  project: ProductImageStudioProjectRecord,
  payload: ProductImageStudioImageGeneratorPayload,
  resolvedProvider: Extract<ResolvedProductImageStudioImageProvider, { readonly kind: "enabled" }>,
  referenceImageCount: number,
): Promise<ProductImageStudioGenerationRequestRecord> {
  return repository.createGenerationRequest({
    conceptId: "prompt-image-generator",
    projectId: project.id,
    providerRequestSummary: {
      model: resolvedProvider.model,
      modelLabel: payload.modelLabel,
      promptPreview: payload.prompt.slice(0, 120),
      provider: resolvedProvider.provider.name,
      ratio: payload.ratio,
      referenceImageCount,
      requestedCount: payload.count,
      resolution: payload.resolution,
      workflow: "image_generator",
    },
    qualityMode: IMAGE_GENERATOR_QUALITY_MODE,
    requestedCardPoses: [IMAGE_GENERATOR_CARD_POSE],
    requestedOutputs: [IMAGE_GENERATOR_OUTPUT_TYPE],
  });
}

async function saveGeneratedResults(
  repository: ProductImageStudioRepository,
  fileStore: ProductImageFileStore,
  project: ProductImageStudioProjectRecord,
  generation: ProductImageStudioGenerationRequestRecord,
  successes: readonly ProductImageStudioImageGeneratorSuccessfulImage[],
  payload: ProductImageStudioImageGeneratorPayload,
): Promise<readonly ProductImageStudioResultRecord[]> {
  const dimensions = getProductImageStudioDimensionsForRatio(payload.ratio);
  const results: ProductImageStudioResultRecord[] = [];
  for (const success of successes) {
    const saved = await fileStore.saveGeneratedImage({
      bytes: Buffer.from(success.image.b64Json, "base64"),
      contentType: success.image.contentType,
      generationRequestId: generation.id,
      outputType: IMAGE_GENERATOR_OUTPUT_TYPE,
      projectId: project.id,
      ratio: payload.ratio,
      sequence: success.sequence,
    });
    results.push(await repository.addResult({
      cardPose: IMAGE_GENERATOR_CARD_POSE,
      generationRequestId: generation.id,
      height: success.image.height > 0 ? success.image.height : dimensions.height,
      outputType: IMAGE_GENERATOR_OUTPUT_TYPE,
      projectId: project.id,
      ratio: payload.ratio,
      storageKey: saved.storageKey,
      width: success.image.width > 0 ? success.image.width : dimensions.width,
    }));
  }
  return results;
}
