import { Buffer } from "node:buffer";
import type { ProductImageStudioConceptRecommendation } from "@/features/product-image-studio/domain/concepts";
import type {
  ProductImageStudioAssetRole,
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioImageGeneratorCount,
  ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import { getProductImageStudioDimensionsForRatio } from "@/features/product-image-studio/server/downloads";
import {
  buildProductImageStudioPromptContext,
  type ImageGenerationProvider,
  type ProductImageStudioProviderReferenceImage,
} from "@/features/product-image-studio/server/imageProvider";
import type {
  ProductImageFileStore,
  StoredProductImageFile,
} from "@/features/product-image-studio/server/fileStore";
import type {
  ProductImageStudioAssetRecord,
  ProductImageStudioGenerationRequestRecord,
  ProductImageStudioProjectRecord,
  ProductImageStudioRepository,
  ProductImageStudioResultRecord,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioReferenceImagesResult =
  | {
      readonly images: readonly ProductImageStudioProviderReferenceImage[];
      readonly ok: true;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
  };

type ProductImageStudioGenerationAttempt =
  | {
      readonly kind: "fulfilled";
      readonly result: ProductImageStudioResultRecord;
    }
  | {
      readonly error: unknown;
      readonly kind: "rejected";
      readonly outputType: ProductImageStudioOutputType;
    };

export type ProductImageStudioGenerationFailure = {
  readonly error: unknown;
  readonly outputType: ProductImageStudioOutputType;
};

export type ProductImageStudioGenerationBatchResult = {
  readonly failures: readonly ProductImageStudioGenerationFailure[];
  readonly results: readonly ProductImageStudioResultRecord[];
};

type ProductImageStudioGenerationRunnerInput = {
  readonly assets: readonly ProductImageStudioAssetRecord[];
  readonly concept: ProductImageStudioConceptRecommendation;
  readonly count: ProductImageStudioImageGeneratorCount;
  readonly fileStore: ProductImageFileStore;
  readonly generation: ProductImageStudioGenerationRequestRecord;
  readonly project: ProductImageStudioProjectRecord;
  readonly provider: ImageGenerationProvider;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly referenceImages: readonly ProductImageStudioProviderReferenceImage[];
  readonly repository: ProductImageStudioRepository;
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly resolution?: ProductImageStudioImageGeneratorResolution;
};

export async function createStoredProductImageStudioGenerationResults(
  input: ProductImageStudioGenerationRunnerInput,
): Promise<readonly ProductImageStudioResultRecord[]> {
  const batch = await createStoredProductImageStudioGenerationResultBatch(input);
  const firstFailure = batch.failures[0];
  if (firstFailure) {
    throw firstFailure.error;
  }
  return batch.results;
}

export async function createStoredProductImageStudioGenerationResultBatch(
  input: ProductImageStudioGenerationRunnerInput,
): Promise<ProductImageStudioGenerationBatchResult> {
  const attempts = await Promise.all(
    input.requestedOutputs.flatMap((outputType) =>
      Array.from({ length: input.count }, (_value, variantIndex) =>
        createStoredProductImageStudioGenerationAttempt(input, outputType, variantIndex),
      ),
    ),
  );
  const results: ProductImageStudioResultRecord[] = [];
  const failures: ProductImageStudioGenerationFailure[] = [];
  for (const attempt of attempts) {
    switch (attempt.kind) {
      case "fulfilled":
        results.push(attempt.result);
        break;
      case "rejected":
        failures.push({ error: attempt.error, outputType: attempt.outputType });
        break;
    }
  }
  return { failures, results };
}

function createStoredProductImageStudioGenerationAttempt(
  input: ProductImageStudioGenerationRunnerInput,
  outputType: ProductImageStudioOutputType,
  variantIndex: number,
): Promise<ProductImageStudioGenerationAttempt> {
  return createStoredProductImageStudioGenerationResult(input, outputType, variantIndex).then(
    (result): ProductImageStudioGenerationAttempt => ({ kind: "fulfilled", result }),
    (error: unknown): ProductImageStudioGenerationAttempt => ({ error, kind: "rejected", outputType }),
  );
}

async function createStoredProductImageStudioGenerationResult(
  input: ProductImageStudioGenerationRunnerInput,
  outputType: ProductImageStudioOutputType,
  variantIndex: number,
): Promise<ProductImageStudioResultRecord> {
  const ratio = input.ratio;
  const dimensions = getProductImageStudioDimensionsForRatio(ratio);
  const promptContext = buildProductImageStudioPromptContext({
    assetRoles: input.assets.map((asset) => asset.role),
    cardPose: input.project.requestedCardPoses[0],
    concept: input.concept,
    outputType,
    project: input.project,
    qualityMode: input.generation.qualityMode,
    ratio,
    resolution: input.resolution,
    resultIndex: variantIndex,
  });
  const generatedImage =
    input.referenceImages.length > 0
      ? await input.provider.editWithReferences({ promptContext, referenceImages: input.referenceImages })
      : await input.provider.generateScene({ promptContext, referenceImages: [] });
  const savedImage = await input.fileStore.saveGeneratedImage({
    bytes: Buffer.from(generatedImage.b64Json, "base64"),
    contentType: generatedImage.contentType,
    generationRequestId: input.generation.id,
    outputType,
    projectId: input.project.id,
    ratio,
  });
  return input.repository.addResult({
    cardPose: outputType === "set_combined" || outputType === "card_single" ? input.project.requestedCardPoses[0] : undefined,
    generationRequestId: input.generation.id,
    height: generatedImage.height > 0 ? generatedImage.height : dimensions.height,
    outputType,
    projectId: input.project.id,
    ratio,
    storageKey: savedImage.storageKey,
    width: generatedImage.width > 0 ? generatedImage.width : dimensions.width,
  });
}

export async function readProductImageStudioReferenceImages(
  assets: readonly ProductImageStudioAssetRecord[],
  fileStore: ProductImageFileStore,
): Promise<ProductImageStudioReferenceImagesResult> {
  const images: ProductImageStudioProviderReferenceImage[] = [];
  for (const asset of assets) {
    const storedImage = await fileStore.readImage(asset.storageKey);
    if (!storedImage) {
      return { error: { code: "ASSET_FILE_NOT_FOUND", message: "업로드한 원본 이미지 파일을 찾지 못했습니다." }, ok: false };
    }
    images.push(toProviderReferenceImage(asset.role, asset.originalFileName, storedImage));
  }

  return { images, ok: true };
}

function toProviderReferenceImage(
  role: ProductImageStudioAssetRole,
  fileName: string,
  storedImage: StoredProductImageFile,
): ProductImageStudioProviderReferenceImage {
  return {
    bytes: toArrayBuffer(storedImage.bytes),
    contentType: storedImage.contentType,
    fileName,
    role,
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
