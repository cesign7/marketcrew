import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { getConfiguredProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  getProductImageStudioProviderSettingsStorageMode,
  getProductImageStudioProviderSettingsSummary,
  type ProductImageStudioProviderSettingsStorageMode,
  type ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { readProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerSettingsStatusReader";
import { isBackendRuntime } from "@/lib/backend/proxy";

export type ProductImageStudioProviderSettingsState = {
  readonly settings: ProductImageStudioProviderSettingsSummary | null;
  readonly status: ProductImageStudioProviderStatus;
  readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
};

const DEFAULT_PROVIDER_MODELS: Record<ProductImageStudioProviderName, string> = {
  gemini: "gemini-3.1-flash-image",
  openai: "gpt-image-1",
};

export async function loadProductImageStudioProviderSettingsState(): Promise<ProductImageStudioProviderSettingsState> {
  const remote = await fetchBackendProviderSettingsState();
  if (remote) {
    return remote;
  }

  return buildLocalProviderSettingsState();
}

async function buildLocalProviderSettingsState(): Promise<ProductImageStudioProviderSettingsState> {
  const [status, settings] = await Promise.all([
    getConfiguredProductImageStudioProviderStatus(),
    getProductImageStudioProviderSettingsSummary(),
  ]);

  return {
    settings,
    status,
    storageMode: getProductImageStudioProviderSettingsStorageMode(),
  };
}

async function fetchBackendProviderSettingsState(): Promise<ProductImageStudioProviderSettingsState | undefined> {
  if (isBackendRuntime()) {
    return undefined;
  }

  const baseUrl = process.env.MARKETCREW_BACKEND_API_URL ?? process.env.MARKETCREW_API_BASE_URL;
  const token = process.env.MARKETCREW_BACKEND_API_TOKEN ?? process.env.MARKETCREW_API_TOKEN;
  if (!baseUrl || !token) {
    return undefined;
  }

  try {
    const response = await fetch(new URL("/api/product-image-studio/provider-settings", baseUrl), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as { data?: unknown; ok?: boolean };
    return payload.ok === true ? readProviderSettingsState(payload.data) : undefined;
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

function readProviderSettingsState(value: unknown): ProductImageStudioProviderSettingsState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const storageMode = readStorageMode(value["storageMode"]);
  const status = readProductImageStudioProviderStatus(value["status"]);
  if (!storageMode || !status) {
    return undefined;
  }

  return {
    settings: readSettings(value["settings"]),
    status,
    storageMode,
  };
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
  if (
    !provider ||
    !storageMode ||
    typeof value["model"] !== "string" ||
    typeof value["updatedAt"] !== "string"
  ) {
    return null;
  }

  const activeProvider = {
    hasCredential: value["hasCredential"] === true,
    model: value["model"],
    provider,
    storageMode,
    updatedAt: value["updatedAt"],
  };

  return {
    defaultProvider: provider,
    generationEnabled: value["generationEnabled"] === true,
    hasCredential: activeProvider.hasCredential,
    model: value["model"],
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
    model: typeof value["model"] === "string" ? value["model"] : DEFAULT_PROVIDER_MODELS[provider],
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
    model: DEFAULT_PROVIDER_MODELS[provider],
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
