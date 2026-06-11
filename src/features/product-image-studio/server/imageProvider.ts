import { Buffer } from "node:buffer";
import type { ProductImageStudioConceptRecommendation } from "@/features/product-image-studio/domain/concepts";
import type {
  CardDisplayPose,
  ProductImageStudioAssetRole,
  ProductImageStudioOutputType,
  ProductImageStudioQualityMode,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import { parseProductImageStudioProviderConfig, type ProductImageStudioProviderEnv } from "@/features/product-image-studio/server/providerConfig";
import { createOpenAiImageProvider } from "@/features/product-image-studio/server/openAiImageProvider";
import type { ProductImageStudioProjectRecord } from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioPromptContext = {
  readonly assetRoles: readonly ProductImageStudioAssetRole[];
  readonly prompt: string;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratio: ProductImageStudioRatioPreset;
};

export type ProductImageStudioPromptContextInput = {
  readonly assetRoles: readonly ProductImageStudioAssetRole[];
  readonly cardPose?: CardDisplayPose;
  readonly concept: ProductImageStudioConceptRecommendation;
  readonly outputType: ProductImageStudioOutputType;
  readonly project: ProductImageStudioProjectRecord;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratio: ProductImageStudioRatioPreset;
};

export type ProductImageStudioProviderReferenceImage = {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
  readonly fileName: string;
  readonly role: ProductImageStudioAssetRole;
};

export type ProductImageStudioProviderCallInput = {
  readonly promptContext: ProductImageStudioPromptContext;
  readonly referenceImages: readonly ProductImageStudioProviderReferenceImage[];
};

export type ProductImageStudioProviderImageResult = {
  readonly b64Json: string;
  readonly contentType: "image/png";
  readonly height: number;
  readonly model: string;
  readonly provider: "fake" | "openai";
  readonly requestId?: string;
  readonly width: number;
};

export interface ImageGenerationProvider {
  readonly name: "fake" | "openai";
  generateScene(input: ProductImageStudioProviderCallInput): Promise<ProductImageStudioProviderImageResult>;
  editWithReferences(input: ProductImageStudioProviderCallInput): Promise<ProductImageStudioProviderImageResult>;
  regenerateRatio(input: ProductImageStudioProviderCallInput): Promise<ProductImageStudioProviderImageResult>;
}

export type ResolvedProductImageStudioImageProvider =
  | {
      readonly kind: "blocked";
      readonly provider: ImageGenerationProvider;
      readonly reason: "provider_not_configured" | "generation_disabled" | "credential_missing";
    }
  | {
      readonly kind: "enabled";
      readonly provider: ImageGenerationProvider;
    };

export function buildProductImageStudioPromptContext(
  input: ProductImageStudioPromptContextInput,
): ProductImageStudioPromptContext {
  const outputPrompt = input.concept.outputPrompts.find((candidate) => candidate.outputType === input.outputType);
  const posePrompt = outputPrompt?.posePrompts.find((candidate) => candidate.pose === input.cardPose);
  const prompt = [
    "Create a high-quality product image for a printed card, envelope, and seal-sticker set.",
    `projectName=${input.project.name}`,
    `productType=${input.project.productType}`,
    `cardFormat=${input.project.cardFormat}`,
    `requestedCardPoses=${input.project.requestedCardPoses.join(",")}`,
    `assetRoles=${input.assetRoles.join(",")}`,
    `outputType=${input.outputType}`,
    `ratio=${input.ratio}`,
    `qualityMode=${input.qualityMode}`,
    `concept=${input.concept.label}`,
    `conceptSummary=${input.concept.summary}`,
    `scene=${outputPrompt?.scenePrompt ?? ""}`,
    `geometry=${posePrompt?.prompt ?? getCardFormatFallbackGeometry(input.project.cardFormat)}`,
    "Preserve the uploaded print design exactly; only adapt perspective, lighting, paper thickness, and contact shadows.",
  ].join("\n");

  return {
    assetRoles: input.assetRoles,
    prompt,
    qualityMode: input.qualityMode,
    ratio: input.ratio,
  };
}

export function createFakeProductImageStudioImageProvider(): ImageGenerationProvider {
  return {
    name: "fake",
    async editWithReferences(input) {
      return createFakeImageResult("editWithReferences", input.promptContext);
    },
    async generateScene(input) {
      return createFakeImageResult("generateScene", input.promptContext);
    },
    async regenerateRatio(input) {
      return createFakeImageResult("regenerateRatio", input.promptContext);
    },
  };
}

export function resolveProductImageStudioImageProvider(
  env: ProductImageStudioProviderEnv = process.env,
): ResolvedProductImageStudioImageProvider {
  const config = parseProductImageStudioProviderConfig(env);
  if (config.gate.kind === "blocked") {
    return {
      kind: "blocked",
      provider: createFakeProductImageStudioImageProvider(),
      reason: config.gate.reason,
    };
  }

  return {
    kind: "enabled",
    provider: createOpenAiImageProvider({
      apiKey: env.OPENAI_API_KEY ?? "",
      model: config.gate.model,
    }),
  };
}

function createFakeImageResult(
  operation: string,
  promptContext: ProductImageStudioPromptContext,
): ProductImageStudioProviderImageResult {
  const payload = [operation, promptContext.ratio, promptContext.qualityMode, promptContext.prompt].join("\n");
  return {
    b64Json: Buffer.from(payload, "utf8").toString("base64"),
    contentType: "image/png",
    height: promptContext.ratio === "16:9" ? 1024 : 1200,
    model: "fake-product-image-studio",
    provider: "fake",
    width: promptContext.ratio === "16:9" ? 1536 : 1200,
  };
}

function getCardFormatFallbackGeometry(cardFormat: ProductImageStudioProjectRecord["cardFormat"]): string {
  switch (cardFormat) {
    case "folded_card":
      return "접힌 축, 종이 두께, 자연스러운 접지 그림자를 반드시 유지합니다";
    case "postcard_flat":
      return "접힘 없는 평평한 엽서 형태와 얇은 종이 가장자리를 반드시 유지합니다";
  }
}
