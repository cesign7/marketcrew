import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS = {
  gemini: "gemini-3.1-flash-image",
  openai: "gpt-image-2",
} as const satisfies Record<ProductImageStudioProviderName, string>;

export function getProductImageStudioDefaultProviderModel(provider: ProductImageStudioProviderName): string {
  return PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS[provider];
}

export function normalizeProductImageStudioProviderModel(provider: ProductImageStudioProviderName, model: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) {
    return getProductImageStudioDefaultProviderModel(provider);
  }
  if (provider === "openai" && trimmedModel === "gpt-image-1") {
    return getProductImageStudioDefaultProviderModel(provider);
  }
  return trimmedModel;
}
