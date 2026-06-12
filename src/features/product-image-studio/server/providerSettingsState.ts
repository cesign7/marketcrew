import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { getConfiguredProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  getProductImageStudioProviderSettingsStorageMode,
  getProductImageStudioProviderSettingsSummary,
  type ProductImageStudioProviderSettingsStorageMode,
  type ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { isBackendRuntime } from "@/lib/backend/proxy";

export type ProductImageStudioProviderSettingsState = {
  readonly settings: ProductImageStudioProviderSettingsSummary | null;
  readonly status: ProductImageStudioProviderStatus;
  readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
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
  } catch {
    return undefined;
  }
}

function readProviderSettingsState(value: unknown): ProductImageStudioProviderSettingsState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const storageMode = readStorageMode(value["storageMode"]);
  const status = readProviderStatus(value["status"]);
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

  const provider = value["provider"];
  const storageMode = readStorageMode(value["storageMode"]);
  if (
    (provider !== "openai" && provider !== "gemini") ||
    !storageMode ||
    typeof value["model"] !== "string" ||
    typeof value["updatedAt"] !== "string"
  ) {
    return null;
  }

  return {
    generationEnabled: value["generationEnabled"] === true,
    hasCredential: value["hasCredential"] === true,
    model: value["model"],
    provider,
    storageMode,
    updatedAt: value["updatedAt"],
  };
}

function readProviderStatus(value: unknown): ProductImageStudioProviderStatus | null {
  if (!isRecord(value) || !isRecord(value["provider"]) || !isRecord(value["generation"])) {
    return null;
  }

  const providerName = value["provider"]["name"];
  const generationStatus = value["generation"]["status"];
  if (
    (providerName !== null && providerName !== "openai" && providerName !== "gemini") ||
    (generationStatus !== "blocked" && generationStatus !== "enabled")
  ) {
    return null;
  }

  return value as ProductImageStudioProviderStatus;
}

function readStorageMode(value: unknown): ProductImageStudioProviderSettingsStorageMode | null {
  return value === "memory" || value === "postgres" ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
