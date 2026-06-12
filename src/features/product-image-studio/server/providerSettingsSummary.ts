import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";

export type ProductImageStudioProviderSettingsStorageMode = "memory" | "postgres";

export type ProductImageStudioProviderCredentialSummary = {
  readonly hasCredential: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
  readonly updatedAt: string | null;
};

export type ProductImageStudioProviderSettingsSummary = {
  readonly defaultProvider: ProductImageStudioProviderName;
  readonly generationEnabled: boolean;
  readonly hasCredential: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly providers: Record<ProductImageStudioProviderName, ProductImageStudioProviderCredentialSummary>;
  readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
  readonly updatedAt: string;
};

export type ProductImageStudioProviderCredentialSummaryInput = {
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly updatedAt: string;
};

export type ProductImageStudioProviderSettingsSummaryInput =
  ProductImageStudioProviderCredentialSummaryInput & {
    readonly generationEnabled: boolean;
  };

export type ProductImageStudioProviderSettingsSummaryStateInput = {
  readonly defaultProvider: ProductImageStudioProviderName;
  readonly generationEnabled: boolean;
  readonly providers: Partial<Record<ProductImageStudioProviderName, ProductImageStudioProviderCredentialSummaryInput>>;
};

const DEFAULT_PROVIDER_MODELS: Record<ProductImageStudioProviderName, string> = {
  gemini: "gemini-3.1-flash-image",
  openai: "gpt-image-1",
};

export function buildProductImageStudioProviderSettingsSummary(
  settings: ProductImageStudioProviderSettingsSummaryStateInput,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary {
  const activeSettings = settings.providers[settings.defaultProvider];
  if (!activeSettings) {
    return buildProductImageStudioProviderSettingsSummaryFromSingleProvider(
      {
        generationEnabled: settings.generationEnabled,
        model: DEFAULT_PROVIDER_MODELS[settings.defaultProvider],
        provider: settings.defaultProvider,
        updatedAt: new Date(0).toISOString(),
      },
      storageMode,
      false,
    );
  }

  return {
    defaultProvider: settings.defaultProvider,
    generationEnabled: settings.generationEnabled,
    hasCredential: true,
    model: activeSettings.model,
    provider: activeSettings.provider,
    providers: toCredentialSummaries(settings.providers, storageMode),
    storageMode,
    updatedAt: activeSettings.updatedAt,
  };
}

export function buildProductImageStudioProviderSettingsSummaryFromSingleProvider(
  settings: ProductImageStudioProviderSettingsSummaryInput,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
  hasCredential = true,
): ProductImageStudioProviderSettingsSummary {
  return {
    defaultProvider: settings.provider,
    generationEnabled: settings.generationEnabled,
    hasCredential,
    model: settings.model,
    provider: settings.provider,
    providers: toCredentialSummaries(toSingleProviderMap(settings), storageMode),
    storageMode,
    updatedAt: settings.updatedAt,
  };
}

function toCredentialSummaries(
  providers: Partial<Record<ProductImageStudioProviderName, ProductImageStudioProviderCredentialSummaryInput>>,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): Record<ProductImageStudioProviderName, ProductImageStudioProviderCredentialSummary> {
  return {
    gemini: toCredentialSummary("gemini", providers.gemini, storageMode),
    openai: toCredentialSummary("openai", providers.openai, storageMode),
  };
}

function toCredentialSummary(
  provider: ProductImageStudioProviderName,
  settings: ProductImageStudioProviderCredentialSummaryInput | undefined,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderCredentialSummary {
  return {
    hasCredential: Boolean(settings),
    model: settings?.model ?? DEFAULT_PROVIDER_MODELS[provider],
    provider,
    storageMode,
    updatedAt: settings?.updatedAt ?? null,
  };
}

function toSingleProviderMap(
  settings: ProductImageStudioProviderCredentialSummaryInput,
): Partial<Record<ProductImageStudioProviderName, ProductImageStudioProviderCredentialSummaryInput>> {
  switch (settings.provider) {
    case "gemini":
      return { gemini: settings };
    case "openai":
      return { openai: settings };
  }
}
