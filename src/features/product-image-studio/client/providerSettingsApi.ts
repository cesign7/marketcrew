import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import {
  PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS,
  normalizeProductImageStudioProviderModel,
} from "@/features/product-image-studio/domain/providerModels";
import type {
  ProductImageStudioProviderSettingsStorageMode,
  ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";

export type ProductImageStudioProviderSettingsPayload = {
  readonly apiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
};

export type RequestProductImageStudioProviderSettingsResult =
  | {
      readonly ok: true;
      readonly settings: ProductImageStudioProviderSettingsSummary | null;
      readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export async function requestProductImageStudioProviderSettings(
  method: "DELETE" | "POST",
  payload: ProductImageStudioProviderSettingsPayload | null,
  providerToDelete?: ProductImageStudioProviderName,
): Promise<RequestProductImageStudioProviderSettingsResult> {
  const endpoint = providerToDelete
    ? `/api/product-image-studio/provider-settings?provider=${providerToDelete}`
    : "/api/product-image-studio/provider-settings";
  const response = await fetch(endpoint, {
    body: payload ? JSON.stringify(payload) : undefined,
    headers: payload ? { "content-type": "application/json" } : undefined,
    method,
  });
  const body = await readJson(response);
  if (!response.ok) {
    return { message: readErrorMessage(body), ok: false };
  }

  const data = isRecord(body) ? body["data"] : null;
  if (!isRecord(data)) {
    return { message: "provider 설정 응답 형식이 올바르지 않습니다.", ok: false };
  }

  return {
    ok: true,
    settings: readSettings(data["settings"]),
    storageMode: readStorageMode(data["storageMode"]) ?? "memory",
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readSettings(value: unknown): ProductImageStudioProviderSettingsSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  return readAggregateSettings(value) ?? readLegacySettings(value);
}

function readAggregateSettings(
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioProviderSettingsSummary | null {
  const defaultProvider = readProvider(value["defaultProvider"]);
  const storageMode = readStorageMode(value["storageMode"]);
  if (!defaultProvider || !storageMode) {
    return null;
  }

  const providers = readProviderSummaries(value["providers"], storageMode);
  if (!providers) {
    return null;
  }

  const activeProvider = providers[defaultProvider];
  const updatedAt = typeof value["updatedAt"] === "string" ? value["updatedAt"] : activeProvider.updatedAt;
  if (!updatedAt) {
    return null;
  }

  return {
    defaultProvider,
    generationEnabled: value["generationEnabled"] === true,
    hasCredential: activeProvider.hasCredential,
    model: activeProvider.model,
    provider: defaultProvider,
    providers,
    storageMode,
    updatedAt,
  };
}

function readLegacySettings(
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioProviderSettingsSummary | null {
  const provider = readProvider(value["provider"]);
  const storageMode = readStorageMode(value["storageMode"]);
  if (!provider || !storageMode || typeof value["model"] !== "string" || typeof value["updatedAt"] !== "string") {
    return null;
  }

  const activeProvider = {
    hasCredential: value["hasCredential"] === true,
    model: normalizeProductImageStudioProviderModel(provider, value["model"]),
    provider,
    storageMode,
    updatedAt: value["updatedAt"],
  };

  return {
    defaultProvider: provider,
    generationEnabled: value["generationEnabled"] === true,
    hasCredential: activeProvider.hasCredential,
    model: normalizeProductImageStudioProviderModel(provider, value["model"]),
    provider,
    providers: toProviderSummaryRecord(activeProvider, storageMode),
    storageMode,
    updatedAt: value["updatedAt"],
  };
}

function readProviderSummaries(
  value: unknown,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary["providers"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const gemini = readProviderSummary(value["gemini"], "gemini", storageMode);
  const openai = readProviderSummary(value["openai"], "openai", storageMode);
  if (!gemini || !openai) {
    return null;
  }

  return { gemini, openai };
}

function readProviderSummary(
  value: unknown,
  provider: ProductImageStudioProviderName,
  fallbackStorageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary["providers"][ProductImageStudioProviderName] | null {
  if (!isRecord(value)) {
    return emptyProviderSummary(provider, fallbackStorageMode);
  }

  const providerName = readProvider(value["provider"]);
  if (providerName && providerName !== provider) {
    return null;
  }

  return {
    hasCredential: value["hasCredential"] === true,
    model:
      typeof value["model"] === "string"
        ? normalizeProductImageStudioProviderModel(provider, value["model"])
        : PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS[provider],
    provider,
    storageMode: readStorageMode(value["storageMode"]) ?? fallbackStorageMode,
    updatedAt: typeof value["updatedAt"] === "string" ? value["updatedAt"] : null,
  };
}

function toProviderSummaryRecord(
  activeProvider: ProductImageStudioProviderSettingsSummary["providers"][ProductImageStudioProviderName],
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary["providers"] {
  return {
    gemini: activeProvider.provider === "gemini" ? activeProvider : emptyProviderSummary("gemini", storageMode),
    openai: activeProvider.provider === "openai" ? activeProvider : emptyProviderSummary("openai", storageMode),
  };
}

function emptyProviderSummary(
  provider: ProductImageStudioProviderName,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary["providers"][ProductImageStudioProviderName] {
  return {
    hasCredential: false,
    model: PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS[provider],
    provider,
    storageMode,
    updatedAt: null,
  };
}

function readProvider(value: unknown): ProductImageStudioProviderName | null {
  return value === "openai" || value === "gemini" ? value : null;
}

function readStorageMode(value: unknown): ProductImageStudioProviderSettingsStorageMode | null {
  return value === "memory" || value === "postgres" ? value : null;
}

function readErrorMessage(value: unknown): string {
  if (!isRecord(value)) {
    return "provider 설정을 저장하지 못했습니다.";
  }

  if (typeof value["message"] === "string") {
    return value["message"];
  }

  if (!isRecord(value["error"]) || typeof value["error"]["message"] !== "string") {
    return "provider 설정을 저장하지 못했습니다.";
  }

  return value["error"]["message"];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
