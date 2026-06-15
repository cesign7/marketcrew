import type { ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import type {
  ImageGenerationProvider,
  ProductImageStudioPromptContext,
  ProductImageStudioProviderImageResult,
} from "@/features/product-image-studio/server/imageProvider";

type FakeImageProviderOperation = "editWithReferences" | "generateScene" | "regenerateRatio";

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

export function createFakeProductImageStudioImageGeneratorProviderResult(input: {
  readonly operation: FakeImageProviderOperation;
  readonly promptContext: ProductImageStudioPromptContext;
  readonly resultIndex: number;
}): ProductImageStudioProviderImageResult {
  return createFakeImageResult(input.operation, { ...input.promptContext, resultIndex: input.resultIndex });
}

function createFakeImageResult(
  _operation: FakeImageProviderOperation,
  promptContext: ProductImageStudioPromptContext,
): ProductImageStudioProviderImageResult {
  const dimensions = toFakeImageDimensions(promptContext);
  return {
    b64Json: toFakePngB64(promptContext.resultIndex),
    contentType: "image/png",
    height: dimensions.height,
    model: "fake-product-image-studio",
    provider: "fake",
    width: dimensions.width,
  };
}

const FAKE_INDEXED_PNG_B64 = [
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgaPgPAAIDAYAkYfWXAAAAAElFTkSuQmCC",
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgOBEAAAHkARkh4hVrAAAAAElFTkSuQmCC",
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f4kBAASlAdIuvNm6AAAAAElFTkSuQmCC",
] as const;

function toFakePngB64(resultIndex: number | undefined): string {
  if (resultIndex === undefined || !Number.isFinite(resultIndex)) {
    return FAKE_INDEXED_PNG_B64[0];
  }

  const normalizedIndex = Math.abs(Math.trunc(resultIndex)) % FAKE_INDEXED_PNG_B64.length;
  return FAKE_INDEXED_PNG_B64[normalizedIndex] ?? FAKE_INDEXED_PNG_B64[0];
}

function toFakeImageDimensions(promptContext: ProductImageStudioPromptContext): { readonly height: number; readonly width: number } {
  if (!promptContext.resolution) {
    return {
      height: promptContext.ratio === "16:9" ? 1024 : 1200,
      width: promptContext.ratio === "16:9" ? 1536 : 1200,
    };
  }

  switch (promptContext.resolution) {
    case "0.5k":
      return toFakeRatioDimensions(promptContext.ratio, { landscapeHeight: 512, portraitWidth: 512, square: 512 });
    case "1k":
      return toFakeRatioDimensions(promptContext.ratio, { landscapeHeight: 1024, portraitWidth: 1024, square: 1024 });
    case "2k":
      return toFakeRatioDimensions(promptContext.ratio, { landscapeHeight: 1152, portraitWidth: 2048, square: 2048 });
  }
}

function toFakeRatioDimensions(
  ratio: ProductImageStudioRatioPreset,
  size: { readonly landscapeHeight: number; readonly portraitWidth: number; readonly square: number },
): { readonly height: number; readonly width: number } {
  switch (ratio) {
    case "1:1":
      return { height: size.square, width: size.square };
    case "4:5":
      return { height: Math.round(size.portraitWidth * 1.25), width: size.portraitWidth };
    case "3:4":
      return { height: Math.round(size.portraitWidth * (4 / 3)), width: size.portraitWidth };
    case "16:9":
      return { height: size.landscapeHeight, width: Math.round(size.landscapeHeight * (16 / 9)) };
    case "custom":
      return { height: size.square, width: size.square };
  }
}
