import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProviderEnv } from "@/features/product-image-studio/server/providerConfig";

export function withDefaultProductImageStudioProviderModel(
  env: ProductImageStudioProviderEnv,
  provider: ProductImageStudioProviderName,
  defaultModel: string,
): ProductImageStudioProviderEnv {
  switch (provider) {
    case "openai":
      return env.PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL ? env : { ...env, PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: defaultModel };
    case "gemini":
      return env.PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL ? env : { ...env, PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL: defaultModel };
  }
}
