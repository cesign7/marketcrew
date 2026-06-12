import type {
  ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
} from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioGenerationProviderOption,
} from "@/features/product-image-studio/domain/generationWorkflow";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import type { ProductImageStudioProviderSettingsSummary } from "@/features/product-image-studio/server/providerSettingsStore";

const PROVIDER_LABELS: Record<ProductImageStudioProviderName, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
};

export function getInitialProductImageStudioGenerationProvider(
  settings: ProductImageStudioProviderSettingsSummary | null,
  status: ProductImageStudioProviderStatus,
): ProductImageStudioProviderName {
  const preferred = settings?.defaultProvider ?? status.provider.name ?? "openai";
  if (status.providers[preferred].credentialConfigured) {
    return preferred;
  }

  return PRODUCT_IMAGE_STUDIO_PROVIDERS.find((provider) => status.providers[provider].credentialConfigured) ?? preferred;
}

export function createProductImageStudioGenerationProviderOptions(
  status: ProductImageStudioProviderStatus,
): readonly ProductImageStudioGenerationProviderOption[] {
  const gateClosed = status.generation.status === "blocked" && status.generation.reason === "generation_disabled";
  return PRODUCT_IMAGE_STUDIO_PROVIDERS.map((provider) => {
    const connected = status.providers[provider].credentialConfigured;
    const label = PROVIDER_LABELS[provider];
    return {
      connected,
      disabled: !connected,
      helper: getProviderHelper(label, connected, gateClosed),
      label,
      provider,
    };
  });
}

function getProviderHelper(label: string, connected: boolean, gateClosed: boolean): string {
  if (!connected) {
    return `${label} API 키가 연결되지 않았습니다.`;
  }
  return gateClosed ? "생성 게이트가 닫혀 있어 실제 호출은 차단됩니다." : "이번 생성에 사용할 수 있습니다.";
}
