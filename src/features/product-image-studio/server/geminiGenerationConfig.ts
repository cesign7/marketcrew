import type { ProductImageStudioQualityMode, ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProviderResolution } from "@/features/product-image-studio/server/imageProvider";

export type GeminiImageConfig = {
  readonly aspectRatio: string;
  readonly imageSize?: "512" | "1K" | "2K";
};

export function toGeminiImageConfig(
  model: string,
  qualityMode: ProductImageStudioQualityMode,
  ratio: ProductImageStudioRatioPreset,
  resolution?: ProductImageStudioProviderResolution,
): GeminiImageConfig {
  const base = { aspectRatio: toGeminiAspectRatio(ratio) };
  if (model.startsWith("gemini-2.5")) {
    return base;
  }

  const requestedImageSize = toGeminiResolutionImageSize(resolution);
  if (requestedImageSize) {
    return { ...base, imageSize: requestedImageSize };
  }

  if (model === "gemini-3.1-flash-image") {
    return { ...base, imageSize: "512" };
  }

  return qualityMode === "high" ? { ...base, imageSize: "2K" } : { ...base, imageSize: "1K" };
}

function toGeminiResolutionImageSize(resolution: ProductImageStudioProviderResolution | undefined): GeminiImageConfig["imageSize"] | null {
  switch (resolution) {
    case "0.5k":
      return "512";
    case "1k":
      return "1K";
    case "2k":
      return "2K";
    case undefined:
      return null;
  }
}

function toGeminiAspectRatio(ratio: ProductImageStudioRatioPreset): string {
  switch (ratio) {
    case "1:1":
      return "1:1";
    case "4:5":
      return "4:5";
    case "3:4":
      return "3:4";
    case "16:9":
      return "16:9";
    case "custom":
      return "1:1";
  }
}
